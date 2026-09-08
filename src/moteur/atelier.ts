/**
 * MailFlow · Atelier d'un cycle
 *
 * Les connexions à la messagerie, ouvertes au plus tard et refermées à coup
 * sûr. Un cycle qui n'a rien à envoyer et rien à lire ne doit pas ouvrir de
 * session IMAP ni de session SMTP : le moteur passe toutes les cinq minutes,
 * cela ferait près de six cents connexions par jour pour rien, et les
 * hébergeurs mutualisés plafonnent les sessions simultanées.
 *
 * L'atelier sert aussi à PARTAGER une seule session IMAP entre la captation
 * et le dépôt des relances dans le dossier des envoyés, pour la même raison.
 *
 * ── LA DISTINCTION QUI GOUVERNE TOUT LE RESTE ─────────────────────────────
 *
 * Un envoi qui n'a pas lieu relève de deux mondes qu'il ne faut jamais
 * confondre :
 *
 *   REFUS  · un garde-fou dit non. L'envoi est désactivé, le destinataire
 *            n'est pas sur la liste blanche, le modèle est incomplet, SMTP
 *            n'est pas configuré. Rien ne partira tant qu'un humain n'aura
 *            rien changé. Ce n'est PAS une panne : compter des tentatives et
 *            finir en échec définitif ferait perdre le travail, alors que
 *            l'installation fonctionne exactement comme on le lui demande.
 *
 *   PANNE  · le serveur ne répond pas, l'authentification casse, le réseau
 *            tombe. Là, réessayer a un sens, avec la temporisation croissante
 *            et l'échec définitif au bout.
 *
 * Confondre les deux donne l'un ou l'autre de ces deux systèmes : celui qui
 * jette ses relances à la poubelle parce qu'on ne lui a pas encore donné le
 * feu vert, ou celui qui réessaie indéfiniment une adresse interdite.
 */

import {
  Expediteur,
  type MessageASortir,
  reglagesSmtpDepuisEnv,
} from "../connecteur/envoi";
import { reglagesDepuisEnv } from "../connecteur/garde-envoi";
import { ConnecteurImap, connecteurDepuisEnv } from "../connecteur/imap";

export type Issue =
  | { sorti: true; identifiant: string; depose: boolean }
  | { sorti: false; nature: "refus" | "panne"; raison: string };

/** Préfixe des motifs de refus, reconnu par la surveillance. */
export const PREFIXE_REFUS = "envoi refusé · ";

export class Atelier {
  private imap: ConnecteurImap | null = null;
  private imapEchec: string | null = null;

  private smtp: Expediteur | null = null;
  private smtpEtat: "neuf" | "pret" | "refus" | "panne" = "neuf";
  private smtpRaison = "";

  /** Vrai si le cycle a réellement eu besoin d'ouvrir quelque chose. */
  get aOuvertQuelqueChose(): boolean {
    return this.imap !== null || this.smtp !== null;
  }

  /**
   * Session IMAP partagée du cycle. Rend `null` si elle ne s'ouvre pas ;
   * l'appelant décide si c'est bloquant pour lui. Ce l'est pour la captation,
   * ce ne l'est pas pour le dépôt d'une copie dans les envoyés.
   */
  async connecteur(): Promise<ConnecteurImap | null> {
    if (this.imap) return this.imap;
    if (this.imapEchec) return null;

    try {
      const c = connecteurDepuisEnv();
      await c.ouvrir();
      this.imap = c;
      return c;
    } catch (e) {
      this.imapEchec = e instanceof Error ? e.message : String(e);
      return null;
    }
  }

  /** Motif du dernier échec d'ouverture IMAP, pour le rapport. */
  get raisonImap(): string | null {
    return this.imapEchec;
  }

  private async expediteur(): Promise<
    { pret: true; e: Expediteur } | { pret: false; nature: "refus" | "panne"; raison: string }
  > {
    if (this.smtpEtat === "pret" && this.smtp) return { pret: true, e: this.smtp };
    if (this.smtpEtat === "refus" || this.smtpEtat === "panne") {
      return { pret: false, nature: this.smtpEtat, raison: this.smtpRaison };
    }

    // Réglages absents du .env : configuration incomplète, donc un refus.
    let reglages;
    try {
      reglages = reglagesSmtpDepuisEnv();
    } catch (e) {
      this.smtpEtat = "refus";
      this.smtpRaison = e instanceof Error ? e.message : String(e);
      return { pret: false, nature: "refus", raison: this.smtpRaison };
    }

    // Le dépôt de la copie est un confort, pas une condition : on ouvre IMAP
    // s'il veut bien s'ouvrir, et on envoie quand même sinon.
    const imap = (await this.connecteur()) ?? undefined;
    const e = new Expediteur(reglages, reglagesDepuisEnv(), imap);

    try {
      await e.ouvrir();
    } catch (err) {
      this.smtpEtat = "panne";
      this.smtpRaison = err instanceof Error ? err.message : String(err);
      return { pret: false, nature: "panne", raison: this.smtpRaison };
    }

    this.smtp = e;
    this.smtpEtat = "pret";
    return { pret: true, e };
  }

  /**
   * Fait sortir un message.
   *
   * L'ouverture n'est tentée qu'une fois par cycle : si le serveur est
   * injoignable, les vingt travaux du cycle ne rejouent pas vingt fois la
   * même attente de connexion.
   */
  async envoyer(m: MessageASortir): Promise<Issue> {
    const exp = await this.expediteur();
    if (!exp.pret) return { sorti: false, nature: exp.nature, raison: exp.raison };

    const r = await exp.e.envoyer(m);
    if (!r.envoye) {
      return { sorti: false, nature: r.nature, raison: r.raison };
    }

    return {
      sorti: true,
      identifiant: r.identifiant,
      depose: r.deposeDansEnvoyes,
    };
  }

  /** Referme tout ce qui a été ouvert. Ne lève jamais. */
  async fermer(): Promise<void> {
    await this.smtp?.fermer().catch(() => undefined);
    await this.imap?.fermer().catch(() => undefined);
    this.smtp = null;
    this.imap = null;
  }
}
