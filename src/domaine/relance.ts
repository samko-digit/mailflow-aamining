/**
 * MailFlow · Règles d'une relance
 *
 * Module PUR : à qui la relance s'adresse, et avec quelles valeurs le gabarit
 * se remplit. Aucune base, aucun réseau, donc testable sans rien monter.
 *
 * La lecture des dossiers et l'envoi vivent dans `donnees/composer-relance.ts`,
 * qui appelle ces deux fonctions. La séparation n'est pas décorative : c'est
 * elle qui permet de vérifier le comportement sur un responsable en congé ou
 * sur un correspondant sans nom, cas qu'on ne saurait pas fabriquer en base.
 *
 * ── LA VARIABLE VIDE EST UN REFUS, PAS UN TROU ────────────────────────────
 *
 * `remplirModele` refuse un gabarit dont une variable manque. Toute valeur
 * facultative en base doit donc recevoir ici un repli explicite, faute de quoi
 * un correspondant sans organisation renseignée bloquerait toutes ses
 * relances. Chaque repli ci-dessous est un choix assumé, pas un oubli.
 */

import { DateTime } from "luxon";

import type { Variables } from "../connecteur/garde-envoi";
import { type Calendrier, joursOuvresEcoules } from "./echeance";

const ZONE = "Africa/Bamako";

/** Adresse de la console, citée dans les modèles. */
export function urlConsole(
  env: Record<string, string | undefined> = process.env
): string {
  return (env.MAILFLOW_URL_CONSOLE ?? "http://localhost:3000").replace(/\/+$/, "");
}

function dateFr(d: Date): string {
  return DateTime.fromJSDate(d, { zone: ZONE })
    .setLocale("fr")
    .toFormat("dd/LL/yyyy 'à' HH'h'mm");
}

function dureeFr(joursOuvres: number): string {
  if (joursOuvres <= 0) return "moins d'un jour ouvré";
  return `${joursOuvres} jour${joursOuvres > 1 ? "s" : ""} ouvré${joursOuvres > 1 ? "s" : ""}`;
}

// ── Résolution du destinataire ─────────────────────────────────────────────

export type Personne = {
  id: string;
  email: string;
  nomComplet: string;
  actif: boolean;
};

export type Equipe = {
  responsable: Personne | null;
  suppleant: Personne | null;
  escalade: Personne | null;
};

export type RegleDestinataire = "PROPRIETAIRE" | "SUPPLEANT" | "ESCALADE";

export type Destinataire =
  | { trouve: true; personne: Personne; motif: string }
  | { trouve: false; raison: string };

/**
 * À qui adresser la relance.
 *
 * Une relance N'EST PAS un message au correspondant : il a écrit, il attend,
 * le relancer serait absurde. Elle va à la personne DE LA MAISON qui doit
 * répondre. C'est ce que dit le schéma, où `Relance.destinataire` pointe sur
 * un `Utilisateur` et jamais sur un `Correspondant`.
 *
 * Le report sur le suppléant pendant une absence déclarée n'est pas un
 * confort : une relance envoyée à quelqu'un en congé n'est pas une relance,
 * c'est un dossier qui dort en se croyant suivi. Le schéma le dit déjà :
 * « résolu à l'envoi, pas à la planification ».
 */
export function resoudreDestinataire(
  regle: RegleDestinataire,
  equipe: Equipe,
  responsableAbsent: boolean
): Destinataire {
  const utilisable = (p: Personne | null): p is Personne => !!p && p.actif;

  if (regle === "ESCALADE") {
    // Pas de repli sur le responsable : escalader vers celui qu'on relance
    // depuis trois semaines n'est pas une escalade, c'est une quatrième
    // relance déguisée.
    if (!utilisable(equipe.escalade)) {
      return {
        trouve: false,
        raison:
          "aucun destinataire d'escalade actif : renseigner « escalade vers » sur la catégorie",
      };
    }
    return { trouve: true, personne: equipe.escalade, motif: "escalade" };
  }

  if (regle === "SUPPLEANT") {
    if (utilisable(equipe.suppleant)) {
      return { trouve: true, personne: equipe.suppleant, motif: "suppléant" };
    }
    if (utilisable(equipe.responsable)) {
      return {
        trouve: true,
        personne: equipe.responsable,
        motif: "responsable, faute de suppléant actif",
      };
    }
    return { trouve: false, raison: "ni suppléant ni responsable actif" };
  }

  // PROPRIETAIRE
  if (responsableAbsent && utilisable(equipe.suppleant)) {
    return {
      trouve: true,
      personne: equipe.suppleant,
      motif: "suppléant, le responsable est absent",
    };
  }
  if (utilisable(equipe.responsable)) {
    return { trouve: true, personne: equipe.responsable, motif: "responsable" };
  }
  if (utilisable(equipe.suppleant)) {
    return {
      trouve: true,
      personne: equipe.suppleant,
      motif: "suppléant, le responsable est inactif",
    };
  }
  return {
    trouve: false,
    raison: "l'échange n'a pas de responsable actif : l'attribuer avant de relancer",
  };
}

// ── Variables du modèle ────────────────────────────────────────────────────

export type DonneesEchange = {
  numero: number;
  sujet: string;
  recuLe: Date;
  echeance: Date | null;
  webLink: string | null;
  correspondantEmail: string;
  correspondantNom: string | null;
  correspondantOrganisation: string | null;
};

/**
 * Construit les variables du gabarit.
 *
 * Les neuf variables documentées dans le jeu de données initial :
 * numero, sujet, correspondant, organisation, recuLe, joursEcoules,
 * echeance, lienMail, lienFiche. Aucune ne doit jamais ressortir vide.
 */
export function variablesRelance(
  e: DonneesEchange,
  maintenant: Date,
  cal: Calendrier,
  base: string = urlConsole()
): Variables {
  const domaine = e.correspondantEmail.split("@")[1] ?? "";

  // Le lien vers le message d'origine n'existe que si le fournisseur en donne
  // un : Outlook le fait, IMAP non. À défaut, la console reste le bon endroit
  // où aller voir. Mieux vaut un lien utile qu'un lien mort.
  //
  // `?q=<numero>` n'est pas un paramètre inventé pour la circonstance : la
  // recherche de la console reconnaît un nombre seul comme un numéro
  // d'échange, donc le lien ouvre le dossier et lui seul.
  const lienFiche = `${base}/?q=${e.numero}`;

  return {
    numero: `#${e.numero}`,
    sujet: e.sujet || "(sans objet)",
    correspondant: e.correspondantNom || e.correspondantEmail,
    organisation:
      e.correspondantOrganisation || domaine || "organisation non renseignée",
    recuLe: dateFr(e.recuLe),
    joursEcoules: dureeFr(joursOuvresEcoules(e.recuLe, maintenant, cal)),
    echeance: e.echeance ? dateFr(e.echeance) : "non fixée",
    lienMail: e.webLink || lienFiche,
    lienFiche,
  };
}
