/**
 * MailFlow · Épreuve de bout en bout du moteur
 *
 *   npm run moteur:essai              monte le dossier d'essai, relance, vérifie
 *   npm run moteur:essai -- --nettoyer  efface le dossier d'essai et s'arrête
 *
 * Le dernier maillon du dispositif est aussi le plus difficile à croire sur
 * parole : le moteur envoie-t-il vraiment, et surtout ne se prend-il pas pour
 * son propre correspondant ? Ce script le démontre au lieu de l'affirmer.
 *
 *   1. Il fabrique un dossier d'essai dont le responsable est une adresse de
 *      la liste blanche, avec une échéance déjà dépassée.
 *   2. Il fait tourner un cycle. Une relance doit partir.
 *   3. Il relit la boîte. La relance vient d'atterrir dans les envoyés, en
 *      citant le message d'origine : c'est exactement le profil d'une réponse.
 *      Le dossier doit malgré tout rester en attente.
 *
 * La troisième étape est celle qui compte. Sans la marque `X-MailFlow-Type`,
 * chaque première relance clôturerait le dossier qu'elle relance, et le
 * dispositif entier n'enverrait jamais qu'un seul rappel par affaire, sans
 * que rien ne paraisse cassé.
 *
 * Le script n'écrit QUE sur son propre dossier d'essai, reconnaissable à son
 * correspondant `essai-moteur@mailflow.invalid`, et n'envoie qu'aux adresses
 * de la liste blanche. Il refuse de tourner si les verrous sont fermés.
 */

import "dotenv/config";

import { reglagesDepuisEnv } from "../src/connecteur/garde-envoi";
import { connecteurDepuisEnv } from "../src/connecteur/imap";
import { capter } from "../src/donnees/captation";
import { executerCycle } from "../src/moteur/ordonnanceur";
import { prisma } from "../src/lib/prisma";

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

/** Marqueur du dossier d'essai. Rien d'autre ne porte cette adresse. */
const CORRESPONDANT_ESSAI = "essai-moteur@mailflow.invalid";

let echecs = 0;
const verifier = (condition: boolean, vrai: string, faux: string) => {
  if (condition) ok(vrai);
  else {
    ko(faux);
    echecs++;
  }
};

async function nettoyer(): Promise<number> {
  const c = await prisma.correspondant.findUnique({
    where: { email: CORRESPONDANT_ESSAI },
    select: { id: true },
  });
  if (!c) return 0;

  // Les messages, relances, travaux et événements suivent l'échange en
  // cascade ; seul le correspondant doit être retiré à la main.
  const { count } = await prisma.echange.deleteMany({ where: { correspondantId: c.id } });
  await prisma.correspondant.delete({ where: { id: c.id } });
  return count;
}

async function main() {
  console.log("MailFlow · épreuve de bout en bout du moteur\n");

  if (process.argv.includes("--nettoyer")) {
    const n = await nettoyer();
    console.log(`${n} dossier(s) d'essai effacé(s).`);
    return;
  }

  // ── 1. Les verrous ──────────────────────────────────────────────────────
  titre("1. Les verrous");

  const garde = reglagesDepuisEnv();
  const cible = garde.destinatairesAutorises.find((d) => !d.startsWith("@"));

  if (!garde.autorise || !cible) {
    ko("Envoi fermé : l'épreuve ne peut pas avoir lieu.");
    info('Il faut MAILFLOW_ENVOI_AUTORISE="oui" et une adresse complète dans');
    info("MAILFLOW_DESTINATAIRES_AUTORISES. C'est volontairement contraignant.");
    process.exitCode = 1;
    return;
  }
  ok(`Envoi autorisé vers ${cible}`);

  const adresseBoite = (process.env.MAILFLOW_BOITE ?? "").trim();
  const boite = await prisma.boiteSuivie.findUnique({
    where: { adresse: adresseBoite },
    select: { id: true },
  });
  if (!boite) {
    ko(`La boîte ${adresseBoite || "(non configurée)"} n'est pas au registre.`);
    info("Lancer npm run capter une première fois.");
    process.exitCode = 1;
    return;
  }
  ok(`Boîte suivie : ${adresseBoite}`);

  // ── 2. Le dossier d'essai ───────────────────────────────────────────────
  titre("2. Montage du dossier d'essai");

  await nettoyer();

  const responsable = await prisma.utilisateur.upsert({
    where: { email: cible },
    update: { actif: true },
    create: {
      email: cible,
      nomComplet: "Destinataire d'essai",
      initiales: "DE",
      role: "GESTIONNAIRE",
    },
    select: { id: true, nomComplet: true },
  });
  ok(`Responsable : ${responsable.nomComplet} <${cible}>`);

  const categorie = await prisma.categorie.findFirst({
    where: { actif: true, regles: { some: { ordre: 1, actif: true } } },
    select: { id: true, libelle: true },
  });
  if (!categorie) {
    ko("Aucune catégorie active avec une règle de rang 1. Lancer npm run db:seed.");
    process.exitCode = 1;
    return;
  }
  ok(`Catégorie : ${categorie.libelle}`);

  const correspondant = await prisma.correspondant.create({
    data: {
      email: CORRESPONDANT_ESSAI,
      nom: "Correspondant d'essai",
      organisation: "Épreuve MailFlow",
      type: "AUTRE",
    },
    select: { id: true },
  });

  const hier = new Date(Date.now() - 24 * 3_600_000);
  const identifiantOrigine = `<essai-moteur-${Date.now()}@mailflow.invalid>`;

  const echange = await prisma.echange.create({
    data: {
      boiteId: boite.id,
      conversationId: identifiantOrigine,
      sujet: "Épreuve du moteur de relance",
      extrait: "Dossier fabriqué par npm run moteur:essai.",
      correspondantId: correspondant.id,
      categorieId: categorie.id,
      responsableId: responsable.id,
      statut: "EN_ATTENTE",
      recuLe: hier,
      echeance: hier,
      messages: {
        create: {
          boiteId: boite.id,
          internetMessageId: identifiantOrigine,
          sens: "ENTRANT",
          expediteur: CORRESPONDANT_ESSAI,
          destinataires: [adresseBoite],
          sujet: "Épreuve du moteur de relance",
          dateMessage: hier,
        },
      },
      travaux: {
        create: {
          type: "RELANCE",
          executerA: new Date(Date.now() - 60_000),
          charge: { ordre: 1 },
          cleIdempotence: `essai-relance-${Date.now()}`,
        },
      },
    },
    select: { id: true, numero: true },
  });
  ok(`Échange n° ${echange.numero}, échéance dépassée depuis hier`);

  // ── 3. Le cycle ─────────────────────────────────────────────────────────
  titre("3. Un passage du moteur");

  const rapport = await executerCycle({ limite: 30 });
  for (const l of rapport.lignes) info(l);

  const apres = await prisma.echange.findUniqueOrThrow({
    where: { id: echange.id },
    select: {
      statut: true,
      nbRelances: true,
      prochaineRelanceLe: true,
      relances: { select: { ordre: true, messageIdEnvoye: true, destinataire: { select: { email: true } } } },
    },
  });

  verifier(
    apres.nbRelances === 1,
    "Une relance a été comptée",
    `Aucune relance comptée (nbRelances = ${apres.nbRelances}). Voir les lignes ci-dessus.`
  );

  if (apres.nbRelances !== 1) {
    console.log(
      `\n${J}L'épreuve s'arrête ici : sans relance envoyée, il n'y a rien à vérifier ensuite.${F}`
    );
    process.exitCode = 1;
    return;
  }

  const relance = apres.relances[0];
  verifier(
    relance.destinataire.email === cible,
    `Adressée à ${relance.destinataire.email}`,
    `Adressée à ${relance.destinataire.email}, or on attendait ${cible}`
  );
  verifier(
    !!relance.messageIdEnvoye,
    `Message-ID conservé : ${relance.messageIdEnvoye}`,
    "Aucun Message-ID enregistré : impossible de prouver ce qui est parti."
  );
  verifier(
    apres.statut === "RELANCE",
    "Le dossier est passé en RELANCE",
    `Le dossier est en ${apres.statut}`
  );
  verifier(
    apres.prochaineRelanceLe !== null,
    "La suite est planifiée",
    "Aucune suite planifiée : le dossier s'arrêterait là."
  );

  // ── 4. Le piège de la boucle ────────────────────────────────────────────
  titre("4. La relance ne doit pas passer pour une réponse");
  info("La copie vient d'arriver dans les envoyés, en citant le message d'origine.");
  info("C'est le profil exact d'une réponse. Le dossier doit tenir bon.");

  const connecteur = connecteurDepuisEnv();
  await connecteur.ouvrir();
  let relu;
  try {
    relu = await capter(connecteur, { limite: 50, chargerExtraits: false });
  } finally {
    await connecteur.fermer();
  }

  info(`${relu.sortantsLus} message(s) sortant(s) relu(s), ${relu.reponsesDetectees} réponse(s) détectée(s)`);

  const final = await prisma.echange.findUniqueOrThrow({
    where: { id: echange.id },
    select: { statut: true, reponduLe: true },
  });

  verifier(
    final.statut === "RELANCE" && final.reponduLe === null,
    "Le dossier est resté en RELANCE : la relance ne s'est pas prise pour une réponse",
    `Le dossier est passé en ${final.statut} : LA RELANCE S'EST CLÔTURÉE ELLE-MÊME.`
  );

  if (relu.sortantsLus === 0) {
    att("Aucun sortant relu : le serveur n'avait pas encore rangé la copie.");
    info("La démonstration est incomplète. Relancer dans une minute.");
  }

  // ── 5. Bilan ────────────────────────────────────────────────────────────
  titre("5. Bilan");

  if (echecs === 0) {
    console.log(`${V}Le moteur envoie, enregistre, et ne se répond pas à lui-même.${F}`);
    info(`Un message est parti vers ${cible}. Il est légitime : c'est l'épreuve.`);
    info("Effacer le dossier d'essai : npm run moteur:essai -- --nettoyer");
  } else {
    console.log(`${R}${echecs} vérification(s) en échec.${F}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(`\n${R}Épreuve interrompue :${F}`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
