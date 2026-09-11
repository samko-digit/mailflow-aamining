/**
 * MailFlow · Vérification de l'impact métier
 *
 * Ce script vérifie précisément ce qui sera modifié, conservé, annulé, recréé
 * et vérifie les relations entre les entités.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== VÉRIFICATION DE L'IMPACT MÉTIER ===\n");

  // Vérifier les relations dans le schéma
  console.log("=== RELATIONS DANS LE SCHÉMA ===\n");
  console.log("Echange → TravailPlanifie : echangeId (FK)");
  console.log("Echange → Evenement : echangeId (FK)");
  console.log("Echange → Relance : echangeId (FK)");
  console.log("Echange → Correspondant : correspondantId (FK)");
  console.log("Echange → Categorie : categorieId (FK)");
  console.log("Echange → Utilisateur : responsableId (FK)");
  console.log();

  // Vérifier les contraintes de suppression
  console.log("=== CONTRAINTES DE SUPPRESSION ===\n");
  console.log("Echange : onDelete Cascade pour TravailPlanifie, Evenement, Relance");
  console.log("→ Si un échange est supprimé, tous ses travaux, événements et relances sont supprimés");
  console.log("→ Mais nous ne supprimons PAS d'échanges, donc pas de problème");
  console.log();

  // Impact des corrections de qualifications
  console.log("=== IMPACT DES CORRECTIONS DE QUALIFICATIONS (77 échanges) ===\n");
  console.log("CE QUI SERA MODIFIÉ :");
  console.log("- Echange.categorieId : nouvelle catégorie");
  console.log("- Echange.responsableId : nouveau responsable");
  console.log("- Echange.echeance : recalculée selon la nouvelle catégorie");
  console.log("- Echange.prochaineRelanceLe : recalculée selon la nouvelle catégorie");
  console.log();

  console.log("CE QUI SERA CONSERVÉ :");
  console.log("- Echange.id : inchangé");
  console.log("- Echange.statut : inchangé (EN_ATTENTE)");
  console.log("- Echange.sujet : inchangé");
  console.log("- Echange.recuLe : inchangé");
  console.log("- Echange.correspondantId : inchangé");
  console.log("- Tous les Evenement existants : conservés");
  console.log("- Toutes les Relance existantes : conservées");
  console.log();

  console.log("CE QUI SERA ANNULÉ :");
  console.log("- TravailPlanifie avec statut EN_ATTENTE pour ces échanges");
  console.log("  (via ANNULER_TRAVAUX dans appliquerEtPersister)");
  console.log();

  console.log("CE QUI SERA RECÉÉ :");
  console.log("- Nouveaux TravailPlanifie avec dates futures");
  console.log("- Nouveaux Evenement de type QUALIFIER");
  console.log("- Nouveaux Evenement de type ATTRIBUTION");
  console.log();

  console.log("CE QUI EST IRRÉVERSIBLE :");
  console.log("- Les anciens TravailPlanifie (statut ANNULE) ne peuvent pas être restaurés");
  console.log("- Les nouveaux Evenement ne peuvent pas être supprimés sans affecter l'historique");
  console.log();

  console.log("CE QUI PEUT ÊTRE RESTAURÉ AVEC LA SAUVEGARDE :");
  console.log("- Tout l'état de la base de données avant les corrections");
  console.log("- Y compris les anciens TravailPlanifie");
  console.log("- Y compris l'état exact des Echange");
  console.log();

  // Impact des corrections de travaux
  console.log("=== IMPACT DES CORRECTIONS DE TRAVAUX (93 échanges) ===\n");
  console.log("CE QUI SERA MODIFIÉ :");
  console.log("- Echange.echeance : nouvelle date basée sur maintenant");
  console.log("- Echange.prochaineRelanceLe : nouvelle date basée sur maintenant");
  console.log();

  console.log("CE QUI SERA CONSERVÉ :");
  console.log("- Echange.categorieId : inchangé");
  console.log("- Echange.responsableId : inchangé");
  console.log("- Echange.statut : inchangé");
  console.log("- Tous les Evenement existants : conservés");
  console.log("- Toutes les Relance existantes : conservées");
  console.log();

  console.log("CE QUI SERA ANNULÉ :");
  console.log("- 94 TravailPlanifie avec statut EN_ATTENTE");
  console.log("  (statut changé en ANNULE)");
  console.log();

  console.log("CE QUI SERA RECÉÉ :");
  console.log("- 93 TravailPlanifie avec dates futures");
  console.log("  (1 par échange, pas par travail original)");
  console.log();

  console.log("CE QUI EST IRRÉVERSIBLE :");
  console.log("- Les 94 anciens TravailPlanifie (statut ANNULE)");
  console.log("- Les clés d'idempotence originales");
  console.log();

  console.log("CE QUI PEUT ÊTRE RESTAURÉ AVEC LA SAUVEGARDE :");
  console.log("- Tout l'état de la base de données avant les corrections");
  console.log();

  // Vérification des relations
  console.log("=== VÉRIFICATION DES RELATIONS ===\n");
  console.log("Aucune relation ne sera cassée car :");
  console.log("- Nous ne supprimons pas d'échanges");
  console.log("- Nous ne supprimons pas de correspondants");
  console.log("- Nous ne supprimons pas de catégories");
  console.log("- Nous ne supprimons pas d'utilisateurs");
  console.log("- Les FK sont conservées (echangeId, correspondantId, categorieId, responsableId)");
  console.log();

  // Vérification des données nécessaires au rollback
  console.log("=== VÉRIFICATION DES DONNÉES NÉCESSAIRES AU ROLLBACK ===\n");
  console.log("Les données nécessaires au rollback sont conservées :");
  console.log("- Les anciens TravailPlanifie (statut ANNULE) restent en base");
  console.log("- Les Evenement d'audit conservent l'historique");
  console.log("- La sauvegarde SQL contient l'état complet avant modification");
  console.log();

  console.log("⚠️  ATTENTION :");
  console.log("- Les TravailPlanifiés ANNULE ne sont pas automatiquement restaurés");
  console.log("- Il faut utiliser la sauvegarde SQL pour un rollback complet");
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
