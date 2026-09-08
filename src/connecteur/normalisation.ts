/**
 * MailFlow · Normalisation des messages
 *
 * Module PUR. Il transforme des en-têtes bruts en un message canonique et
 * décide de ce qu'on garde. Aucun réseau, aucune base : c'est ce qui permet
 * de tester le filtre et le rattachement sans boîte aux lettres.
 *
 * ── LA CLÉ DE FIL, ET POURQUOI ELLE COMPTE ────────────────────────────────
 *
 * IMAP n'a pas d'identifiant de conversation comme Microsoft. On le
 * reconstruit à partir de la norme : la racine de la chaîne `References`,
 * à défaut `In-Reply-To`, à défaut le `Message-ID` du message lui-même.
 *
 * Cette racine est la même pour tous les messages d'un échange, quel que
 * soit le fournisseur de messagerie de chacun. C'est même plus portable que
 * l'identifiant de Microsoft, qui ne vaut qu'à l'intérieur d'une boîte.
 */

export type Adresse = { adresse: string; nom?: string };

export type MessageCanonique = {
  uid: number;
  /** Message-ID, chevrons compris. Vide si le message n'en porte pas. */
  identifiant: string;
  /** Racine du fil, voir l'en-tête de ce fichier. */
  cleDeFil: string;
  enReponseA: string | null;
  references: string[];
  sens: "ENTRANT" | "SORTANT";
  expediteur: Adresse;
  destinataires: Adresse[];
  copie: Adresse[];
  sujet: string;
  extrait: string;
  date: Date;
  aPieceJointe: boolean;
  piecesJointes: { nom: string; typeMime: string; taille: number }[];
  /** Réponse automatique ou absence du bureau : ne vaut jamais réponse. */
  estAutomatique: boolean;
  /** Rapport de non-remise : c'est un incident, pas une réponse. */
  estNonRemise: boolean;
  /**
   * Message produit par MailFlow lui-même, reconnu à son en-tête
   * `X-MailFlow-Type`. Une relance cite le message d'origine et se dépose
   * dans les envoyés : sans ce drapeau, la détection la prendrait pour une
   * réponse du cabinet et fermerait l'échange qu'elle vient de relancer.
   */
  estGenereParMailflow: boolean;
};

export type Exclusion = {
  type: "ADRESSE" | "DOMAINE" | "MOTIF";
  valeur: string;
};

// ── Identifiants ───────────────────────────────────────────────────────────

/** Extrait les identifiants `<...>` d'un en-tête, dans l'ordre d'apparition. */
export function extraireIdentifiants(valeur: string | null | undefined): string[] {
  if (!valeur) return [];
  return (valeur.match(/<[^<>\s]+>/g) ?? []).map((x) => x.trim());
}

/** Premier identifiant d'un en-tête, ou null. */
export function premierIdentifiant(valeur: string | null | undefined): string | null {
  return extraireIdentifiants(valeur)[0] ?? null;
}

/**
 * Racine du fil de conversation.
 *
 * L'ordre compte : `References` est chronologique, son premier élément est le
 * message qui a lancé l'échange. `In-Reply-To` ne désigne que le message
 * immédiatement précédent, il ne sert que si `References` manque.
 */
export function calculerCleDeFil(m: {
  references: string[];
  enReponseA: string | null;
  identifiant: string;
}): string {
  return m.references[0] ?? m.enReponseA ?? m.identifiant;
}

// ── Détection des messages qui ne valent pas réponse ───────────────────────

/**
 * Réponse automatique, absence du bureau, message de service.
 * Fondé sur la RFC 3834 et sur les en-têtes que posent les serveurs courants.
 */
export function estAutomatique(entetes: Map<string, string>): boolean {
  const lire = (n: string) => (entetes.get(n) ?? "").toLowerCase();

  const autoSubmitted = lire("auto-submitted");
  if (autoSubmitted && autoSubmitted !== "no") return true;

  const precedence = lire("precedence");
  if (["bulk", "auto_reply", "junk", "list"].includes(precedence)) return true;

  if (entetes.has("x-autoreply") || entetes.has("x-autorespond")) return true;
  if (lire("x-auto-response-suppress")) return true;

  // Enveloppe de retour vide : convention des messages qui ne se répondent pas.
  if (lire("return-path") === "<>") return true;

  return false;
}

/** Rapport de non-remise. Le courriel n'est pas parti : c'est un incident. */
export function estNonRemise(
  entetes: Map<string, string>,
  expediteur: string
): boolean {
  const typeContenu = (entetes.get("content-type") ?? "").toLowerCase();
  if (typeContenu.includes("report-type=delivery-status")) return true;

  const de = expediteur.toLowerCase();
  if (/^(mailer-daemon|postmaster)@/.test(de)) return true;

  const sujet = (entetes.get("subject") ?? "").toLowerCase();
  if (/^(undeliverable|non remis|delivery status notification|mail delivery failed)/.test(sujet)) {
    return true;
  }

  return false;
}

// ── Filtre d'exclusion ─────────────────────────────────────────────────────

export type Verdict =
  | { garder: true }
  | { garder: false; raison: string };

/**
 * Décide si un message entrant mérite d'entrer dans le registre.
 *
 * C'est le filtre le plus rentable du dispositif : sur une boîte réelle, la
 * grande majorité des messages sont des notifications automatiques. Chaque
 * faux positif écarté ici est une ligne de moins à qualifier à la main.
 *
 * En cas de doute, on GARDE. Le doute ne doit jamais faire perdre un
 * courriel ; c'est l'écran « à qualifier » qui tranchera.
 */
export function filtrerEntrant(
  m: Pick<MessageCanonique, "expediteur" | "sujet" | "estAutomatique" | "estNonRemise">,
  exclusions: Exclusion[],
  domainesInternes: string[] = []
): Verdict {
  const adresse = m.expediteur.adresse.toLowerCase();
  const domaine = adresse.split("@")[1] ?? "";

  // Une non-remise n'entre pas au registre comme un échange : elle sera
  // traitée à part, comme l'incident qu'elle est.
  if (m.estNonRemise) return { garder: false, raison: "rapport de non-remise" };

  if (m.estAutomatique) return { garder: false, raison: "message automatique" };

  if (domainesInternes.some((d) => domaine === d.toLowerCase())) {
    return { garder: false, raison: "expéditeur interne" };
  }

  for (const e of exclusions) {
    if (e.type === "ADRESSE" && adresse === e.valeur.toLowerCase()) {
      return { garder: false, raison: `adresse exclue (${e.valeur})` };
    }
    if (e.type === "DOMAINE" && domaine === e.valeur.toLowerCase().replace(/^@/, "")) {
      return { garder: false, raison: `domaine exclu (${e.valeur})` };
    }
    if (e.type === "MOTIF") {
      let motif: RegExp;
      try {
        motif = new RegExp(e.valeur, "i");
      } catch {
        // Un motif mal écrit ne doit pas faire perdre le message.
        continue;
      }
      if (motif.test(adresse) || motif.test(m.sujet)) {
        return { garder: false, raison: `motif exclu (${e.valeur})` };
      }
    }
  }

  return { garder: true };
}

// ── Rattachement d'une réponse ─────────────────────────────────────────────

/**
 * Cherche, parmi les identifiants cités par un message sortant, le premier
 * qui corresponde à un message connu.
 *
 * On parcourt `In-Reply-To` d'abord, puis `References` de la fin vers le
 * début : le message cité en dernier est le plus proche dans le fil, donc
 * le plus pertinent.
 */
export function rattacher(
  sortant: Pick<MessageCanonique, "enReponseA" | "references">,
  connus: ReadonlySet<string>
): string | null {
  if (sortant.enReponseA && connus.has(sortant.enReponseA)) {
    return sortant.enReponseA;
  }
  for (let i = sortant.references.length - 1; i >= 0; i--) {
    const r = sortant.references[i]!;
    if (connus.has(r)) return r;
  }
  return null;
}

// ── Outils de mise en forme ────────────────────────────────────────────────

/** Réduit un corps de message à un aperçu d'une ligne. */
export function apercu(texte: string, longueur = 220): string {
  const propre = texte
    .replace(/\r/g, "")
    .replace(/^>.*$/gm, "") // citations
    .replace(/\s+/g, " ")
    .trim();
  return propre.length > longueur ? propre.slice(0, longueur - 1) + "…" : propre;
}

/** Normalise une adresse pour comparaison et stockage. */
export function normaliserAdresse(a: string | null | undefined): string {
  return (a ?? "").trim().toLowerCase();
}
