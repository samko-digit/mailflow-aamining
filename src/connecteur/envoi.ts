/**
 * MailFlow · Envoi SMTP
 *
 * Seule partie du système qui fait sortir un message. Elle ne décide de
 * rien : `garde-envoi.ts` a déjà tranché, elle exécute et vérifie une
 * seconde fois.
 *
 * ── LE PIÈGE DE LA BOUCLE ─────────────────────────────────────────────────
 *
 * Une relance cite le message d'origine dans `In-Reply-To`, et une copie est
 * déposée dans le dossier des envoyés. Or la détection des réponses cherche
 * précisément, dans ce dossier, les messages qui citent un message connu.
 *
 * Sans précaution, le système détecterait sa propre relance comme une
 * réponse du cabinet, clôturerait l'échange et arrêterait les relances
 * suivantes. Chaque première relance fermerait le dossier.
 *
 * D'où l'en-tête `X-MailFlow-Type` posé ici et lu par la détection, qui
 * ignore tout message qui le porte.
 *
 * ── POURQUOI DÉPOSER UNE COPIE DANS LES ENVOYÉS ───────────────────────────
 *
 * SMTP expédie, il ne range rien. Sans dépôt explicite, les relances
 * n'apparaîtraient nulle part dans la boîte : ni Barema ni Madame ne
 * sauraient ce que le système a écrit en leur nom. Inacceptable.
 */

import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";

import {
  type ReglagesEnvoi,
  reglagesDepuisEnv,
  verifierAutorisation,
} from "./garde-envoi";
import type { ConnecteurImap } from "./imap";

/** Marque nos propres messages, pour que la détection ne s'y trompe pas. */
export const ENTETE_ORIGINE = "X-MailFlow-Type";

export type TypeSortant = "relance" | "escalade" | "alerte" | "essai";

export type MessageASortir = {
  destinataires: string[];
  copie?: string[];
  sujet: string;
  corps: string;
  enReponseA?: string | null;
  references?: string[];
  type: TypeSortant;
};

/**
 * L'échec d'un envoi appartient à deux mondes qu'il ne faut pas confondre.
 *
 *   refus · un garde-fou dit non. Rien ne partira tant qu'un humain n'aura
 *           rien changé. Réessayer est inutile.
 *   panne · le serveur ne répond pas, ou rejette. Réessayer a un sens.
 *
 * La nature est portée par le type plutôt que devinée sur le libellé : une
 * reformulation du message ne doit pas transformer une panne en refus, ni
 * l'inverse.
 */
export type ResultatEnvoi =
  | { envoye: true; identifiant: string; deposeDansEnvoyes: boolean }
  | { envoye: false; nature: "refus" | "panne"; raison: string };

export type ReglagesSmtp = {
  hote: string;
  port: number;
  securise: boolean;
  utilisateur: string;
  motDePasse: string;
  expediteur: string;
  nomExpediteur: string;
};

export function reglagesSmtpDepuisEnv(): ReglagesSmtp {
  const exiger = (cle: string): string => {
    const v = process.env[cle];
    if (!v) throw new Error(`Réglage manquant dans .env : ${cle}`);
    return v;
  };

  const port = Number(process.env.MAILFLOW_SMTP_PORT ?? 465);
  return {
    hote: exiger("MAILFLOW_SMTP_HOTE"),
    port,
    // 465 est chiffré de bout en bout, 587 démarre en clair puis passe en TLS.
    securise: (process.env.MAILFLOW_SMTP_SECURISE ?? String(port === 465)) !== "false",
    utilisateur:
      process.env.MAILFLOW_SMTP_UTILISATEUR ?? exiger("MAILFLOW_IMAP_UTILISATEUR"),
    motDePasse:
      process.env.MAILFLOW_SMTP_MOT_DE_PASSE ?? exiger("MAILFLOW_IMAP_MOT_DE_PASSE"),
    expediteur: exiger("MAILFLOW_BOITE"),
    nomExpediteur: process.env.MAILFLOW_NOM_EXPEDITEUR ?? "MailFlow",
  };
}

export class Expediteur {
  private transport: Transporter | null = null;

  constructor(
    private readonly smtp: ReglagesSmtp,
    private readonly reglages: ReglagesEnvoi = reglagesDepuisEnv(),
    /** Facultatif : sert à déposer une copie dans le dossier des envoyés. */
    private readonly imap?: ConnecteurImap
  ) {}

  async ouvrir(): Promise<void> {
    this.transport = nodemailer.createTransport({
      host: this.smtp.hote,
      port: this.smtp.port,
      secure: this.smtp.securise,
      auth: { user: this.smtp.utilisateur, pass: this.smtp.motDePasse },
    });
    await this.transport.verify();
  }

  async fermer(): Promise<void> {
    this.transport?.close();
    this.transport = null;
  }

  /**
   * Envoie un message.
   *
   * Les garde-fous sont revérifiés ici même si l'appelant les a déjà passés.
   * Cette redondance est volontaire : c'est le dernier point avant la sortie,
   * et un appelant futur pourrait oublier de vérifier.
   */
  async envoyer(m: MessageASortir): Promise<ResultatEnvoi> {
    const tous = [...m.destinataires, ...(m.copie ?? [])];
    const permission = verifierAutorisation(tous, this.reglages);
    if (!permission.autorise) {
      return { envoye: false, nature: "refus", raison: permission.raison };
    }

    if (!this.transport) {
      return {
        envoye: false,
        nature: "panne",
        raison: "expéditeur non ouvert : appeler ouvrir()",
      };
    }

    // On fabrique l'identifiant plutôt que de le laisser à la bibliothèque :
    // il est ainsi connu avant l'envoi, donc enregistrable même si la suite
    // échoue, et reconnaissable comme venant de nous.
    const domaine = this.smtp.expediteur.split("@")[1] ?? "mailflow.local";
    const identifiant = `<mailflow-${randomUUID()}@${domaine}>`;

    const enTetes: Record<string, string> = {
      [ENTETE_ORIGINE]: m.type,
      // RFC 3834 : prévient les répondeurs automatiques de ne pas répondre.
      "Auto-Submitted": "auto-generated",
    };
    if (m.enReponseA) enTetes["In-Reply-To"] = m.enReponseA;
    if (m.references?.length) enTetes["References"] = m.references.join(" ");

    const composition = {
      from: { name: this.smtp.nomExpediteur, address: this.smtp.expediteur },
      to: m.destinataires,
      cc: m.copie?.length ? m.copie : undefined,
      subject: m.sujet,
      text: m.corps,
      messageId: identifiant,
      headers: enTetes,
    };

    // On construit le message une seule fois : les mêmes octets partent en
    // SMTP et sont déposés dans les envoyés, donc les deux copies portent
    // rigoureusement le même identifiant.
    const brut = await new MailComposer(composition).compile().build();

    try {
      await this.transport.sendMail({
        envelope: { from: this.smtp.expediteur, to: tous },
        raw: brut,
      });
    } catch (e) {
      return {
        envoye: false,
        nature: "panne",
        raison: `SMTP a refusé : ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    let depose = false;
    if (this.imap) {
      depose = await this.imap.deposerDansEnvoyes(brut).catch(() => false);
    }

    return { envoye: true, identifiant, deposeDansEnvoyes: depose };
  }
}
