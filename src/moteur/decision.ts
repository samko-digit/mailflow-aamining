/**
 * MailFlow · Décision d'exécution d'un travail planifié
 *
 * Module PUR, comme le reste du domaine. Répond à une seule question :
 * ce travail, échu maintenant, part-il tout de suite ou attend-il ?
 *
 * ── LA DISTINCTION QUI COMPTE ─────────────────────────────────────────────
 *
 * Seuls les travaux qui ENVOIENT UN MESSAGE respectent la fenêtre d'envoi.
 * Une relance et une escalade écrivent à quelqu'un : elles attendent
 * l'ouverture. Un archivage ne dérange personne : il s'exécute la nuit, le
 * week-end, un jour férié, peu importe.
 *
 * Confondre les deux conduit soit à réveiller les gens le dimanche, soit à
 * laisser l'archivage prendre du retard pour rien.
 */

import { type Calendrier, estDansFenetre, prochaineOuverture } from "../domaine/echeance";
import { type Statut, transitionsPossibles } from "../domaine/cycle-echange";

export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT";

export type Decision =
  | { action: "executer" }
  | { action: "reporter"; a: Date; raison: string }
  | { action: "perimer"; raison: string };

/** Transition que chaque type de travail cherche à appliquer. */
const TRANSITION_DU_TRAVAIL: Partial<Record<TypeTravail, string>> = {
  RELANCE: "RELANCER",
  ESCALADE: "ESCALADER",
  ARCHIVAGE: "ARCHIVER",
};

/**
 * Le travail a-t-il encore un sens dans l'état actuel du dossier ?
 *
 * On interroge le domaine plutôt que de redire ses règles ici. Un travail
 * planifié hier sur un dossier auquel le client a répondu ce matin est
 * devenu sans objet : il ne faut ni l'exécuter, ni le reporter à l'infini.
 */
export function travailEncorePertinent(
  type: TypeTravail,
  statut: Statut
): boolean {
  const attendue = TRANSITION_DU_TRAVAIL[type];
  if (!attendue) return true;
  return (transitionsPossibles(statut) as string[]).includes(attendue);
}

/** Travaux qui produisent un message sortant, donc soumis à la fenêtre. */
const ENVOIE_UN_MESSAGE: ReadonlySet<TypeTravail> = new Set<TypeTravail>([
  "RELANCE",
  "ESCALADE",
]);

export function envoieUnMessage(type: TypeTravail): boolean {
  return ENVOIE_UN_MESSAGE.has(type);
}

/**
 * Décide du sort d'un travail échu.
 *
 * C'est ici que vit la règle « le compteur tourne, l'envoi attend » : le
 * travail n'est pas perdu ni exécuté hors délai, il est reprogrammé à
 * l'ouverture suivante. Le retard reste visible dans la console.
 */
export function deciderTravail(
  type: TypeTravail,
  maintenant: Date,
  cal: Calendrier,
  statut?: Statut
): Decision {
  // La pertinence passe AVANT la fenêtre : sinon un travail devenu sans
  // objet serait reporté d'ouverture en ouverture, indéfiniment.
  if (statut && !travailEncorePertinent(type, statut)) {
    return {
      action: "perimer",
      raison: `le dossier est passé en ${statut}, ce travail n'a plus d'objet`,
    };
  }

  if (!envoieUnMessage(type)) return { action: "executer" };

  if (estDansFenetre(maintenant, cal)) return { action: "executer" };

  const ouverture = prochaineOuverture(maintenant, cal);
  return {
    action: "reporter",
    a: ouverture,
    raison: "hors fenêtre d'envoi",
  };
}

/**
 * Temporisation croissante après un échec technique : 5 min, 15 min, 45 min.
 * Au-delà du nombre maximal de tentatives, le travail passe en échec et
 * déclenche une alerte plutôt qu'un nouvel essai silencieux.
 */
export const TENTATIVES_MAX = 3;

export function prochaineTentative(tentatives: number, maintenant: Date): Date {
  const minutes = 5 * Math.pow(3, Math.max(0, tentatives - 1));
  return new Date(maintenant.getTime() + minutes * 60_000);
}

/** Un verrou plus vieux que cela signale un exécutant mort en cours de route. */
export const VERROU_PERIME_MINUTES = 15;

/**
 * Attente après un refus de garde-fou.
 *
 * Un refus n'est pas un échec : l'envoi est désactivé, ou le destinataire
 * n'est pas encore sur la liste blanche. Le travail reste en attente, sans
 * consommer de tentative, mais il ne sert à rien de le représenter toutes les
 * cinq minutes : le refus vient d'un fichier de configuration, il ne changera
 * pas tout seul dans le quart d'heure. Une heure laisse le temps d'agir sans
 * noyer le rapport, et la fenêtre d'envoi reste maîtresse ensuite.
 */
export const REPORT_REFUS_MINUTES = 60;

export function prochainEssaiApresRefus(maintenant: Date): Date {
  return new Date(maintenant.getTime() + REPORT_REFUS_MINUTES * 60_000);
}
