/**
 * MailFlow · Captation des courriels
 *
 *   npm run capter                 un passage, 50 messages au plus
 *   npm run capter -- --limite=200 un passage plus large
 *   npm run capter -- --reinit     repart de zéro sur cette boîte
 *
 * Ce script est en LECTURE SEULE sur la messagerie : il ne marque rien comme
 * lu, ne déplace rien, ne supprime rien. Il copie et il classe.
 *
 * Il n'envoie aucun message non plus. L'envoi viendra avec le moteur de
 * relance, et sous condition explicite.
 */

import "dotenv/config";

import { connecteurDepuisEnv } from "../src/connecteur/imap";
import { capter } from "../src/donnees/captation";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const aOption = (n: string) => args.includes(`--${n}`);
const valeur = (n: string, defaut: number) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  const v = a ? Number(a.split("=")[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : defaut;
};

const V = "\x1b[32m";
const J = "\x1b[33m";
const R = "\x1b[31m";
const G = "\x1b[90m";
const F = "\x1b[0m";

async function main() {
  const adresse = process.env.MAILFLOW_BOITE;
  if (!adresse) throw new Error("MAILFLOW_BOITE absente du fichier .env.");

  // La boîte doit exister au registre : on la crée au premier lancement.
  const boite = await prisma.boiteSuivie.upsert({
    where: { adresse },
    update: { actif: true },
    create: {
      adresse,
      libelle: `Boîte suivie ${adresse}`,
      fournisseur: "IMAP",
      actif: true,
    },
  });

  if (aOption("reinit")) {
    await prisma.boiteSuivie.update({
      where: { id: boite.id },
      data: { jetonDelta: null },
    });
    console.log(`${J}Avancement remis à zéro pour ${adresse}.${F}\n`);
  }

  const connecteur = connecteurDepuisEnv();
  console.log(`Connexion à ${adresse}…`);
  await connecteur.ouvrir();

  try {
    const r = await capter(connecteur, { limite: valeur("limite", 50) });

    console.log(`\n${r.boite}`);
    if (r.reinitialise) {
      console.log(`${J}  Le serveur a renuméroté : relecture depuis le début.${F}`);
    }

    console.log(`\n  Entrants lus        ${r.entrantsLus}`);
    console.log(`${V}  Retenus             ${r.retenus}${F}`);
    console.log(`${G}  Écartés             ${r.ecartes}${F}`);
    for (const [raison, n] of r.raisonsEcart) {
      console.log(`${G}      ${String(n).padStart(4)} · ${raison}${F}`);
    }
    console.log(`\n  Échanges créés      ${r.echangesCrees}`);
    console.log(`  Messages ajoutés    ${r.messagesAjoutes}`);
    console.log(`  Sortants lus        ${r.sortantsLus}`);
    console.log(
      `${r.reponsesDetectees > 0 ? V : ""}  Réponses détectées  ${r.reponsesDetectees}${F}`
    );

    if (r.incidents.length > 0) {
      console.log(`\n${R}  Incidents :${F}`);
      for (const i of r.incidents) console.log(`${R}      ${i}${F}`);
    }

    if (r.lignes.length > 0) {
      console.log("\n  Détail :");
      for (const l of r.lignes.slice(0, 25)) console.log(`      ${l}`);
      if (r.lignes.length > 25) {
        console.log(`      … et ${r.lignes.length - 25} de plus`);
      }
    }

    const taux =
      r.entrantsLus > 0 ? Math.round((r.ecartes / r.entrantsLus) * 100) : 0;
    console.log(
      `\n${G}  ${taux} % du courrier lu a été écarté par le filtre.${F}`
    );
    console.log(
      `${G}  Ajustez la liste d'exclusion si ce taux vous paraît trop bas ou trop haut.${F}`
    );
  } finally {
    await connecteur.fermer();
  }
}

main()
  .catch((e) => {
    console.error(`\n${R}Échec :${F}`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
