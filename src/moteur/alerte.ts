/**
 * MailFlow · Diffusion des alertes
 *
 * Lit les incidents, expédie le récapitulatif, mémorise ce qui est parti. Les
 * règles (quoi envoyer, à quelle fréquence, sous quelle forme) sont dans
 * `alerte-regles.ts`, sans base ni réseau.
 *
 * ── TROIS PRÉCAUTIONS ─────────────────────────────────────────────────────
 *
 *  1. Le silence. Une même alarme n'est pas répétée avant quatre heures.
 *     Vingt travaux qui échouent pour la même raison font UN courriel.
 *  2. La trace d'abord. Tout est déjà en base avant d'être expédié : si le
 *     courriel ne part pas, l'information n'est pas perdue pour autant.
 *  3. Pas de boucle. L'envoi de l'alerte n'est jamais lui-même surveillé.
 *     Une alerte sur l'échec d'une alerte n'a jamais aidé personne.
 */

import type { Atelier } from "./atelier";
import type { Sante } from "./sante";
import {
  type Alerte,
  type EtatAlertes,
  aDiffuser,
  composerRecapitulatif,
  destinatairesAlerte,
  lireEtat,
  marquerEnvoyees,
} from "./alerte-regles";
import { prisma } from "../lib/prisma";

/** Clé du suivi des envois d'alerte, dans `parametre`. */
const CLE_ETAT = "alertes_etat";

/** Types d'événements qui méritent qu'on dérange quelqu'un. */
const TYPES_ALERTANTS = ["ANOMALIE_TECHNIQUE", "RELANCE_ECHEC"] as const;

// ── Partie impure : lire, envoyer, mémoriser ───────────────────────────────


/**
 * Rassemble ce qui mérite un courriel : les anomalies critiques du moment, et
 * les incidents techniques survenus depuis la dernière diffusion.
 */
export async function collecter(
  sante: Sante
): Promise<{ candidates: Alerte[]; etat: EtatAlertes; filigraneNeuf: Date | null }> {
  const ligne = await prisma.parametre.findUnique({ where: { cle: CLE_ETAT } });
  const etat = lireEtat(ligne?.valeur);

  const candidates: Alerte[] = sante.anomalies
    .filter((a) => a.gravite === "critique")
    .map((a) => ({ code: a.code, message: a.message }));

  const depuis = etat.filigrane ? new Date(etat.filigrane) : null;

  // AU PREMIER PASSAGE, ON NE DIFFUSE PAS L'ARRIÉRÉ. On pose le filigrane à
  // maintenant et on repart de là. Sinon la mise en service, ou la simple
  // restauration d'une base, commence par un courriel d'incidents vieux de
  // plusieurs semaines : le destinataire apprend que le canal d'alerte parle
  // du passé, et il cesse de le lire.
  //
  // Les anomalies critiques, elles, partent quand même : ce ne sont pas des
  // souvenirs, ce sont des faits en cours.
  if (depuis === null) {
    return { candidates, etat, filigraneNeuf: new Date() };
  }

  const incidents = await prisma.evenement.findMany({
    where: { type: { in: [...TYPES_ALERTANTS] }, creeLe: { gt: depuis } },
    orderBy: { creeLe: "asc" },
    take: 100,
    select: { type: true, libelle: true, creeLe: true, echange: { select: { numero: true } } },
  });

  for (const i of incidents) {
    const ref = i.echange ? `n° ${i.echange.numero} · ` : "";
    candidates.push({ code: i.type, message: `${ref}${i.libelle}` });
  }

  // Le filigrane n'avance que sur ce qu'on a réellement lu : s'il n'y a rien
  // de neuf, on garde l'ancien plutôt que de sauter par-dessus un incident
  // qui arriverait entre cette requête et le prochain passage.
  const filigraneNeuf =
    incidents.length > 0 ? incidents[incidents.length - 1].creeLe : null;

  return { candidates, etat, filigraneNeuf };
}

export type Diffusion =
  | { diffuse: true; nombre: number; vers: string[] }
  | { diffuse: false; raison: string };

/**
 * Envoie le récapitulatif, une fois.
 *
 * Ne lève jamais : une panne du canal d'alerte ne doit pas faire tomber le
 * cycle qu'elle est censée surveiller.
 */
export async function diffuser(
  atelier: Atelier,
  sante: Sante,
  maintenant: Date,
  boite: string,
  urlConsole: string
): Promise<Diffusion> {
  try {
    const vers = destinatairesAlerte();
    const { candidates, etat, filigraneNeuf } = await collecter(sante);
    const retenues = aDiffuser(candidates, etat, maintenant);

    // Le filigrane avance même sans destinataire : sinon le jour où l'adresse
    // est renseignée, tout l'arriéré partirait d'un coup.
    const memoriser = async (envoyees: Alerte[]) => {
      const neuf = marquerEnvoyees(etat, envoyees, filigraneNeuf, maintenant);
      await prisma.parametre.upsert({
        where: { cle: CLE_ETAT },
        update: { valeur: neuf },
        create: {
          cle: CLE_ETAT,
          libelle: "Suivi des alertes déjà diffusées",
          valeur: neuf,
        },
      });
    };

    if (retenues.length === 0) {
      await memoriser([]);
      return { diffuse: false, raison: "rien de neuf à signaler" };
    }

    if (vers.length === 0) {
      await memoriser([]);
      return {
        diffuse: false,
        raison: `${retenues.length} anomalie(s) sans destinataire : renseigner MAILFLOW_ALERTES_A`,
      };
    }

    const { sujet, corps } = composerRecapitulatif(
      retenues,
      boite,
      maintenant,
      urlConsole
    );

    const r = await atelier.envoyer({
      destinataires: vers,
      sujet,
      corps,
      type: "alerte",
    });

    if (!r.sorti) {
      // Pas de mémorisation : l'alarme n'a pas été criée, elle reste due.
      return { diffuse: false, raison: r.raison };
    }

    await memoriser(retenues);
    return { diffuse: true, nombre: retenues.length, vers };
  } catch (e) {
    return {
      diffuse: false,
      raison: e instanceof Error ? e.message : String(e),
    };
  }
}
