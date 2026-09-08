-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATEUR', 'GESTIONNAIRE', 'RESPONSABLE', 'LECTEUR');

-- CreateEnum
CREATE TYPE "StatutEchange" AS ENUM ('A_QUALIFIER', 'EN_ATTENTE', 'RELANCE', 'ESCALADE', 'REPONDU', 'SANS_SUITE', 'HORS_PERIMETRE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "TypeCorrespondant" AS ENUM ('CLIENT', 'FOURNISSEUR', 'AUTORITE', 'PARTENAIRE', 'INTERNE', 'AUTRE');

-- CreateEnum
CREATE TYPE "SensMessage" AS ENUM ('ENTRANT', 'SORTANT');

-- CreateEnum
CREATE TYPE "CanalReponse" AS ENUM ('MAIL', 'TELEPHONE', 'REUNION', 'WHATSAPP', 'PHYSIQUE');

-- CreateEnum
CREATE TYPE "DestinataireRelance" AS ENUM ('PROPRIETAIRE', 'SUPPLEANT', 'ESCALADE');

-- CreateEnum
CREATE TYPE "TypeTravail" AS ENUM ('RELANCE', 'VERIFICATION_REPONSE', 'ESCALADE', 'ARCHIVAGE', 'SYNCHRO_BOITE', 'RENOUVELLEMENT_ABONNEMENT');

-- CreateEnum
CREATE TYPE "StatutTravail" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ECHEC', 'ANNULE');

-- CreateEnum
CREATE TYPE "StatutRelance" AS ENUM ('ENVOYEE', 'ECHEC');

-- CreateEnum
CREATE TYPE "TypeEvenement" AS ENUM ('MAIL_DETECTE', 'MAIL_ENREGISTRE', 'MAIL_QUALIFIE', 'MAIL_ATTRIBUE', 'MAIL_TRANSMIS', 'RELANCE_ENVOYEE', 'RELANCE_REPORTEE', 'RELANCE_ECHEC', 'REPONSE_DETECTEE', 'REPONSE_DECLAREE', 'ESCALADE_DECLENCHEE', 'ECHANGE_CLOS', 'MAIL_ARCHIVE', 'PARAMETRE_MODIFIE', 'REGLE_MODIFIEE', 'UTILISATEUR_MODIFIE', 'ANOMALIE_TECHNIQUE');

-- CreateEnum
CREATE TYPE "Acteur" AS ENUM ('SYSTEME', 'UTILISATEUR');

-- CreateEnum
CREATE TYPE "TypeExclusion" AS ENUM ('ADRESSE', 'DOMAINE', 'MOTIF');

-- CreateEnum
CREATE TYPE "Fournisseur" AS ENUM ('MICROSOFT', 'GOOGLE', 'IMAP');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "initiales" TEXT,
    "avatar_url" TEXT,
    "fonction" TEXT,
    "role" "Role" NOT NULL DEFAULT 'RESPONSABLE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "entra_object_id" TEXT,
    "suppleant_id" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT,
    "organisation" TEXT,
    "type" "TypeCorrespondant" NOT NULL DEFAULT 'AUTRE',
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correspondant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boite_suivie" (
    "id" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "fournisseur" "Fournisseur" NOT NULL DEFAULT 'MICROSOFT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "abonnement_id" TEXT,
    "abonnement_expire_le" TIMESTAMP(3),
    "jeton_delta" TEXT,
    "derniere_synchro_le" TIMESTAMP(3),
    "derniere_anomalie" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boite_suivie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expediteur_exclu" (
    "id" TEXT NOT NULL,
    "type" "TypeExclusion" NOT NULL DEFAULT 'ADRESSE',
    "valeur" TEXT NOT NULL,
    "motif" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expediteur_exclu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT '#3d6675',
    "priorite" "Priorite" NOT NULL DEFAULT 'NORMALE',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "a_date_butoir" BOOLEAN NOT NULL DEFAULT false,
    "escalade_vers_id" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regle_relance" (
    "id" TEXT NOT NULL,
    "categorie_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "delai_jours_ouvres" INTEGER NOT NULL,
    "destinataire" "DestinataireRelance" NOT NULL DEFAULT 'PROPRIETAIRE',
    "copie_a" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modele_id" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regle_relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modele_message" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modele_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jour_ferie" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "jour_ferie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "libelle" TEXT NOT NULL,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametre_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "echange" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "boite_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "extrait" TEXT,
    "web_link" TEXT,
    "correspondant_id" TEXT NOT NULL,
    "categorie_id" TEXT,
    "priorite" "Priorite" NOT NULL DEFAULT 'NORMALE',
    "statut" "StatutEchange" NOT NULL DEFAULT 'A_QUALIFIER',
    "responsable_id" TEXT,
    "recu_le" TIMESTAMP(3) NOT NULL,
    "echeance" TIMESTAMP(3),
    "date_butoir" TIMESTAMP(3),
    "prochaine_relance_le" TIMESTAMP(3),
    "derniere_relance_le" TIMESTAMP(3),
    "nb_relances" INTEGER NOT NULL DEFAULT 0,
    "repondu_le" TIMESTAMP(3),
    "reponse_message_id" TEXT,
    "reponse_par_id" TEXT,
    "canal_reponse" "CanalReponse",
    "motif_cloture" TEXT,
    "a_piece_jointe" BOOLEAN NOT NULL DEFAULT false,
    "archive_le" TIMESTAMP(3),
    "archive_url" TEXT,
    "recherche" tsvector,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "echange_id" TEXT NOT NULL,
    "boite_id" TEXT NOT NULL,
    "internet_message_id" TEXT NOT NULL,
    "message_id_fournisseur" TEXT,
    "in_reply_to" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sens" "SensMessage" NOT NULL,
    "expediteur" TEXT NOT NULL,
    "destinataires" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "copie" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sujet" TEXT NOT NULL,
    "extrait" TEXT,
    "date_message" TIMESTAMP(3) NOT NULL,
    "a_piece_jointe" BOOLEAN NOT NULL DEFAULT false,
    "est_automatique" BOOLEAN NOT NULL DEFAULT false,
    "est_non_remise" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_jointe" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "nom_origine" TEXT NOT NULL,
    "type_mime" TEXT NOT NULL,
    "taille_octets" BIGINT NOT NULL,
    "empreinte" TEXT,
    "cle_stockage" TEXT,
    "telecharge_le" TIMESTAMP(3),
    "est_incorporee" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "piece_jointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relance" (
    "id" TEXT NOT NULL,
    "echange_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "destinataire_id" TEXT NOT NULL,
    "copie_a" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modele_id" TEXT,
    "statut" "StatutRelance" NOT NULL DEFAULT 'ENVOYEE',
    "envoyee_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_id_envoye" TEXT,
    "erreur" TEXT,
    "cle_idempotence" TEXT NOT NULL,

    CONSTRAINT "relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travail_planifie" (
    "id" TEXT NOT NULL,
    "type" "TypeTravail" NOT NULL,
    "echange_id" TEXT,
    "executer_a" TIMESTAMP(3) NOT NULL,
    "statut" "StatutTravail" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "derniere_erreur" TEXT,
    "verrou_par" TEXT,
    "verrou_a" TIMESTAMP(3),
    "charge" JSONB,
    "cle_idempotence" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "travail_planifie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenement" (
    "id" TEXT NOT NULL,
    "type" "TypeEvenement" NOT NULL,
    "acteur" "Acteur" NOT NULL DEFAULT 'SYSTEME',
    "utilisateur_id" TEXT,
    "echange_id" TEXT,
    "libelle" TEXT NOT NULL,
    "valeur_avant" JSONB,
    "valeur_apres" JSONB,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_entra_object_id_key" ON "utilisateur"("entra_object_id");

-- CreateIndex
CREATE INDEX "utilisateur_actif_nom_complet_idx" ON "utilisateur"("actif", "nom_complet");

-- CreateIndex
CREATE INDEX "absence_utilisateur_id_debut_fin_idx" ON "absence"("utilisateur_id", "debut", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "correspondant_email_key" ON "correspondant"("email");

-- CreateIndex
CREATE INDEX "correspondant_organisation_idx" ON "correspondant"("organisation");

-- CreateIndex
CREATE UNIQUE INDEX "boite_suivie_adresse_key" ON "boite_suivie"("adresse");

-- CreateIndex
CREATE UNIQUE INDEX "expediteur_exclu_type_valeur_key" ON "expediteur_exclu"("type", "valeur");

-- CreateIndex
CREATE UNIQUE INDEX "categorie_code_key" ON "categorie"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regle_relance_categorie_id_ordre_key" ON "regle_relance"("categorie_id", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "modele_message_code_key" ON "modele_message"("code");

-- CreateIndex
CREATE UNIQUE INDEX "jour_ferie_date_key" ON "jour_ferie"("date");

-- CreateIndex
CREATE UNIQUE INDEX "echange_numero_key" ON "echange"("numero");

-- CreateIndex
CREATE INDEX "echange_statut_echeance_idx" ON "echange"("statut", "echeance");

-- CreateIndex
CREATE INDEX "echange_responsable_id_statut_idx" ON "echange"("responsable_id", "statut");

-- CreateIndex
CREATE INDEX "echange_correspondant_id_recu_le_idx" ON "echange"("correspondant_id", "recu_le");

-- CreateIndex
CREATE INDEX "echange_prochaine_relance_le_idx" ON "echange"("prochaine_relance_le");

-- CreateIndex
CREATE INDEX "echange_recu_le_idx" ON "echange"("recu_le");

-- CreateIndex
CREATE UNIQUE INDEX "echange_boite_id_conversation_id_key" ON "echange"("boite_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_internet_message_id_key" ON "message"("internet_message_id");

-- CreateIndex
CREATE INDEX "message_echange_id_date_message_idx" ON "message"("echange_id", "date_message");

-- CreateIndex
CREATE INDEX "message_boite_id_date_message_idx" ON "message"("boite_id", "date_message");

-- CreateIndex
CREATE INDEX "piece_jointe_message_id_idx" ON "piece_jointe"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "relance_cle_idempotence_key" ON "relance"("cle_idempotence");

-- CreateIndex
CREATE INDEX "relance_envoyee_le_idx" ON "relance"("envoyee_le");

-- CreateIndex
CREATE UNIQUE INDEX "relance_echange_id_ordre_key" ON "relance"("echange_id", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "travail_planifie_cle_idempotence_key" ON "travail_planifie"("cle_idempotence");

-- CreateIndex
CREATE INDEX "travail_planifie_statut_executer_a_idx" ON "travail_planifie"("statut", "executer_a");

-- CreateIndex
CREATE INDEX "travail_planifie_echange_id_type_idx" ON "travail_planifie"("echange_id", "type");

-- CreateIndex
CREATE INDEX "evenement_cree_le_idx" ON "evenement"("cree_le");

-- CreateIndex
CREATE INDEX "evenement_echange_id_cree_le_idx" ON "evenement"("echange_id", "cree_le");

-- CreateIndex
CREATE INDEX "evenement_type_cree_le_idx" ON "evenement"("type", "cree_le");

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_suppleant_id_fkey" FOREIGN KEY ("suppleant_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence" ADD CONSTRAINT "absence_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorie" ADD CONSTRAINT "categorie_escalade_vers_id_fkey" FOREIGN KEY ("escalade_vers_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regle_relance" ADD CONSTRAINT "regle_relance_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regle_relance" ADD CONSTRAINT "regle_relance_modele_id_fkey" FOREIGN KEY ("modele_id") REFERENCES "modele_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echange" ADD CONSTRAINT "echange_boite_id_fkey" FOREIGN KEY ("boite_id") REFERENCES "boite_suivie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echange" ADD CONSTRAINT "echange_correspondant_id_fkey" FOREIGN KEY ("correspondant_id") REFERENCES "correspondant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echange" ADD CONSTRAINT "echange_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echange" ADD CONSTRAINT "echange_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echange" ADD CONSTRAINT "echange_reponse_par_id_fkey" FOREIGN KEY ("reponse_par_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_echange_id_fkey" FOREIGN KEY ("echange_id") REFERENCES "echange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_boite_id_fkey" FOREIGN KEY ("boite_id") REFERENCES "boite_suivie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_jointe" ADD CONSTRAINT "piece_jointe_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relance" ADD CONSTRAINT "relance_echange_id_fkey" FOREIGN KEY ("echange_id") REFERENCES "echange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relance" ADD CONSTRAINT "relance_destinataire_id_fkey" FOREIGN KEY ("destinataire_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relance" ADD CONSTRAINT "relance_modele_id_fkey" FOREIGN KEY ("modele_id") REFERENCES "modele_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travail_planifie" ADD CONSTRAINT "travail_planifie_echange_id_fkey" FOREIGN KEY ("echange_id") REFERENCES "echange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_echange_id_fkey" FOREIGN KEY ("echange_id") REFERENCES "echange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
