/**
 * MailFlow · Mise en forme pour l'affichage
 *
 * Tout est calculé côté serveur, dans le fuseau du site. Aucune date n'est
 * formatée dans le navigateur : cela éviterait un écart d'affichage entre
 * le rendu serveur et le rendu client, et surtout cela garderait le fuseau
 * du visiteur plutôt que celui du site.
 */

import { DateTime } from "luxon";

export const ZONE = "Africa/Bamako";

const dt = (d: Date) => DateTime.fromJSDate(d, { zone: ZONE }).setLocale("fr");

/** « lundi 7 septembre 2026 » */
export function dateLongue(d: Date): string {
  const t = dt(d).toFormat("cccc d LLLL yyyy");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** « 10:24 » */
export function heure(d: Date): string {
  return dt(d).toFormat("HH:mm");
}

/**
 * Durée d'attente compacte : « 8 h », « 3 j », « 12 min ».
 * Au-delà de 48 heures on bascule en jours : personne ne lit « 76 h ».
 */
export function attente(depuis: Date, maintenant: Date): string {
  const minutes = Math.max(
    0,
    Math.round((maintenant.getTime() - depuis.getTime()) / 60000)
  );
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 48) return `${heures} h`;
  return `${Math.round(heures / 24)} j`;
}

/** « Aujourd'hui 09:42 », « Demain 08:30 », « 18 sept. 10:00 », « En retard ». */
export function echeanceLisible(d: Date | null, maintenant: Date): string {
  if (!d) return "—";
  const cible = dt(d);
  const ref = dt(maintenant);
  const ecart = cible.startOf("day").diff(ref.startOf("day"), "days").days;

  if (ecart === 0) return `Aujourd'hui ${cible.toFormat("HH:mm")}`;
  if (ecart === 1) return `Demain ${cible.toFormat("HH:mm")}`;
  if (ecart === -1) return `Hier ${cible.toFormat("HH:mm")}`;
  return cible.toFormat("dd LLL HH:mm");
}

/** « il y a 4 min », « il y a 3 h », « il y a 2 j ». */
export function ilYA(d: Date, maintenant: Date): string {
  return `il y a ${attente(d, maintenant)}`;
}

/** Délai avant échéance, pour l'encart « Prochaine relance ». */
export function dansCombienDeTemps(d: Date, maintenant: Date): string {
  const minutes = Math.round((d.getTime() - maintenant.getTime()) / 60000);
  if (minutes <= 0) return "Maintenant";
  if (minutes < 60) return `Dans ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `Dans ${heures} h`;
  return `Dans ${Math.round(heures / 24)} j`;
}

export type Pastille = { libelle: string; classe: string };

/**
 * Le statut affiché n'est pas exactement le statut stocké : un échange actif
 * dont l'échéance est passée s'affiche « En retard ». C'est une dérivation,
 * pas une valeur en base.
 */
export function pastilleStatut(
  statut: string,
  echeance: Date | null,
  maintenant: Date
): Pastille {
  const actif = ["A_QUALIFIER", "EN_ATTENTE", "RELANCE", "ESCALADE"].includes(
    statut
  );
  if (actif && echeance && echeance.getTime() < maintenant.getTime()) {
    return { libelle: "En retard", classe: "past-rouge" };
  }
  switch (statut) {
    case "A_QUALIFIER":
      return { libelle: "À qualifier", classe: "past-cyan" };
    case "EN_ATTENTE":
      return { libelle: "En attente", classe: "past-jaune" };
    case "RELANCE":
      return { libelle: "Relancé", classe: "past-bleu" };
    case "ESCALADE":
      return { libelle: "Escaladé", classe: "past-violet" };
    case "REPONDU":
      return { libelle: "Répondu", classe: "past-vert" };
    case "SANS_SUITE":
      return { libelle: "Sans suite", classe: "past-gris" };
    case "ARCHIVE":
      return { libelle: "Archivé", classe: "past-gris" };
    default:
      return { libelle: statut, classe: "past-gris" };
  }
}

export function couleurPriorite(priorite: string): string {
  switch (priorite) {
    case "CRITIQUE":
      return "var(--rouge)";
    case "HAUTE":
      return "var(--orange)";
    case "NORMALE":
      return "var(--bleu)";
    default:
      return "var(--vert)";
  }
}

export function libelleEvenement(type: string): string {
  const table: Record<string, string> = {
    MAIL_DETECTE: "Mail détecté",
    MAIL_ENREGISTRE: "Mail enregistré",
    MAIL_QUALIFIE: "Mail qualifié",
    MAIL_ATTRIBUE: "Mail attribué",
    MAIL_TRANSMIS: "Mail transmis",
    RELANCE_ENVOYEE: "Relance envoyée",
    RELANCE_REPORTEE: "Relance reportée",
    RELANCE_ECHEC: "Relance en échec",
    REPONSE_DETECTEE: "Réponse détectée",
    REPONSE_DECLAREE: "Réponse déclarée",
    ESCALADE_DECLENCHEE: "Escalade déclenchée",
    ECHANGE_CLOS: "Échange clos",
    MAIL_ARCHIVE: "Mail archivé",
    ANOMALIE_TECHNIQUE: "Anomalie technique",
  };
  return table[type] ?? type;
}

export function classeEvenement(type: string): string {
  if (type.startsWith("REPONSE")) return "ev-vert";
  if (type.startsWith("RELANCE")) return "ev-bleu";
  if (type.startsWith("ESCALADE") || type === "ANOMALIE_TECHNIQUE")
    return "ev-rouge";
  if (type === "MAIL_ARCHIVE" || type === "ECHANGE_CLOS") return "ev-gris";
  return "ev-violet";
}
