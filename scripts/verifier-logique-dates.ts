/**
 * MailFlow · Vérification de la logique des nouvelles dates
 *
 * Ce script vérifie que la règle de calcul des nouvelles dates est correcte
 * du point de vue métier.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calculerPremiereEcheance } from "../src/donnees/executer";

async function main() {
  console.log("=== VÉRIFICATION DE LA LOGIQUE DES NOUVELLES DATES ===\n");

  const maintenant = new Date();

  // Récupérer les catégories et leurs délais
  const categories = await prisma.categorie.findMany({
    where: { actif: true },
    select: {
      id: true,
      libelle: true,
      code: true,
      regles: {
        select: {
          delaiJoursOuvres: true,
          ordre: true,
        },
      },
    },
  });

  console.log("=== RÈGLES DE DÉLAI PAR CATÉGORIE ===\n");
  for (const cat of categories) {
    console.log(`${cat.libelle} (${cat.code})`);
    for (const regle of cat.regles) {
      console.log(`  Règle ${regle.ordre}: ${regle.delaiJoursOuvres} jours ouvrés`);
    }
    console.log();
  }

  // Récupérer les travaux en retard
  const travauxEnRetard = await prisma.travailPlanifie.findMany({
    where: {
      executerA: { lt: maintenant },
      statut: "EN_ATTENTE",
    },
    select: {
      id: true,
      type: true,
      executerA: true,
      echangeId: true,
      echange: {
        select: {
          id: true,
          statut: true,
          sujet: true,
          recuLe: true,
          echeance: true,
          categorieId: true,
          categorie: {
            select: { libelle: true, code: true },
          },
        },
      },
    },
  });

  // Grouper par échange
  const parEchange = new Map<string, typeof travauxEnRetard>();
  for (const t of travauxEnRetard) {
    if (!t.echange) continue;
    if (!parEchange.has(t.echange.id)) {
      parEchange.set(t.echange.id, []);
    }
    parEchange.get(t.echange.id)!.push(t);
  }

  console.log(`=== ANALYSE DES NOUVELLES DATES POUR ${parEchange.size} ÉCHANGES ===\n`);

  console.log("Échange ID | Sujet | Catégorie | Ancienne échéance | Date reçu | Nouvelle échéance | Différence (jours) | Règle métier");
  console.log("-----------|-------|-----------|-------------------|----------|-------------------|-------------------|-------------\n");

  let compteur = 0;
  for (const [echangeId, travaux] of parEchange) {
    if (compteur >= 10) break; // Limiter à 10 pour la lisibilité
    compteur++;

    const echange = travaux[0].echange;
    if (!echange || !echange.categorieId) continue;

    const ancienneEcheance = echange.echeance;
    const dateRecu = echange.recuLe;
    const sujet = echange.sujet?.substring(0, 25) ?? "N/A";
    const categorie = echange.categorie?.libelle ?? "N/A";

    // Calculer la nouvelle échéance avec la date actuelle
    const { echeance: nouvelleEcheance } = await calculerPremiereEcheance(
      maintenant,
      echange.categorieId
    );

    // Calculer la nouvelle échéance avec la date originale (pour comparaison)
    const { echeance: nouvelleEcheanceOriginale } = await calculerPremiereEcheance(
      dateRecu,
      echange.categorieId
    );

    const diffJours = Math.round((nouvelleEcheance.getTime() - (ancienneEcheance?.getTime() ?? maintenant.getTime())) / (1000 * 60 * 60 * 24));
    const diffJoursOriginale = Math.round((nouvelleEcheanceOriginale.getTime() - (ancienneEcheance?.getTime() ?? maintenant.getTime())) / (1000 * 60 * 60 * 24));

    console.log(`${echangeId} | ${sujet} | ${categorie} | ${ancienneEcheance?.toISOString() ?? "N/A"} | ${dateRecu?.toISOString() ?? "N/A"} | ${nouvelleEcheance.toISOString()} | ${diffJours} | ${diffJoursOriginale} (originale)`);
  }

  console.log(`\n... et ${parEchange.size - 10} autres échanges\n`);

  // Analyse de la logique
  console.log("=== ANALYSE DE LA LOGIQUE MÉTIER ===\n");
  console.log("Règle actuelle du script de correction :");
  console.log("- Utiliser la date actuelle (maintenant) comme point de départ");
  console.log("- Appliquer les délais de la catégorie");
  console.log("- Résultat : nouvelle échéance = maintenant + délai catégorie\n");

  console.log("Règle originale (quand les échanges ont été qualifiés) :");
  console.log("- Utiliser la date de réception de l'échange comme point de départ");
  console.log("- Appliquer les délais de la catégorie");
  console.log("- Résultat : échéance originale = date reçu + délai catégorie\n");

  console.log("Problème identifié :");
  console.log("- Les échanges ont été reçus en août 2026");
  console.log("- Ils ont été qualifiés le 8 septembre 2026");
  console.log("- Le système a utilisé la date de réception (août) pour calculer les échéances");
  console.log("- Mais les échéances calculées étaient déjà passées au moment de la qualification");
  console.log("- Les travaux de relance ont donc été créés avec des dates dans le passé\n");

  console.log("Solution proposée :");
  console.log("- Utiliser la date actuelle (maintenant) comme point de départ");
  console.log("- Cela repousse les échéances dans le futur");
  console.log("- Cela permet aux travaux de relance d'être exécutés\n");

  console.log("⚠️  CRITIQUE : Cette solution ne corrige pas la cause racine");
  console.log("- Elle ne fait que repousser le problème dans le futur");
  console.log("- Les échanges auraient dû être traités immédiatement après réception");
  console.log("- Le délai métier entre réception et qualification a été perdu\n");

  console.log("Alternative métier correcte :");
  console.log("- Conserver la date de réception comme point de départ");
  console.log("- Calculer la date à laquelle l'échange aurait dû être traité");
  console.log("- Si cette date est passée, traiter l'échange immédiatement (aujourd'hui)");
  console.log("- Si cette date est future, planifier pour cette date\n");

  console.log("Conclusion sur la logique des dates :");
  console.log("BLOCAGE - La logique actuelle repousse artificiellement les retards");
  console.log("sans corriger la cause racine (délai entre réception et qualification).\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
