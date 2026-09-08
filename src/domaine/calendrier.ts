/**
 * MailFlow · Chargement du calendrier depuis la base
 *
 * Seul pont entre le paramétrage stocké et le module de calcul, qui reste
 * pur. Toute la difficulté du calcul est dans `echeance.ts` et se teste sans
 * base ; ce fichier ne fait que lire et assembler.
 */

import { prisma } from "../lib/prisma";
import { type Calendrier, CalendrierInvalide } from "./echeance";

const CLES_REQUISES = [
  "fuseau_site",
  "jours_ouvres",
  "fenetre_envoi",
] as const;

type FenetreEnvoi = { debut: string; fin: string };

/**
 * Assemble le calendrier à partir de `parametre` et `jour_ferie`.
 *
 * Échoue explicitement si un paramètre manque : mieux vaut refuser de
 * calculer que produire des échéances sur des valeurs devinées.
 */
export async function chargerCalendrier(): Promise<Calendrier> {
  const [parametres, feries] = await Promise.all([
    prisma.parametre.findMany({ where: { cle: { in: [...CLES_REQUISES] } } }),
    prisma.jourFerie.findMany({ orderBy: { date: "asc" } }),
  ]);

  const valeurs = new Map(parametres.map((p) => [p.cle, p.valeur]));

  for (const cle of CLES_REQUISES) {
    if (!valeurs.has(cle)) {
      throw new CalendrierInvalide(
        `Paramètre manquant en base : "${cle}". Lancer le jeu de données initial (npm run db:seed).`
      );
    }
  }

  const zone = valeurs.get("fuseau_site");
  if (typeof zone !== "string") {
    throw new CalendrierInvalide(
      `Le paramètre "fuseau_site" doit être une chaîne, reçu : ${JSON.stringify(zone)}.`
    );
  }

  const jours = valeurs.get("jours_ouvres");
  if (!Array.isArray(jours) || jours.some((j) => typeof j !== "number")) {
    throw new CalendrierInvalide(
      `Le paramètre "jours_ouvres" doit être un tableau de nombres, reçu : ${JSON.stringify(jours)}.`
    );
  }

  const fenetre = valeurs.get("fenetre_envoi") as FenetreEnvoi | undefined;
  if (
    !fenetre ||
    typeof fenetre.debut !== "string" ||
    typeof fenetre.fin !== "string"
  ) {
    throw new CalendrierInvalide(
      `Le paramètre "fenetre_envoi" doit avoir la forme { "debut": "HH:MM", "fin": "HH:MM" }.`
    );
  }

  return {
    zone,
    joursOuvres: jours as number[],
    ouverture: fenetre.debut,
    fermeture: fenetre.fin,
    // Colonne DATE : Prisma rend minuit UTC, la partie date est donc exacte.
    joursFeries: feries.map((f) => f.date.toISOString().slice(0, 10)),
  };
}
