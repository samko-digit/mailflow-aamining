/**
 * MailFlow · Connecteur IMAP
 *
 * Seule partie du système qui parle à un serveur de messagerie. Tout le
 * reste travaille sur le message canonique de `normalisation.ts`, sans
 * savoir d'où il vient. Changer de fournisseur revient à écrire un autre
 * fichier comme celui-ci.
 *
 * ── LECTURE INCRÉMENTALE ──────────────────────────────────────────────────
 *
 * On ne relit jamais toute la boîte. IMAP attribue à chaque message un `UID`
 * croissant, stable dans un dossier donné, et au dossier un `UIDVALIDITY`.
 * On mémorise les deux : tant que `UIDVALIDITY` ne change pas, il suffit de
 * demander les messages dont l'UID dépasse le dernier vu.
 *
 * Si `UIDVALIDITY` change, le serveur a renuméroté : tous les UID mémorisés
 * deviennent faux et il faut repartir de zéro. C'est rare mais prévu.
 *
 * ── LE PIÈGE DU « N:* » ───────────────────────────────────────────────────
 *
 * En mode UID, la plage `100:*` ne rend PAS une liste vide quand aucun
 * message ne dépasse 100 : la norme impose de rendre au moins le dernier
 * message du dossier. Sans filtrage après coup, on retraiterait le même
 * message à chaque passage.
 */

import { ImapFlow, type FetchMessageObject } from "imapflow";

import {
  type Adresse,
  type MessageCanonique,
  apercu,
  calculerCleDeFil,
  estAutomatique,
  estNonRemise,
  extraireIdentifiants,
  normaliserAdresse,
  premierIdentifiant,
} from "./normalisation";

export type ReglagesImap = {
  hote: string;
  port: number;
  securise: boolean;
  utilisateur: string;
  motDePasse: string;
  adresse: string;
  dossierEntrant: string;
  dossierEnvoyes?: string;
};

/**
 * Avancement de la lecture d'une boîte.
 *
 * UN UIDVALIDITY PAR DOSSIER, et ce n'est pas une précaution théorique :
 * l'arrivée et les envoyés sont deux dossiers distincts, avec chacun son
 * compteur, et rien n'oblige les deux nombres à se ressembler. Les confondre
 * fait croire à une renumérotation permanente : la boîte est alors relue en
 * entière à chaque passage, l'alerte de renumérotation crie au loup en
 * continu, et le serveur encaisse des centaines de lectures inutiles par
 * jour.
 */
export type EtatSynchro = {
  uidValiditeEntrant: number;
  dernierUidEntrant: number;
  uidValiditeSortant: number;
  dernierUidSortant: number;
};

export const ETAT_NEUF: EtatSynchro = {
  uidValiditeEntrant: 0,
  dernierUidEntrant: 0,
  uidValiditeSortant: 0,
  dernierUidSortant: 0,
};

export type Lot = {
  messages: MessageCanonique[];
  uidValidity: number;
  dernierUid: number;
  /** Vrai si le serveur a renuméroté : l'état mémorisé était caduc. */
  reinitialise: boolean;
};

/** En-têtes demandés au serveur. Rien de plus : le corps n'est pas chargé. */
const ENTETES = [
  "message-id",
  "in-reply-to",
  "references",
  "subject",
  "return-path",
  "auto-submitted",
  "precedence",
  "x-autoreply",
  "x-autorespond",
  "x-auto-response-suppress",
  "content-type",
  // Marque posée par notre propre expéditeur. Sans elle, la détection
  // prendrait nos relances pour des réponses et clôturerait les échanges.
  "x-mailflow-type",
];

/** Décode un bloc d'en-têtes, repliement RFC 5322 compris. */
export function decoderEntetes(brut: string): Map<string, string> {
  const table = new Map<string, string>();
  const deplie = brut.replace(/\r?\n[ \t]+/g, " ");
  for (const ligne of deplie.split(/\r?\n/)) {
    const i = ligne.indexOf(":");
    if (i <= 0) continue;
    const nom = ligne.slice(0, i).trim().toLowerCase();
    const valeur = ligne.slice(i + 1).trim();
    table.set(nom, table.has(nom) ? `${table.get(nom)} ${valeur}` : valeur);
  }
  return table;
}

function adresses(liste: unknown): Adresse[] {
  if (!Array.isArray(liste)) return [];
  return liste
    .map((a) => {
      const o = a as { address?: string; name?: string };
      return { adresse: normaliserAdresse(o.address), nom: o.name || undefined };
    })
    .filter((a) => a.adresse.length > 0);
}

/** Parcourt l'arborescence MIME et rend la première partie textuelle. */
function trouverPartieTexte(
  noeud: unknown,
  chemin = ""
): { partie: string; type: string; encodage: string; charset: string } | null {
  const n = noeud as {
    type?: string;
    part?: string;
    encoding?: string;
    parameters?: { charset?: string };
    childNodes?: unknown[];
  };
  if (!n) return null;

  const type = (n.type ?? "").toLowerCase();
  const id = n.part ?? chemin;

  if (type === "text/plain" && id) {
    return {
      partie: id,
      type,
      encodage: (n.encoding ?? "7bit").toLowerCase(),
      charset: (n.parameters?.charset ?? "utf-8").toLowerCase(),
    };
  }

  if (Array.isArray(n.childNodes)) {
    for (const enfant of n.childNodes) {
      const t = trouverPartieTexte(enfant);
      if (t) return t;
    }
    // Aucune partie en texte brut : on se rabat sur le HTML.
    for (const enfant of n.childNodes) {
      const e = enfant as { type?: string; part?: string; encoding?: string; parameters?: { charset?: string } };
      if ((e.type ?? "").toLowerCase() === "text/html" && e.part) {
        return {
          partie: e.part,
          type: "text/html",
          encodage: (e.encoding ?? "7bit").toLowerCase(),
          charset: (e.parameters?.charset ?? "utf-8").toLowerCase(),
        };
      }
    }
  }

  if (type === "text/html" && id) {
    return {
      partie: id,
      type,
      encodage: (n.encoding ?? "7bit").toLowerCase(),
      charset: (n.parameters?.charset ?? "utf-8").toLowerCase(),
    };
  }

  return null;
}

/** Liste à plat les pièces jointes déclarées dans l'arborescence MIME. */
function listerPiecesJointes(
  noeud: unknown,
  acc: { nom: string; typeMime: string; taille: number }[] = []
): { nom: string; typeMime: string; taille: number }[] {
  const n = noeud as {
    disposition?: string;
    dispositionParameters?: { filename?: string };
    parameters?: { name?: string };
    type?: string;
    size?: number;
    childNodes?: unknown[];
  };
  if (!n) return acc;

  const disposition = (n.disposition ?? "").toLowerCase();
  const nom = n.dispositionParameters?.filename ?? n.parameters?.name;
  if (disposition === "attachment" || (nom && disposition !== "inline")) {
    acc.push({
      nom: nom ?? "sans-nom",
      typeMime: n.type ?? "application/octet-stream",
      taille: n.size ?? 0,
    });
  }

  for (const enfant of n.childNodes ?? []) listerPiecesJointes(enfant, acc);
  return acc;
}

export class ConnecteurImap {
  private client: ImapFlow | null = null;

  constructor(private readonly r: ReglagesImap) {}

  get adresse(): string {
    return this.r.adresse;
  }

  async ouvrir(): Promise<void> {
    this.client = new ImapFlow({
      host: this.r.hote,
      port: this.r.port,
      secure: this.r.securise,
      auth: { user: this.r.utilisateur, pass: this.r.motDePasse },
      logger: false,
    });
    await this.client.connect();
  }

  async fermer(): Promise<void> {
    if (!this.client) return;
    await this.client.logout().catch(() => {});
    this.client = null;
  }

  private exigerClient(): ImapFlow {
    if (!this.client) {
      throw new Error("Connecteur non ouvert : appeler ouvrir() d'abord.");
    }
    return this.client;
  }

  /** Nom du dossier des envoyés, par son drapeau `\Sent` si non configuré. */
  async dossierEnvoyes(): Promise<string | null> {
    if (this.r.dossierEnvoyes) return this.r.dossierEnvoyes;
    const client = this.exigerClient();
    for (const b of await client.list()) {
      if (b.specialUse === "\\Sent") return b.path;
    }
    return null;
  }

  async listerEntrants(etat: EtatSynchro, limite = 200): Promise<Lot> {
    return this.lister(
      this.r.dossierEntrant,
      "ENTRANT",
      etat.uidValiditeEntrant,
      etat.dernierUidEntrant,
      limite
    );
  }

  async listerSortants(etat: EtatSynchro, limite = 200): Promise<Lot> {
    const dossier = await this.dossierEnvoyes();
    if (!dossier) {
      throw new Error(
        "Dossier des envoyés introuvable. Sans lui, aucune réponse ne sera détectée. " +
          "Renseigner MAILFLOW_DOSSIER_ENVOYES."
      );
    }
    return this.lister(
      dossier,
      "SORTANT",
      etat.uidValiditeSortant,
      etat.dernierUidSortant,
      limite
    );
  }

  private async lister(
    dossier: string,
    sens: "ENTRANT" | "SORTANT",
    uidValiditeConnue: number,
    dernierUid: number,
    limite: number
  ): Promise<Lot> {
    const client = this.exigerClient();
    const boite = await client.mailboxOpen(dossier, { readOnly: true });
    const uidValidity = Number(boite.uidValidity);

    // Le serveur a renuméroté : tout ce qu'on avait mémorisé est faux.
    const reinitialise = uidValiditeConnue !== 0 && uidValiditeConnue !== uidValidity;
    const depuis = reinitialise ? 0 : dernierUid;

    const messages: MessageCanonique[] = [];
    let maxUid = depuis;

    if (boite.exists > 0) {
      // Premier passage sur une boîte : on prend les messages les plus
      // RÉCENTS, pas les plus anciens. Reprendre plusieurs milliers de
      // messages d'historique n'apporte rien et noierait l'écran de
      // qualification dès le premier jour.
      const premierPassage = depuis === 0;
      const plage = premierPassage
        ? `${Math.max(1, boite.exists - limite + 1)}:*` // numéros de séquence
        : `${depuis + 1}:*`; // UID

      for await (const brut of client.fetch(
        plage,
        { uid: true, envelope: true, bodyStructure: true, headers: ENTETES },
        { uid: !premierPassage }
      )) {
        // Le piège documenté en tête de fichier : en mode UID, la plage rend
        // toujours au moins le dernier message, même s'il est antérieur à
        // notre borne. Sans ce filtre, on le retraiterait à chaque passage.
        if (!premierPassage && brut.uid <= depuis) continue;

        messages.push(this.convertir(brut, sens));
        if (brut.uid > maxUid) maxUid = brut.uid;
        if (messages.length >= limite) break;
      }
    }

    messages.sort((a, b) => a.uid - b.uid);
    return { messages, uidValidity, dernierUid: maxUid, reinitialise };
  }

  private convertir(brut: FetchMessageObject, sens: "ENTRANT" | "SORTANT"): MessageCanonique {
    const entetes = decoderEntetes(brut.headers?.toString("utf8") ?? "");

    const identifiant =
      premierIdentifiant(entetes.get("message-id")) ??
      (brut.envelope?.messageId ? brut.envelope.messageId.trim() : "");
    const enReponseA = premierIdentifiant(entetes.get("in-reply-to"));
    const references = extraireIdentifiants(entetes.get("references"));

    const expediteur = adresses(brut.envelope?.from)[0] ?? { adresse: "" };
    const piecesJointes = listerPiecesJointes(brut.bodyStructure);

    return {
      uid: brut.uid,
      identifiant,
      cleDeFil: calculerCleDeFil({ references, enReponseA, identifiant }),
      enReponseA,
      references,
      sens,
      expediteur,
      destinataires: adresses(brut.envelope?.to),
      copie: adresses(brut.envelope?.cc),
      sujet: brut.envelope?.subject ?? "(sans objet)",
      extrait: "",
      // Certains serveurs rendent la date en chaîne plutôt qu'en Date.
      date: brut.envelope?.date ? new Date(brut.envelope.date) : new Date(),
      aPieceJointe: piecesJointes.length > 0,
      piecesJointes,
      estAutomatique: estAutomatique(entetes),
      estNonRemise: estNonRemise(entetes, expediteur.adresse),
      estGenereParMailflow: entetes.has("x-mailflow-type"),
    };
  }

  /**
   * Dépose une copie d'un message envoyé dans le dossier des envoyés.
   *
   * SMTP expédie mais ne range rien. Sans ce dépôt, les relances du système
   * n'apparaîtraient nulle part dans la boîte : personne ne saurait ce qui a
   * été écrit en son nom.
   */
  async deposerDansEnvoyes(brut: Buffer): Promise<boolean> {
    const client = this.exigerClient();
    const dossier = await this.dossierEnvoyes();
    if (!dossier) return false;
    const r = await client.append(dossier, brut, ["\Seen"], new Date());
    return Boolean(r);
  }

  /**
   * Charge un aperçu du corps, et seulement pour les messages retenus.
   *
   * Le corps représente l'essentiel du volume d'une boîte. Le charger à la
   * captation pour tout le monde, y compris pour les notifications qu'on
   * jette aussitôt, multiplierait le trafic par dix sans rien apporter.
   */
  async chargerExtrait(dossier: string, uid: number, octetsMax = 4096): Promise<string> {
    const client = this.exigerClient();
    await client.mailboxOpen(dossier, { readOnly: true });

    let structure: unknown = null;
    for await (const m of client.fetch(`${uid}`, { bodyStructure: true }, { uid: true })) {
      structure = m.bodyStructure;
    }
    const partie = trouverPartieTexte(structure);
    if (!partie) return "";

    const tel = await client
      .download(`${uid}`, partie.partie, { uid: true, maxBytes: octetsMax })
      .catch(() => null);
    if (!tel?.content) return "";

    const morceaux: Buffer[] = [];
    for await (const bloc of tel.content) {
      morceaux.push(Buffer.from(bloc));
      if (Buffer.concat(morceaux).length >= octetsMax) break;
    }
    const donnees = Buffer.concat(morceaux);

    let texte: string;
    if (partie.encodage === "base64") {
      texte = Buffer.from(donnees.toString("ascii"), "base64").toString("utf8");
    } else if (partie.encodage === "quoted-printable") {
      texte = donnees
        .toString("utf8")
        .replace(/=\r?\n/g, "")
        .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    } else {
      texte = donnees.toString(
        /iso-8859|windows-125/.test(partie.charset) ? "latin1" : "utf8"
      );
    }

    // On ne se fie pas au type déclaré. Certains expéditeurs, dont le portail
    // fiscal observé ici, mettent du HTML dans une partie annoncée en texte
    // brut. On détecte donc les balises plutôt que de croire l'en-tête.
    const contientDuHtml = /<(br|p|div|a|span|table|td|tr|html|body)[\s>/]/i.test(
      texte
    );

    if (partie.type === "text/html" || contientDuHtml) {
      texte = texte
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ");
    }

    texte = texte
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#3[49];/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

    return apercu(texte);
  }
}

/** Construit le connecteur à partir du fichier .env. */
export function connecteurDepuisEnv(): ConnecteurImap {
  const exiger = (cle: string): string => {
    const v = process.env[cle];
    if (!v) throw new Error(`Réglage manquant dans .env : ${cle}`);
    return v;
  };

  return new ConnecteurImap({
    hote: exiger("MAILFLOW_IMAP_HOTE"),
    port: Number(process.env.MAILFLOW_IMAP_PORT ?? 993),
    securise: (process.env.MAILFLOW_IMAP_SECURISE ?? "true") !== "false",
    utilisateur: exiger("MAILFLOW_IMAP_UTILISATEUR"),
    motDePasse: exiger("MAILFLOW_IMAP_MOT_DE_PASSE"),
    adresse: exiger("MAILFLOW_BOITE"),
    dossierEntrant: process.env.MAILFLOW_DOSSIER_ENTRANT ?? "INBOX",
    dossierEnvoyes: process.env.MAILFLOW_DOSSIER_ENVOYES,
  });
}
