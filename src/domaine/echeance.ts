/**
 * MailFlow · Calcul des échéances
 *
 * Module PUR : aucune base, aucun réseau, aucune horloge implicite. Tout
 * instant entre et sort en `Date` UTC ; toute la logique se fait en heure
 * locale du calendrier. C'est la partie la plus subtile du système et la
 * seule qu'on ne peut pas corriger après coup sans réécrire des échéances
 * déjà posées en base.
 *
 * ── LES QUATRE RÈGLES ─────────────────────────────────────────────────────
 *
 *  1. Le point de départ est normalisé au prochain instant ouvré. Un
 *     courriel reçu samedi ou à 19 h ne fait pas courir le compteur avant
 *     l'ouverture suivante.
 *
 *  2. Un délai s'exprime en jours ouvrés et préserve l'heure. Vendredi
 *     17 h 10 plus deux jours ouvrés donne mardi 17 h 10, et non dimanche.
 *
 *  3. Le compteur tourne, l'envoi attend. Si l'instant d'envoi tombe hors
 *     de la fenêtre, il est reporté à l'ouverture suivante. Le retard reste
 *     visible, aucune relance n'est consommée dans le vide.
 *
 *  4. Une date butoir imposée de l'extérieur ne se décale pas. Les relances
 *     se calculent à rebours depuis elle, en jours ouvrés, et partent à
 *     l'ouverture du jour retenu.
 */

import { DateTime } from "luxon";

/** Rythme de travail. Un seul calendrier au démarrage : pas d'astreinte. */
export type Calendrier = {
  /** Fuseau IANA, par exemple "Africa/Bamako". */
  zone: string;
  /** Jours travaillés, 1 = lundi ... 7 = dimanche. */
  joursOuvres: number[];
  /** Heure d'ouverture, "HH:MM". Borne incluse. */
  ouverture: string;
  /** Heure de fermeture, "HH:MM". Borne exclue. */
  fermeture: string;
  /** Jours chômés au format "AAAA-MM-JJ", exprimés dans `zone`. */
  joursFeries: string[];
};

export type Regle = {
  ordre: number;
  delaiJoursOuvres: number;
};

export type RelancePlanifiee = {
  ordre: number;
  /** Instant où le délai est épuisé. Sert à mesurer le retard. */
  echeance: Date;
  /** Instant où le message partira réellement (règle 3). */
  envoiPrevu: Date;
};

/** Garde-fou : un calendrier mal réglé doit échouer vite et clairement. */
const MAX_JOURS_PARCOURUS = 3660; // dix ans, largement au-delà de tout cas réel

export class CalendrierInvalide extends Error {}
export class DelaiInvalide extends Error {}

// ── Fonctions internes ─────────────────────────────────────────────────────

function verifier(cal: Calendrier): void {
  const essai = DateTime.fromMillis(0, { zone: cal.zone });
  if (!essai.isValid) {
    throw new CalendrierInvalide(
      `Fuseau horaire inconnu : "${cal.zone}". Attendu un identifiant IANA, par exemple "Africa/Bamako".`
    );
  }
  if (cal.joursOuvres.length === 0) {
    throw new CalendrierInvalide(
      "Le calendrier ne comporte aucun jour ouvré : aucune échéance ne pourrait être calculée."
    );
  }
  if (cal.joursOuvres.some((j) => !Number.isInteger(j) || j < 1 || j > 7)) {
    throw new CalendrierInvalide(
      "Les jours ouvrés doivent être des entiers de 1 (lundi) à 7 (dimanche)."
    );
  }
  if (heures(cal.ouverture) >= heures(cal.fermeture)) {
    throw new CalendrierInvalide(
      `Fenêtre d'envoi incohérente : ouverture ${cal.ouverture}, fermeture ${cal.fermeture}.`
    );
  }
}

function heures(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) {
    throw new CalendrierInvalide(
      `Heure mal formée : "${hhmm}". Attendu "HH:MM".`
    );
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) {
    throw new CalendrierInvalide(`Heure hors bornes : "${hhmm}".`);
  }
  return h * 60 + min;
}

function enZone(instant: Date, cal: Calendrier): DateTime {
  return DateTime.fromJSDate(instant, { zone: cal.zone });
}

function poser(dt: DateTime, hhmm: string): DateTime {
  const total = heures(hhmm);
  return dt.set({
    hour: Math.floor(total / 60),
    minute: total % 60,
    second: 0,
    millisecond: 0,
  });
}

function estJourTravaille(dt: DateTime, cal: Calendrier): boolean {
  if (!cal.joursOuvres.includes(dt.weekday)) return false;
  const jour = dt.toISODate();
  return jour !== null && !cal.joursFeries.includes(jour);
}

// ── Interrogation du calendrier ────────────────────────────────────────────

/** Le jour de cet instant est-il travaillé (ni week-end, ni férié) ? */
export function estJourOuvre(instant: Date, cal: Calendrier): boolean {
  verifier(cal);
  return estJourTravaille(enZone(instant, cal), cal);
}

/**
 * Cet instant tombe-t-il dans la fenêtre d'envoi ?
 * L'ouverture est incluse, la fermeture exclue : 18 h 00 est déjà fermé.
 */
export function estDansFenetre(instant: Date, cal: Calendrier): boolean {
  verifier(cal);
  const dt = enZone(instant, cal);
  if (!estJourTravaille(dt, cal)) return false;
  return dt >= poser(dt, cal.ouverture) && dt < poser(dt, cal.fermeture);
}

/**
 * Premier instant ouvré à partir de celui-ci, celui-ci compris.
 * Rend l'instant inchangé s'il est déjà dans la fenêtre.
 */
export function prochaineOuverture(instant: Date, cal: Calendrier): Date {
  verifier(cal);
  let dt = enZone(instant, cal);

  for (let i = 0; i <= MAX_JOURS_PARCOURUS; i++) {
    if (estJourTravaille(dt, cal)) {
      const ouverture = poser(dt, cal.ouverture);
      if (dt < ouverture) return ouverture.toJSDate();
      if (dt < poser(dt, cal.fermeture)) return dt.toJSDate();
    }
    dt = dt.plus({ days: 1 }).startOf("day");
  }

  throw new CalendrierInvalide(
    `Aucun jour ouvré trouvé sur ${MAX_JOURS_PARCOURUS} jours : le calendrier ou la liste des jours fériés est incohérent.`
  );
}

/**
 * Instant où le compteur démarre réellement pour un courriel reçu.
 * Règle 1 : un courriel arrivé samedi ne vieillit pas avant lundi matin.
 */
export function debutDuCompte(recuLe: Date, cal: Calendrier): Date {
  return prochaineOuverture(recuLe, cal);
}

// ── Arithmétique en jours ouvrés ───────────────────────────────────────────

/**
 * Ajoute n jours ouvrés en préservant l'heure locale.
 *
 * Le passage par l'heure locale n'est pas un détail : à travers un
 * changement d'heure, ajouter un jour ouvré n'ajoute pas 24 heures. Une
 * implémentation en millisecondes se décale d'une heure deux fois par an.
 */
export function ajouterJoursOuvres(
  instant: Date,
  n: number,
  cal: Calendrier
): Date {
  verifier(cal);
  if (!Number.isInteger(n) || n < 0) {
    throw new DelaiInvalide(
      `Délai invalide : ${n}. Attendu un entier positif ou nul. Pour un calcul à rebours, utiliser retirerJoursOuvres.`
    );
  }

  let dt = enZone(instant, cal);
  let restant = n;
  let parcourus = 0;

  while (restant > 0) {
    dt = dt.plus({ days: 1 });
    if (estJourTravaille(dt, cal)) restant--;
    if (++parcourus > MAX_JOURS_PARCOURUS) {
      throw new CalendrierInvalide(
        `Impossible d'ajouter ${n} jours ouvrés : trop peu de jours travaillés dans le calendrier.`
      );
    }
  }

  return dt.toJSDate();
}

/** Retire n jours ouvrés en préservant l'heure locale. */
export function retirerJoursOuvres(
  instant: Date,
  n: number,
  cal: Calendrier
): Date {
  verifier(cal);
  if (!Number.isInteger(n) || n < 0) {
    throw new DelaiInvalide(
      `Délai invalide : ${n}. Attendu un entier positif ou nul.`
    );
  }

  let dt = enZone(instant, cal);
  let restant = n;
  let parcourus = 0;

  while (restant > 0) {
    dt = dt.minus({ days: 1 });
    if (estJourTravaille(dt, cal)) restant--;
    if (++parcourus > MAX_JOURS_PARCOURUS) {
      throw new CalendrierInvalide(
        `Impossible de retirer ${n} jours ouvrés : trop peu de jours travaillés dans le calendrier.`
      );
    }
  }

  return dt.toJSDate();
}

/**
 * Nombre de jours ouvrés entiers écoulés entre deux instants.
 * Sert au texte des relances : « sans réponse depuis 3 jours ouvrés ».
 */
export function joursOuvresEcoules(
  depuis: Date,
  jusqua: Date,
  cal: Calendrier
): number {
  verifier(cal);
  if (jusqua <= depuis) return 0;

  let dt = enZone(depuis, cal);
  const fin = enZone(jusqua, cal);
  let compte = 0;
  let parcourus = 0;

  while (true) {
    dt = dt.plus({ days: 1 });
    if (dt > fin) break;
    if (estJourTravaille(dt, cal)) compte++;
    if (++parcourus > MAX_JOURS_PARCOURUS) break;
  }

  return compte;
}

// ── Échéances ──────────────────────────────────────────────────────────────

/**
 * Échéance de réponse d'un courriel reçu.
 *
 * Le résultat tombe toujours dans la fenêtre d'envoi : le départ y est
 * ramené, et l'ajout de jours entiers préserve l'heure.
 */
export function calculerEcheance(
  recuLe: Date,
  delaiJoursOuvres: number,
  cal: Calendrier
): Date {
  const depart = debutDuCompte(recuLe, cal);
  if (delaiJoursOuvres === 0) return depart;
  return ajouterJoursOuvres(depart, delaiJoursOuvres, cal);
}

/**
 * Échéance calculée à rebours depuis une date butoir imposée.
 *
 * La relance part à l'OUVERTURE du jour retenu, pas à l'heure du butoir :
 * quand on prévient d'une échéance qui approche, on prévient tôt dans la
 * journée. Si le jour obtenu n'est pas travaillé, on recule encore.
 */
export function calculerEcheanceARebours(
  dateButoir: Date,
  delaiJoursOuvres: number,
  cal: Calendrier
): Date {
  verifier(cal);
  if (!Number.isInteger(delaiJoursOuvres) || delaiJoursOuvres < 0) {
    throw new DelaiInvalide(
      `Délai invalide : ${delaiJoursOuvres}. Attendu un entier positif ou nul.`
    );
  }

  let dt = enZone(dateButoir, cal).startOf("day");
  let restant = delaiJoursOuvres;
  let parcourus = 0;

  while (restant > 0) {
    dt = dt.minus({ days: 1 });
    if (estJourTravaille(dt, cal)) restant--;
    if (++parcourus > MAX_JOURS_PARCOURUS) {
      throw new CalendrierInvalide(
        "Calcul à rebours impossible : trop peu de jours travaillés dans le calendrier."
      );
    }
  }

  while (!estJourTravaille(dt, cal)) {
    dt = dt.minus({ days: 1 });
    if (++parcourus > MAX_JOURS_PARCOURUS) {
      throw new CalendrierInvalide(
        "Calcul à rebours impossible : aucun jour travaillé avant la date butoir."
      );
    }
  }

  return poser(dt, cal.ouverture).toJSDate();
}

/**
 * Instant réel d'expédition (règle 3 : le compteur tourne, l'envoi attend).
 * Rend l'instant inchangé s'il est déjà dans la fenêtre.
 */
export function momentEnvoi(instantSouhaite: Date, cal: Calendrier): Date {
  return prochaineOuverture(instantSouhaite, cal);
}

// ── Planification d'une série de relances ──────────────────────────────────

/**
 * Série de relances d'un courriel reçu. Les délais s'enchaînent : chaque
 * relance part de l'échéance de la précédente, pas de la date de réception.
 */
export function planifierRelances(
  recuLe: Date,
  regles: Regle[],
  cal: Calendrier
): RelancePlanifiee[] {
  const triees = [...regles].sort((a, b) => a.ordre - b.ordre);
  let courant = recuLe;

  return triees.map((regle) => {
    const echeance = calculerEcheance(courant, regle.delaiJoursOuvres, cal);
    courant = echeance;
    return {
      ordre: regle.ordre,
      echeance,
      envoiPrevu: momentEnvoi(echeance, cal),
    };
  });
}

/**
 * Série de relances adossées à une date butoir. Chaque délai se compte
 * indépendamment depuis le butoir, et non en cascade : « J-3 » et « J-1 »
 * sont deux repères sur la même échéance, pas deux attentes successives.
 */
export function planifierRelancesARebours(
  dateButoir: Date,
  regles: Regle[],
  cal: Calendrier
): RelancePlanifiee[] {
  return [...regles]
    .sort((a, b) => b.delaiJoursOuvres - a.delaiJoursOuvres)
    .map((regle) => {
      const echeance = calculerEcheanceARebours(
        dateButoir,
        regle.delaiJoursOuvres,
        cal
      );
      return {
        ordre: regle.ordre,
        echeance,
        envoiPrevu: momentEnvoi(echeance, cal),
      };
    });
}
