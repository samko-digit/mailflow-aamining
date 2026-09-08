/**
 * MailFlow · Vérification du socle
 *
 * Exerce la chaîne complète : variables d'environnement, adaptateur,
 * client généré, base. À lancer après toute migration ou changement
 * d'environnement, avant de conclure que « ça marche ».
 *
 *   npm run db:check
 */

import "dotenv/config";
import { DateTime } from "luxon";

import { prisma } from "../src/lib/prisma";
import { chargerCalendrier } from "../src/domaine/calendrier";
import { calculerEcheance } from "../src/domaine/echeance";

async function main() {
  const [categories, regles, modeles, parametres, exclusions] =
    await Promise.all([
      prisma.categorie.count(),
      prisma.regleRelance.count(),
      prisma.modeleMessage.count(),
      prisma.parametre.count(),
      prisma.expediteurExclu.count(),
    ]);

  console.log("Paramétrage en base");
  console.log(`  catégories         ${categories}`);
  console.log(`  règles de relance  ${regles}`);
  console.log(`  modèles de message ${modeles}`);
  console.log(`  paramètres         ${parametres}`);
  console.log(`  exclusions         ${exclusions}`);

  // La colonne `recherche` est générée par PostgreSQL et absente du client
  // généré : elle se lit en requête brute.
  const [recherche] = await prisma.$queryRaw<
    { is_generated: string }[]
  >`SELECT is_generated FROM information_schema.columns
     WHERE table_name = 'echange' AND column_name = 'recherche'`;
  console.log(
    `\nColonne de recherche plein texte : ${
      recherche?.is_generated === "ALWAYS" ? "générée" : "ABSENTE OU NON GÉNÉRÉE"
    }`
  );

  const indexPartiels = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM pg_indexes
     WHERE schemaname = 'public' AND indexdef LIKE '%WHERE%'`;
  console.log(`Index partiels             : ${indexPartiels[0]?.n}`);

  // Chaîne complète : paramètres en base, assemblage du calendrier, calcul.
  const calendrier = await chargerCalendrier();
  console.log(
    `\nCalendrier                 : ${calendrier.zone}, jours ${calendrier.joursOuvres.join("")}, ${calendrier.ouverture} à ${calendrier.fermeture}`
  );
  console.log(`Jours fériés chargés       : ${calendrier.joursFeries.length}`);

  if (calendrier.joursFeries.length === 0) {
    console.warn(
      "  ⚠ Aucun jour férié en base. Des relances partiront un jour chômé."
    );
  }

  // Cas de référence de la note d'architecture : vendredi 17 h 10, délai de
  // deux jours ouvrés. Attendu : mardi 17 h 10.
  const recu = DateTime.fromISO("2026-09-04T17:10", {
    zone: calendrier.zone,
  }).toJSDate();
  const echeance = calculerEcheance(recu, 2, calendrier);
  const attendu = "2026-09-08 17:10";
  const obtenu = DateTime.fromJSDate(echeance, {
    zone: calendrier.zone,
  }).toFormat("yyyy-MM-dd HH:mm");

  console.log(`Cas de référence           : ${obtenu} (attendu ${attendu})`);
  if (obtenu !== attendu) {
    throw new Error(
      `Le calcul d'échéance ne rend pas le résultat attendu sur le paramétrage réel.`
    );
  }

  console.log("\nSocle opérationnel.");
}

main()
  .catch((e) => {
    console.error("Échec de la vérification :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
