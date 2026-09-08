/**
 * MailFlow · Garde-fous de l'envoi
 *
 * Module PUR. Il décide si un message a le droit de partir, et compose son
 * texte. Aucun réseau : c'est ce qui permet de tester les refus sans risquer
 * d'envoyer quoi que ce soit.
 *
 * ── LE PRINCIPE : REFUSER PAR DÉFAUT ──────────────────────────────────────
 *
 * Trois verrous indépendants, tous fermés au départ :
 *
 *   1. `MAILFLOW_ENVOI_AUTORISE` doit valoir exactement « oui ». Pas « true »,
 *      pas « 1 », pas « yes » : un mot qu'on n'écrit pas par accident.
 *   2. Chaque destinataire doit figurer dans la liste blanche. Une liste vide
 *      interdit tout envoi.
 *   3. Le modèle doit être entièrement rempli. Une variable manquante annule
 *      l'envoi plutôt que de produire « Bonjour , » chez le destinataire.
 *
 * Un seul verrou fermé suffit à bloquer. C'est délibéré : le coût d'un envoi
 * manqué est une relance en retard, le coût d'un envoi indu est un client qui
 * reçoit un message absurde et une confiance perdue.
 */

export type ReglagesEnvoi = {
  /** Vrai seulement si MAILFLOW_ENVOI_AUTORISE vaut exactement « oui ». */
  autorise: boolean;
  /** Adresses complètes ou domaines préfixés d'un @. Vide = rien ne part. */
  destinatairesAutorises: string[];
  expediteur: string;
};

export type Autorisation =
  | { autorise: true }
  | { autorise: false; raison: string };

/** Lit les réglages d'envoi depuis l'environnement, en refusant par défaut. */
export function reglagesDepuisEnv(
  env: Record<string, string | undefined> = process.env
): ReglagesEnvoi {
  return {
    autorise: (env.MAILFLOW_ENVOI_AUTORISE ?? "").trim().toLowerCase() === "oui",
    destinatairesAutorises: (env.MAILFLOW_DESTINATAIRES_AUTORISES ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    expediteur: (env.MAILFLOW_BOITE ?? "").trim().toLowerCase(),
  };
}

function estAutorise(adresse: string, liste: string[]): boolean {
  const a = adresse.trim().toLowerCase();
  const domaine = a.split("@")[1] ?? "";
  return liste.some((entree) =>
    entree.startsWith("@") ? domaine === entree.slice(1) : a === entree
  );
}

/**
 * Vérifie qu'un envoi est permis vers TOUS ses destinataires.
 *
 * Un seul destinataire hors liste blanche fait échouer l'envoi entier. On ne
 * retire pas discrètement le destinataire fautif : un message amputé de la
 * moitié de ses destinataires est pire qu'un message non parti.
 */
export function verifierAutorisation(
  destinataires: string[],
  r: ReglagesEnvoi
): Autorisation {
  if (!r.autorise) {
    return {
      autorise: false,
      raison:
        "envoi désactivé : MAILFLOW_ENVOI_AUTORISE doit valoir exactement « oui »",
    };
  }

  if (destinataires.length === 0) {
    return { autorise: false, raison: "aucun destinataire" };
  }

  if (r.destinatairesAutorises.length === 0) {
    return {
      autorise: false,
      raison:
        "liste blanche vide : renseigner MAILFLOW_DESTINATAIRES_AUTORISES avant d'envoyer",
    };
  }

  const refuses = destinataires.filter((d) => !estAutorise(d, r.destinatairesAutorises));
  if (refuses.length > 0) {
    return {
      autorise: false,
      raison: `hors liste blanche : ${refuses.join(", ")}`,
    };
  }

  return { autorise: true };
}

// ── Composition du message ─────────────────────────────────────────────────

export type Variables = Record<string, string>;

export type ModeleRempli =
  | { complet: true; texte: string }
  | { complet: false; manquantes: string[] };

/**
 * Remplace les `{{variables}}` d'un gabarit.
 *
 * Rend la liste des variables manquantes plutôt qu'un texte troué. C'est le
 * troisième verrou : un modèle incomplet ne part pas.
 */
export function remplirModele(gabarit: string, variables: Variables): ModeleRempli {
  const manquantes = new Set<string>();

  const texte = gabarit.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, cle: string) => {
    const v = variables[cle];
    if (v === undefined || v === "") {
      manquantes.add(cle);
      return "";
    }
    return v;
  });

  if (manquantes.size > 0) {
    return { complet: false, manquantes: [...manquantes].sort() };
  }
  return { complet: true, texte };
}

export type MessageARelancer = {
  sujet: string;
  corps: string;
  destinataires: string[];
  copie: string[];
  /** Identifiant du message d'origine, pour que la réponse reste dans le fil. */
  enReponseA: string | null;
  references: string[];
};

export type PreparationRelance =
  | { pret: true; message: MessageARelancer }
  | { pret: false; raison: string };

/**
 * Compose une relance à partir d'un modèle et d'un échange.
 *
 * Le chaînage est essentiel : sans `In-Reply-To` ni `References`, la réponse
 * du destinataire ne se rattacherait à rien et le système relancerait un
 * dossier déjà traité. C'est la même mécanique que la détection, prise par
 * l'autre bout.
 */
export function preparerRelance(entree: {
  modeleSujet: string;
  modeleCorps: string;
  variables: Variables;
  destinataires: string[];
  copie?: string[];
  identifiantOrigine: string | null;
  referencesOrigine?: string[];
  reglages: ReglagesEnvoi;
}): PreparationRelance {
  const tous = [...entree.destinataires, ...(entree.copie ?? [])];
  const permission = verifierAutorisation(tous, entree.reglages);
  if (!permission.autorise) {
    return { pret: false, raison: permission.raison };
  }

  const sujet = remplirModele(entree.modeleSujet, entree.variables);
  if (!sujet.complet) {
    return {
      pret: false,
      raison: `objet incomplet, variables manquantes : ${sujet.manquantes.join(", ")}`,
    };
  }

  const corps = remplirModele(entree.modeleCorps, entree.variables);
  if (!corps.complet) {
    return {
      pret: false,
      raison: `corps incomplet, variables manquantes : ${corps.manquantes.join(", ")}`,
    };
  }

  // References doit contenir la chaîne d'origine PUIS le message auquel on
  // répond, dans cet ordre. C'est ce que lisent les clients de messagerie
  // pour reconstituer le fil.
  const references = [...(entree.referencesOrigine ?? [])];
  if (entree.identifiantOrigine && !references.includes(entree.identifiantOrigine)) {
    references.push(entree.identifiantOrigine);
  }

  return {
    pret: true,
    message: {
      sujet: sujet.texte,
      corps: corps.texte,
      destinataires: entree.destinataires,
      copie: entree.copie ?? [],
      enReponseA: entree.identifiantOrigine,
      references,
    },
  };
}
