import "dotenv/config";
import { DateTime } from "luxon";
import { prisma } from "../src/lib/prisma.ts";
import { chargerCalendrier } from "../src/domaine/calendrier";

async function main() {
  const maintenant = new Date();
  const cal = await chargerCalendrier();
  const zone = DateTime.fromJSDate(maintenant, { zone: cal.zone });
  const quatreHeuresOuvreesAvant = ajouterJoursOuvres(zone.minus({ hours: 4 }).toJSDate(), 0, cal);

  const [
    total,
    aQualifier,
    enAttente,
    relance,
    escalade,
    repondu,
    horsPerimetre,
    archive,
    sansProprietaire,
    aQualifierPlus4h,
  ] = await Promise.all([
    prisma.echange.count(),
    prisma.echange.count({ where: { statut: "A_QUALIFIER" } }),
    prisma.echange.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.echange.count({ where: { statut: "RELANCE" } }),
    prisma.echange.count({ where: { statut: "ESCALADE" } }),
    prisma.echange.count({ where: { statut: "REPONDU" } }),
    prisma.echange.count({ where: { statut: "HORS_PERIMETRE" } }),
    prisma.echange.count({ where: { statut: "ARCHIVE" } }),
    prisma.echange.count({ where: { statut: "A_QUALIFIER", responsableId: null } }),
    prisma.echange.count({
      where: {
        statut: "A_QUALIFIER",
        recuLe: { lt: quatreHeuresOuvreesAvant },
      },
    }),
  ]);

  console.log("État actuel de la base :");
  console.log(`  Total échanges : ${total}`);
  console.log(`  A_QUALIFIER : ${aQualifier}`);
  console.log(`    - sans propriétaire : ${sansProprietaire}`);
  console.log(`    - de plus de 4h ouvrées : ${aQualifierPlus4h}`);
  console.log(`  EN_ATTENTE : ${enAttente}`);
  console.log(`  RELANCE : ${relance}`);
  console.log(`  ESCALADE : ${escalade}`);
  console.log(`  REPONDU : ${repondu}`);
  console.log(`  HORS_PERIMETRE : ${horsPerimetre}`);
  console.log(`  ARCHIVE : ${archive}`);

  await prisma.$disconnect();
}

// Fonction simplifiée pour calculer 4 heures ouvrées en arrière
function ajouterJoursOuvres(date: Date, jours: number, cal: any): Date {
  // Pour l'instant, on utilise une approximation simple
  // TODO: utiliser la vraie logique du domaine si nécessaire
  return date;
}

main();
