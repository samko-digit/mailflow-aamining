/**
 * MailFlow · Cycle de vie d'un échange
 *
 * Module PUR, comme `echeance.ts` : aucune base, aucun réseau. Il décide,
 * il n'exécute pas. Chaque transition rend un nouvel état et la liste des
 * effets que l'infrastructure devra produire (planifier, annuler,
 * journaliser, alerter).
 *
 * Cette séparation n'est pas de l'esthétique. Elle permet de vérifier par
 * des tests que la détection d'une réponse annule bien les relances en
 * attente, sans avoir besoin d'une base, d'une messagerie ni d'une horloge.
 *
 * ── LES CINQ INVARIANTS ───────────────────────────────────────────────────
 *
 *  1. Une réponse, quel qu'en soit le canal, arrête les relances depuis
 *     n'importe quel état actif (RG-05).
 *  2. Une relance ne s'enregistre que dans l'ordre, une seule fois (RG-04).
 *  3. Une non-remise est un incident, pas une réponse : elle rend son rang
 *     à la relance et déclenche une alerte.
 *  4. Un échange escaladé ne se ferme jamais tout seul (RG-08).
 *  5. Archivé et hors périmètre sont terminaux : plus rien n'en sort.
 */

// ── Vocabulaire ────────────────────────────────────────────────────────────
// Ces unions doublent volontairement les énumérations Prisma plutôt que de
// les importer : le domaine ne dépend pas du client généré. Un test vérifie
// qu'elles ne divergent jamais.

export type Statut =
  | "A_QUALIFIER"
  | "EN_ATTENTE"
  | "RELANCE"
  | "ESCALADE"
  | "REPONDU"
  | "SANS_SUITE"
  | "HORS_PERIMETRE"
  | "ARCHIVE";

export type CanalHorsMail = "TELEPHONE" | "REUNION" | "WHATSAPP" | "PHYSIQUE";

export type TypeEvenement =
  | "MAIL_DETECTE"
  | "MAIL_ENREGISTRE"
  | "MAIL_QUALIFIE"
  | "MAIL_ATTRIBUE"
  | "MAIL_TRANSMIS"
  | "MAIL_REQUALIFIE"
  | "RELANCE_ENVOYEE"
  | "RELANCE_REPORTEE"
  | "RELANCE_ECHEC"
  | "REPONSE_DETECTEE"
  | "REPONSE_DECLAREE"
  | "ESCALADE_DECLENCHEE"
  | "ECHANGE_CLOS"
  | "MAIL_ARCHIVE"
  | "PARAMETRE_MODIFIE"
  | "REGLE_MODIFIEE"
  | "UTILISATEUR_MODIFIE"
  | "ANOMALIE_TECHNIQUE";

export const STATUTS_ACTIFS = [
  "A_QUALIFIER",
  "EN_ATTENTE",
  "RELANCE",
  "ESCALADE",
] as const satisfies readonly Statut[];

export const STATUTS_TERMINAUX = [
  "HORS_PERIMETRE",
  "ARCHIVE",
] as const satisfies readonly Statut[];

export function estActif(statut: Statut): boolean {
  return (STATUTS_ACTIFS as readonly Statut[]).includes(statut);
}

export function estTerminal(
  statut: Statut
): statut is (typeof STATUTS_TERMINAUX)[number] {
  return (STATUTS_TERMINAUX as readonly Statut[]).includes(statut);
}

// ── État et transitions ────────────────────────────────────────────────────

export type EtatEchange = {
  statut: Statut;
  categorie: string | null;
  responsable: string | null;
  echeance: Date | null;
  nbRelances: number;
  reponduLe: Date | null;
  canalReponse: string | null;
  motifCloture: string | null;
  archiveUrl: string | null;
};

/** Ce qui doit être planifié après une relance réussie. */
export type Suite =
  | { type: "RELANCE"; ordre: number; quand: Date }
  | { type: "ESCALADE"; quand: Date }
  | null;

export type Transition =
  | {
      type: "QUALIFIER";
      categorie: string;
      responsable: string;
      echeance: Date;
      premiereRelance: Date;
      /** Libellés lisibles pour le journal. Les identifiants sont illisibles
       *  dans « Activité récente » ; l'appelant, qui connaît les noms, les
       *  fournit. Sans eux, le journal retombe sur les identifiants. */
      libelleCategorie?: string;
      libelleResponsable?: string;
    }
  | { type: "CLASSER_HORS_PERIMETRE"; motif: string }
  | { type: "REATTRIBUER"; responsable: string; libelleResponsable?: string }
  | { type: "RELANCER"; ordre: number; suite: Suite }
  | {
      type: "SIGNALER_NON_REMISE";
      ordre: number;
      motif: string;
      nouvelleTentative: Date;
    }
  | { type: "ESCALADER" }
  | {
      type: "DETECTER_REPONSE";
      reponduLe: Date;
      messageId: string;
      archiverLe: Date;
    }
  | {
      type: "DECLARER_REPONSE";
      reponduLe: Date;
      canal: CanalHorsMail;
      archiverLe: Date;
    }
  | { type: "ROUVRIR"; motif: string; nouvelleEcheance: Date }
  | { type: "CLASSER_SANS_SUITE"; motif: string; archiverLe: Date }
  | { type: "ARCHIVER"; url: string }
  | {
      type: "REQUALIFIER";
      categorie: string;
      responsable: string;
      echeance: Date;
      premiereRelance: Date;
      /** Libellés lisibles pour le journal */
      libelleCategorie?: string;
      libelleResponsable?: string;
      /** Valeurs avant modification pour l'historique */
      categorieAvant?: string;
      responsableAvant?: string;
      echeanceAvant?: Date;
    };

export type Effet =
  | {
      type: "PLANIFIER";
      travail: "RELANCE" | "ESCALADE" | "ARCHIVAGE";
      quand: Date;
      ordre?: number;
    }
  | { type: "ANNULER_TRAVAUX" }
  | { type: "JOURNALISER"; evenement: TypeEvenement; libelle: string }
  | { type: "ALERTER"; libelle: string };

export type Resultat = {
  etat: EtatEchange;
  effets: Effet[];
};

export class TransitionInterdite extends Error {}
export class TransitionIncomplete extends Error {}

// ── Outils internes ────────────────────────────────────────────────────────

function depuis(etat: EtatEchange, type: string, autorises: Statut[]): void {
  if (!autorises.includes(etat.statut)) {
    throw new TransitionInterdite(
      `Transition "${type}" impossible depuis l'état "${etat.statut}". États autorisés : ${autorises.join(", ")}.`
    );
  }
}

function exiger(condition: boolean, message: string): void {
  if (!condition) throw new TransitionIncomplete(message);
}

function texteNonVide(valeur: string, champ: string): void {
  exiger(
    typeof valeur === "string" && valeur.trim().length > 0,
    `Le champ "${champ}" est obligatoire et ne peut pas être vide.`
  );
}

/** État de départ d'un échange fraîchement capté. */
export function etatInitial(): EtatEchange {
  return {
    statut: "A_QUALIFIER",
    categorie: null,
    responsable: null,
    echeance: null,
    nbRelances: 0,
    reponduLe: null,
    canalReponse: null,
    motifCloture: null,
    archiveUrl: null,
  };
}

// ── La machine ─────────────────────────────────────────────────────────────

/**
 * Applique une transition. Ne modifie jamais l'état reçu : rend un nouvel
 * objet, ce qui rend les tests lisibles et les régressions visibles.
 */
export function appliquer(etat: EtatEchange, t: Transition): Resultat {
  if (estTerminal(etat.statut)) {
    throw new TransitionInterdite(
      `L'état "${etat.statut}" est terminal : aucune transition n'est possible, "${t.type}" comprise.`
    );
  }

  switch (t.type) {
    // ─────────────────────────────────────────────────────────────────────
    case "QUALIFIER": {
      depuis(etat, t.type, ["A_QUALIFIER"]);
      texteNonVide(t.categorie, "categorie");
      texteNonVide(t.responsable, "responsable");

      return {
        etat: {
          ...etat,
          statut: "EN_ATTENTE",
          categorie: t.categorie,
          responsable: t.responsable,
          echeance: t.echeance,
        },
        effets: [
          {
            type: "PLANIFIER",
            travail: "RELANCE",
            quand: t.premiereRelance,
            ordre: 1,
          },
          {
            type: "JOURNALISER",
            evenement: "MAIL_QUALIFIE",
            libelle: t.libelleCategorie ?? `Catégorie ${t.categorie}`,
          },
          {
            type: "JOURNALISER",
            evenement: "MAIL_ATTRIBUE",
            libelle: t.libelleResponsable ?? `Responsable ${t.responsable}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    case "REQUALIFIER": {
      depuis(etat, t.type, ["EN_ATTENTE", "RELANCE", "ESCALADE"]);
      texteNonVide(t.categorie, "categorie");
      texteNonVide(t.responsable, "responsable");

      return {
        etat: {
          ...etat,
          statut: "EN_ATTENTE",
          categorie: t.categorie,
          responsable: t.responsable,
          echeance: t.echeance,
          nbRelances: 0, // Redémarrer le cycle de relances
        },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          {
            type: "PLANIFIER",
            travail: "RELANCE",
            quand: t.premiereRelance,
            ordre: 1,
          },
          {
            type: "JOURNALISER",
            evenement: "MAIL_REQUALIFIE",
            libelle: t.libelleCategorie ?? `Catégorie ${t.categorie}`,
          },
          {
            type: "JOURNALISER",
            evenement: "MAIL_ATTRIBUE",
            libelle: t.libelleResponsable ?? `Responsable ${t.responsable}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    case "CLASSER_HORS_PERIMETRE": {
      depuis(etat, t.type, ["A_QUALIFIER"]);
      texteNonVide(t.motif, "motif");

      return {
        etat: { ...etat, statut: "HORS_PERIMETRE", motifCloture: t.motif },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          {
            type: "JOURNALISER",
            evenement: "ECHANGE_CLOS",
            libelle: `Hors périmètre : ${t.motif}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    case "REATTRIBUER": {
      depuis(etat, t.type, ["EN_ATTENTE", "RELANCE", "ESCALADE"]);
      texteNonVide(t.responsable, "responsable");

      return {
        etat: { ...etat, responsable: t.responsable },
        effets: [
          {
            type: "JOURNALISER",
            evenement: "MAIL_ATTRIBUE",
            libelle: t.libelleResponsable
              ? `Réattribué à ${t.libelleResponsable}`
              : `Réattribué à ${t.responsable}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Invariant 2 : une relance ne s'enregistre que dans l'ordre. Le rang
    // attendu est le suivant du compteur, ce qui rend le rejeu d'un
    // traitement inoffensif au lieu de produire un double envoi.
    case "RELANCER": {
      depuis(etat, t.type, ["EN_ATTENTE", "RELANCE"]);
      exiger(
        t.ordre === etat.nbRelances + 1,
        `Relance de rang ${t.ordre} refusée : ${etat.nbRelances} relance(s) déjà enregistrée(s), rang attendu ${etat.nbRelances + 1}.`
      );

      const effets: Effet[] = [
        {
          type: "JOURNALISER",
          evenement: "RELANCE_ENVOYEE",
          libelle: `Relance ${t.ordre}`,
        },
      ];

      if (t.suite?.type === "RELANCE") {
        effets.unshift({
          type: "PLANIFIER",
          travail: "RELANCE",
          quand: t.suite.quand,
          ordre: t.suite.ordre,
        });
      } else if (t.suite?.type === "ESCALADE") {
        effets.unshift({
          type: "PLANIFIER",
          travail: "ESCALADE",
          quand: t.suite.quand,
        });
      }

      return {
        etat: { ...etat, statut: "RELANCE", nbRelances: etat.nbRelances + 1 },
        effets,
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Invariant 3 : une non-remise n'est pas une réponse. Le courriel n'est
    // pas parti, donc le rang est rendu et l'incident est signalé.
    case "SIGNALER_NON_REMISE": {
      depuis(etat, t.type, ["RELANCE"]);
      texteNonVide(t.motif, "motif");
      exiger(
        t.ordre === etat.nbRelances,
        `Non-remise du rang ${t.ordre} incohérente : le compteur est à ${etat.nbRelances}.`
      );

      return {
        etat: {
          ...etat,
          statut: "EN_ATTENTE",
          nbRelances: etat.nbRelances - 1,
        },
        effets: [
          {
            type: "PLANIFIER",
            travail: "RELANCE",
            quand: t.nouvelleTentative,
            ordre: t.ordre,
          },
          {
            type: "JOURNALISER",
            evenement: "RELANCE_ECHEC",
            libelle: `Relance ${t.ordre} non remise : ${t.motif}`,
          },
          {
            type: "ALERTER",
            libelle: `Relance ${t.ordre} non remise : ${t.motif}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    case "ESCALADER": {
      depuis(etat, t.type, ["EN_ATTENTE", "RELANCE"]);

      return {
        etat: { ...etat, statut: "ESCALADE" },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          {
            type: "JOURNALISER",
            evenement: "ESCALADE_DECLENCHEE",
            libelle: `Escalade après ${etat.nbRelances} relance(s)`,
          },
          {
            type: "ALERTER",
            libelle: `Échange escaladé après ${etat.nbRelances} relance(s) sans réponse`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Invariant 1 : une réponse arrête les relances, depuis tout état actif,
    // y compris ESCALADE et y compris A_QUALIFIER.
    case "DETECTER_REPONSE": {
      depuis(etat, t.type, [...STATUTS_ACTIFS]);
      texteNonVide(t.messageId, "messageId");

      return {
        etat: {
          ...etat,
          statut: "REPONDU",
          reponduLe: t.reponduLe,
          canalReponse: "MAIL",
        },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          { type: "PLANIFIER", travail: "ARCHIVAGE", quand: t.archiverLe },
          {
            type: "JOURNALISER",
            evenement: "REPONSE_DETECTEE",
            libelle: `Réponse ${t.messageId}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // RG-15 : un échange clos par téléphone ou en réunion se déclare à la
    // main. Le registre reflète la réalité, pas seulement la messagerie.
    case "DECLARER_REPONSE": {
      depuis(etat, t.type, [...STATUTS_ACTIFS]);

      return {
        etat: {
          ...etat,
          statut: "REPONDU",
          reponduLe: t.reponduLe,
          canalReponse: t.canal,
        },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          { type: "PLANIFIER", travail: "ARCHIVAGE", quand: t.archiverLe },
          {
            type: "JOURNALISER",
            evenement: "REPONSE_DECLAREE",
            libelle: `Réponse déclarée, canal ${t.canal}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Filet : une réponse détectée à tort ne doit pas être un cul-de-sac.
    case "ROUVRIR": {
      depuis(etat, t.type, ["REPONDU"]);
      texteNonVide(t.motif, "motif");

      return {
        etat: {
          ...etat,
          statut: "EN_ATTENTE",
          reponduLe: null,
          canalReponse: null,
          echeance: t.nouvelleEcheance,
        },
        effets: [
          {
            type: "PLANIFIER",
            travail: "RELANCE",
            quand: t.nouvelleEcheance,
            ordre: etat.nbRelances + 1,
          },
          {
            type: "JOURNALISER",
            evenement: "ANOMALIE_TECHNIQUE",
            libelle: `Réouverture : ${t.motif}`,
          },
          { type: "ALERTER", libelle: `Échange rouvert : ${t.motif}` },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Invariant 4 : seul un humain ferme un échange escaladé, avec motif.
    case "CLASSER_SANS_SUITE": {
      depuis(etat, t.type, ["ESCALADE"]);
      texteNonVide(t.motif, "motif");

      return {
        etat: { ...etat, statut: "SANS_SUITE", motifCloture: t.motif },
        effets: [
          { type: "ANNULER_TRAVAUX" },
          { type: "PLANIFIER", travail: "ARCHIVAGE", quand: t.archiverLe },
          {
            type: "JOURNALISER",
            evenement: "ECHANGE_CLOS",
            libelle: `Sans suite : ${t.motif}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    case "ARCHIVER": {
      depuis(etat, t.type, ["REPONDU", "SANS_SUITE"]);
      texteNonVide(t.url, "url");

      return {
        etat: { ...etat, statut: "ARCHIVE", archiveUrl: t.url },
        effets: [
          {
            type: "JOURNALISER",
            evenement: "MAIL_ARCHIVE",
            libelle: `Archivé : ${t.url}`,
          },
        ],
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    default: {
      // Exhaustivité vérifiée à la compilation : ajouter une transition sans
      // la traiter ici devient une erreur de type, pas un bogue silencieux.
      const jamais: never = t;
      throw new TransitionInterdite(
        `Transition inconnue : ${JSON.stringify(jamais)}`
      );
    }
  }
}

/** Liste les transitions applicables à un état, pour l'interface. */
export function transitionsPossibles(statut: Statut): Transition["type"][] {
  if (estTerminal(statut)) return [];

  switch (statut) {
    case "A_QUALIFIER":
      return ["QUALIFIER", "CLASSER_HORS_PERIMETRE", "DETECTER_REPONSE", "DECLARER_REPONSE"];
    case "EN_ATTENTE":
      return ["RELANCER", "ESCALADER", "REATTRIBUER", "REQUALIFIER", "DETECTER_REPONSE", "DECLARER_REPONSE"];
    case "RELANCE":
      return [
        "RELANCER",
        "SIGNALER_NON_REMISE",
        "ESCALADER",
        "REATTRIBUER",
        "REQUALIFIER",
        "DETECTER_REPONSE",
        "DECLARER_REPONSE",
      ];
    case "ESCALADE":
      return ["CLASSER_SANS_SUITE", "REATTRIBUER", "REQUALIFIER", "DETECTER_REPONSE", "DECLARER_REPONSE"];
    case "REPONDU":
      return ["ARCHIVER", "ROUVRIR"];
    case "SANS_SUITE":
      return ["ARCHIVER"];
    default: {
      const jamais: never = statut;
      throw new Error(`Statut inconnu : ${String(jamais)}`);
    }
  }
}
