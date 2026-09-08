/**
 * MailFlow · Surveillance
 *
 * Les trois surveillances obligatoires de la note d'architecture, plus deux
 * contrôles de cohérence. Le principe directeur :
 *
 *   ON SURVEILLE L'ABSENCE, PAS SEULEMENT L'ERREUR.
 *
 * Un système de relance qui s'arrête sans le dire est plus dangereux qu'un
 * tableau papier, parce que tout le monde le croit en marche. C'est
 * exactement ce qui s'était produit dans le dispositif précédent : la
 * routine ne tournait plus et personne ne l'a su avant la revue du vendredi.
 */

import { DateTime } from "luxon";

import { prisma } from "../lib/prisma";
import { PREFIXE_REFUS } from "./atelier";
import { destinatairesAlerte } from "./alerte-regles";
import { chargerCalendrier } from "../domaine/calendrier";
import { joursOuvresEcoules } from "../domaine/echeance";

export type Gravite = "critique" | "attention" | "info";

export type Anomalie = {
  gravite: Gravite;
  code: string;
  message: string;
};

export type Sante = {
  verifieLe: Date;
  anomalies: Anomalie[];
  ok: boolean;
};

/** Au-delà de deux cadences, l'absence de passage devient une anomalie. */
const CADENCE_ATTENDUE_MINUTES = 5;
const PREAVIS_EXPIRATION_JOURS = 30;
const SOUFFRANCE_HEURES = 1;

/** Au-delà de ce délai sans lecture, la boîte est considérée muette. */
const CAPTATION_EN_RETARD_MINUTES = 60;

export async function verifierSante(): Promise<Sante> {
  const verifieLe = new Date();
  const anomalies: Anomalie[] = [];

  // ── 1. Battement de cœur ────────────────────────────────────────────────
  const battement = await prisma.parametre.findUnique({
    where: { cle: "moteur_dernier_passage" },
  });

  if (!battement) {
    anomalies.push({
      gravite: "critique",
      code: "MOTEUR_JAMAIS_PASSE",
      message:
        "L'ordonnanceur n'a jamais tourné : aucune relance ne partira. Lancer npm run moteur.",
    });
  } else {
    const valeur = battement.valeur as { a?: string } | null;
    const dernier = valeur?.a ? new Date(valeur.a) : null;
    const minutes = dernier
      ? Math.round((verifieLe.getTime() - dernier.getTime()) / 60_000)
      : null;

    if (minutes === null) {
      anomalies.push({
        gravite: "critique",
        code: "BATTEMENT_ILLISIBLE",
        message: "Le dernier passage de l'ordonnanceur est illisible en base.",
      });
    } else if (minutes > CADENCE_ATTENDUE_MINUTES * 2) {
      anomalies.push({
        gravite: "critique",
        code: "MOTEUR_SILENCIEUX",
        message: `Aucun passage de l'ordonnanceur depuis ${minutes} min (cadence attendue : ${CADENCE_ATTENDUE_MINUTES} min).`,
      });
    }
  }

  // ── 2. Échéances en souffrance ──────────────────────────────────────────
  const limite = new Date(verifieLe.getTime() - SOUFFRANCE_HEURES * 3_600_000);
  const enSouffrance = await prisma.travailPlanifie.count({
    where: { statut: "EN_ATTENTE", executerA: { lt: limite } },
  });

  if (enSouffrance > 0) {
    anomalies.push({
      gravite: "critique",
      code: "TRAVAUX_EN_SOUFFRANCE",
      message: `${enSouffrance} travail(aux) échu(s) depuis plus d'une heure sans exécution.`,
    });
  }

  const enEchec = await prisma.travailPlanifie.count({
    where: { statut: "ECHEC" },
  });
  if (enEchec > 0) {
    anomalies.push({
      gravite: "attention",
      code: "TRAVAUX_EN_ECHEC",
      message: `${enEchec} travail(aux) en échec définitif, à examiner à la main.`,
    });
  }

  const verrousBloques = await prisma.travailPlanifie.count({
    where: { statut: "EN_COURS", verrouA: { lt: new Date(verifieLe.getTime() - 900_000) } },
  });
  if (verrousBloques > 0) {
    anomalies.push({
      gravite: "attention",
      code: "VERROUS_PERIMES",
      message: `${verrousBloques} travail(aux) verrouillé(s) depuis plus de 15 min : un exécutant s'est arrêté en cours de route.`,
    });
  }

  // ── 3. Envoi : ce qui est prêt à partir et ne part pas ──────────────────
  //
  // Un travail refusé par un garde-fou reste sagement en attente et ne
  // déclenche aucune alarme technique : c'est justement pourquoi il faut le
  // dire ici. Sinon le dispositif tourne, les rapports sont verts, et pas une
  // relance n'est jamais partie.
  const envoiOuvert =
    (process.env.MAILFLOW_ENVOI_AUTORISE ?? "").trim().toLowerCase() === "oui";

  const enAttenteDEnvoi = await prisma.travailPlanifie.count({
    where: { statut: "EN_ATTENTE", type: { in: ["RELANCE", "ESCALADE"] } },
  });

  if (!envoiOuvert && enAttenteDEnvoi > 0) {
    anomalies.push({
      gravite: "attention",
      code: "ENVOI_DESACTIVE",
      message:
        `Mode observation : MAILFLOW_ENVOI_AUTORISE ne vaut pas « oui », ` +
        `${enAttenteDEnvoi} envoi(s) attendent et ne partiront pas.`,
    });
  }

  const refuses = await prisma.travailPlanifie.findMany({
    where: {
      statut: "EN_ATTENTE",
      derniereErreur: { startsWith: PREFIXE_REFUS },
    },
    select: { derniereErreur: true },
    take: 20,
  });

  if (refuses.length > 0 && envoiOuvert) {
    const motifs = [
      ...new Set(
        refuses.map((r) => (r.derniereErreur ?? "").slice(PREFIXE_REFUS.length))
      ),
    ].slice(0, 3);
    anomalies.push({
      gravite: "attention",
      code: "ENVOI_REFUSE",
      message: `${refuses.length} envoi(s) refusé(s) par un garde-fou : ${motifs.join(" ; ")}`,
    });
  }

  // Toute chaîne de relances se termine par une escalade. Une catégorie sans
  // destinataire d'escalade a donc une impasse au bout : mieux vaut le savoir
  // avant qu'un dossier ne s'y arrête, pas après.
  const sansEscalade = await prisma.categorie.findMany({
    where: { actif: true, escaladeVersId: null, regles: { some: { actif: true } } },
    select: { libelle: true },
  });

  if (sansEscalade.length > 0) {
    anomalies.push({
      gravite: "attention",
      code: "ESCALADE_SANS_DESTINATAIRE",
      message:
        `${sansEscalade.length} catégorie(s) sans destinataire d'escalade : ` +
        `${sansEscalade.map((c) => c.libelle).join(", ")}. ` +
        `Les dossiers qui épuisent leurs relances s'y arrêteront sans prévenir personne.`,
    });
  }

  // ── 4. Expiration des accès ─────────────────────────────────────────────
  const preavis = DateTime.fromJSDate(verifieLe)
    .plus({ days: PREAVIS_EXPIRATION_JOURS })
    .toJSDate();

  const boites = await prisma.boiteSuivie.findMany({
    where: { actif: true },
    select: {
      adresse: true,
      abonnementExpireLe: true,
      derniereSynchroLe: true,
      derniereAnomalie: true,
    },
  });

  if (boites.length === 0) {
    anomalies.push({
      gravite: "critique",
      code: "AUCUNE_BOITE",
      message:
        "Aucune boîte suivie active : rien ne sera capté. Renseigner boite_suivie.",
    });
  }

  for (const b of boites) {
    if (b.abonnementExpireLe && b.abonnementExpireLe < preavis) {
      const jours = Math.round(
        (b.abonnementExpireLe.getTime() - verifieLe.getTime()) / 86_400_000
      );
      anomalies.push({
        gravite: jours <= 0 ? "critique" : "attention",
        code: "ABONNEMENT_EXPIRE",
        message:
          jours <= 0
            ? `L'abonnement aux notifications de ${b.adresse} a expiré : plus aucun courriel n'est capté.`
            : `L'abonnement aux notifications de ${b.adresse} expire dans ${jours} jour(s).`,
      });
    }
    if (b.derniereAnomalie) {
      anomalies.push({
        gravite: "attention",
        code: "ANOMALIE_BOITE",
        message: `${b.adresse} : ${b.derniereAnomalie}`,
      });
    }

    // Le moteur peut tourner sans que la boîte soit lue : identifiants
    // changés, serveur qui refuse la session. Le battement de cœur reste vert
    // et pourtant plus rien n'entre. C'est la panne la plus traîtresse du
    // dispositif, parce qu'elle ressemble à un mois calme.
    const retard = b.derniereSynchroLe
      ? (verifieLe.getTime() - b.derniereSynchroLe.getTime()) / 60_000
      : null;

    if (retard === null) {
      anomalies.push({
        gravite: "attention",
        code: "CAPTATION_JAMAIS_FAITE",
        message: `${b.adresse} n'a jamais été lue : aucun courriel n'est encore suivi.`,
      });
    } else if (retard > CAPTATION_EN_RETARD_MINUTES) {
      anomalies.push({
        gravite: "critique",
        code: "CAPTATION_EN_RETARD",
        message: `${b.adresse} n'a pas été lue depuis ${Math.round(retard)} min : les réponses ne sont plus détectées, les relances continuent.`,
      });
    }
  }

  // ── 5. Jours fériés absents ─────────────────────────────────────────────
  const feries = await prisma.jourFerie.count();
  if (feries === 0) {
    anomalies.push({
      gravite: "attention",
      code: "AUCUN_JOUR_FERIE",
      message:
        "Aucun jour férié en base : le calcul en jours ouvrés est faux et des relances partiront un jour chômé.",
    });
  }

  // ── 6. Échanges sans propriétaire (RG-12) ───────────────────────────────
  const cal = await chargerCalendrier();
  const orphelins = await prisma.echange.findMany({
    where: {
      responsableId: null,
      statut: { in: ["A_QUALIFIER", "EN_ATTENTE"] },
    },
    select: { numero: true, recuLe: true },
  });

  const seuil = Number(
    (
      await prisma.parametre.findUnique({
        where: { cle: "delai_attribution_heures_ouvrees" },
      })
    )?.valeur ?? 4
  );

  const enRetardAttribution = orphelins.filter(
    (o) => joursOuvresEcoules(o.recuLe, verifieLe, cal) >= 1 ||
      (verifieLe.getTime() - o.recuLe.getTime()) / 3_600_000 >= seuil
  );

  if (enRetardAttribution.length > 0) {
    // Une alerte qui déballe cent numéros ne se lit pas, donc ne se traite
    // pas. On en cite quelques-uns pour retrouver le fil, la console montre
    // le reste.
    const cites = enRetardAttribution
      .map((o) => o.numero)
      .sort((a, b) => a - b)
      .slice(0, 8);
    const reste = enRetardAttribution.length - cites.length;

    anomalies.push({
      gravite: "attention",
      code: "SANS_PROPRIETAIRE",
      message:
        `${enRetardAttribution.length} échange(s) sans responsable au-delà de ${seuil} h : ` +
        `n° ${cites.join(", ")}${reste > 0 ? ` et ${reste} autre(s)` : ""}.`,
    });
  }

  // ── 7. Compteur de relances divergent ───────────────────────────────────
  const divergences = await prisma.$queryRaw<{ numero: number; ecart: number }[]>`
    SELECT e.numero, (e.nb_relances - count(r.id))::int AS ecart
      FROM echange e
      LEFT JOIN relance r ON r.echange_id = e.id AND r.statut = 'ENVOYEE'
     GROUP BY e.id, e.numero, e.nb_relances
    HAVING e.nb_relances <> count(r.id)
     LIMIT 20`;

  if (divergences.length > 0) {
    anomalies.push({
      gravite: "critique",
      code: "COMPTEUR_DIVERGENT",
      message: `${divergences.length} échange(s) dont le compteur de relances ne correspond pas aux relances enregistrées : n° ${divergences
        .map((d) => d.numero)
        .join(", ")}. À signaler, pas à corriger en silence.`,
    });
  }

  // ── 8. Une alarme sans personne à appeler ───────────────────────────────
  //
  // Vérifié en dernier, car il dépend de tout ce qui précède : on ne réclame
  // une adresse de supervision que le jour où il y a réellement quelque chose
  // à dire. Sinon c'est une anomalie permanente sur une installation qui ne
  // veut simplement pas d'alertes par courriel.
  if (
    anomalies.some((a) => a.gravite === "critique") &&
    destinatairesAlerte().length === 0
  ) {
    anomalies.push({
      gravite: "attention",
      code: "ALERTES_SANS_DESTINATAIRE",
      message:
        "Anomalie critique en cours et aucune adresse de supervision : " +
        "renseigner MAILFLOW_ALERTES_A, sinon l'alarme ne sonne que dans un journal.",
    });
  }

  return {
    verifieLe,
    anomalies,
    ok: anomalies.every((a) => a.gravite === "info"),
  };
}
