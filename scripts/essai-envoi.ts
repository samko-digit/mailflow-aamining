/**
 * MailFlow · Essai d'envoi contrôlé
 *
 *   npm run envoi:essai
 *
 * Envoie UN message d'essai, et un seul, vers un destinataire de la liste
 * blanche. Puis vérifie qu'il est bien arrivé dans le dossier des envoyés et
 * qu'il porte la marque qui empêche la détection de le prendre pour une
 * réponse.
 *
 * Sans autorisation explicite, le script explique ce qui manque et n'envoie
 * rien. C'est le comportement attendu au premier lancement.
 */

import "dotenv/config";

import { Expediteur, reglagesSmtpDepuisEnv, ENTETE_ORIGINE } from "../src/connecteur/envoi";
import { reglagesDepuisEnv } from "../src/connecteur/garde-envoi";
import { connecteurDepuisEnv, decoderEntetes } from "../src/connecteur/imap";

const V = "\x1b[32m";
const J = "\x1b[33m";
const R = "\x1b[31m";
const G = "\x1b[90m";
const F = "\x1b[0m";

const ok = (m: string) => console.log(`${V}  OK${F}    ${m}`);
const ko = (m: string) => console.log(`${R}  ÉCHEC${F} ${m}`);
const att = (m: string) => console.log(`${J}  ⚠${F}    ${m}`);
const info = (m: string) => console.log(`${G}        ${m}${F}`);
const titre = (m: string) => console.log(`\n${m}`);

async function main() {
  console.log("MailFlow · essai d'envoi contrôlé\n");

  // ── 1. État des verrous ─────────────────────────────────────────────────
  titre("1. Les trois verrous");

  const garde = reglagesDepuisEnv();

  if (garde.autorise) {
    ok("Verrou 1 · envoi autorisé");
  } else {
    ko("Verrou 1 · envoi désactivé");
    info('Poser MAILFLOW_ENVOI_AUTORISE="oui" dans .env, exactement ce mot.');
  }

  if (garde.destinatairesAutorises.length > 0) {
    ok(`Verrou 2 · liste blanche : ${garde.destinatairesAutorises.join(", ")}`);
  } else {
    ko("Verrou 2 · liste blanche vide");
    info('Poser MAILFLOW_DESTINATAIRES_AUTORISES="votre.adresse@exemple.com"');
    info("Une entrée peut être une adresse complète ou un domaine, comme @exemple.com.");
  }

  const cible = garde.destinatairesAutorises.find((d) => !d.startsWith("@"));
  if (!cible && garde.destinatairesAutorises.length > 0) {
    ko("La liste blanche ne contient que des domaines : il me faut une adresse précise.");
    info('Ajouter une adresse complète, par exemple "vous@samko.group".');
  }

  if (!garde.autorise || !cible) {
    console.log(
      `\n${J}Rien n'a été envoyé. C'est le comportement voulu tant que les verrous sont fermés.${F}`
    );
    process.exitCode = 1;
    return;
  }

  // ── 2. Connexion SMTP ───────────────────────────────────────────────────
  titre("2. Connexion au serveur d'envoi");

  const smtp = reglagesSmtpDepuisEnv();
  info(`${smtp.hote}:${smtp.port} · ${smtp.securise ? "TLS direct" : "STARTTLS"}`);

  const imap = connecteurDepuisEnv();
  await imap.ouvrir();
  const expediteur = new Expediteur(smtp, garde, imap);

  try {
    await expediteur.ouvrir();
    ok(`Authentifié comme ${smtp.expediteur}`);

    // ── 3. L'envoi ────────────────────────────────────────────────────────
    titre("3. Envoi du message d'essai");

    const marqueur = `essai-${Date.now()}`;
    const origineFictive = `<origine-${marqueur}@essai.mailflow>`;

    const resultat = await expediteur.envoyer({
      destinataires: [cible],
      sujet: `MailFlow · essai d'envoi ${marqueur}`,
      corps: [
        "Ceci est un message d'essai envoyé par MailFlow.",
        "",
        "Il sert à vérifier trois choses :",
        "  1. que l'envoi SMTP fonctionne,",
        "  2. qu'une copie se dépose bien dans le dossier des envoyés,",
        "  3. qu'il porte la marque qui empêche le système de le prendre",
        "     pour une réponse d'un correspondant.",
        "",
        "Aucune action n'est attendue de votre part.",
      ].join("\n"),
      // On simule un fil pour vérifier que le chaînage est bien posé.
      enReponseA: origineFictive,
      references: [origineFictive],
      type: "essai",
    });

    if (!resultat.envoye) {
      ko(`Envoi refusé : ${resultat.raison}`);
      process.exitCode = 1;
      return;
    }

    ok(`Message envoyé à ${cible}`);
    info(`identifiant : ${resultat.identifiant}`);

    if (resultat.deposeDansEnvoyes) {
      ok("Copie déposée dans le dossier des envoyés");
    } else {
      att("La copie n'a pas pu être déposée dans les envoyés.");
      info("Le message est bien parti, mais il n'apparaîtra pas dans la boîte.");
    }

    // ── 4. Vérification sur le serveur ────────────────────────────────────
    titre("4. Vérification dans le dossier des envoyés");

    const dossier = await imap.dossierEnvoyes();
    if (!dossier) {
      ko("Dossier des envoyés introuvable, vérification impossible.");
      return;
    }

    // On relit le tout dernier message du dossier.
    const lot = await imap.listerSortants(
      {
        uidValiditeEntrant: 0,
        dernierUidEntrant: 0,
        uidValiditeSortant: 0,
        dernierUidSortant: 0,
      },
      5
    );
    const notre = lot.messages.find((m) => m.identifiant === resultat.identifiant);

    if (!notre) {
      att("Le message n'a pas encore été retrouvé dans les envoyés.");
      info("Certains serveurs mettent quelques secondes. Relancez la vérification.");
      return;
    }

    ok(`Retrouvé dans « ${dossier} », UID ${notre.uid}`);

    if (notre.estGenereParMailflow) {
      ok(`Porte l'en-tête ${ENTETE_ORIGINE} : la détection l'ignorera.`);
      info("C'est ce qui empêche une relance de clôturer l'échange qu'elle relance.");
    } else {
      ko(`L'en-tête ${ENTETE_ORIGINE} est absent après aller-retour serveur.`);
      info("→ Danger : le système prendrait ses propres relances pour des réponses.");
      process.exitCode = 1;
    }

    if (notre.enReponseA === origineFictive) {
      ok("Le chaînage In-Reply-To a survécu au serveur.");
    } else {
      att(`In-Reply-To attendu ${origineFictive}, obtenu ${notre.enReponseA ?? "aucun"}`);
    }
  } finally {
    await expediteur.fermer();
    await imap.fermer();
  }

  console.log(
    `\n${V}Envoi opérationnel. Le moteur de relance peut être branché dessus.${F}`
  );
}

main().catch((e) => {
  console.error(`\n${R}Erreur :${F}`, e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
