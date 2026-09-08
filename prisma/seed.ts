/**
 * MailFlow · Jeu de données initial
 *
 * Idempotent : peut être rejoué sans créer de doublon.
 *
 * ⚠ Les catégories et les délais ci-dessous reprennent la proposition de la
 *   note d'architecture. Ils restent en attente de la décision D3 du client.
 *   Ils sont volontairement en base et non dans le code : une règle de temps
 *   qui exige un développeur pour être ajustée ne sera jamais ajustée.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Prisma 7 : la connexion passe par un adaptateur, pas par le schéma.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Paramètres généraux ──────────────────────────────────────────────────
  const parametres = [
    {
      cle: "fuseau_site",
      libelle: "Fuseau horaire du site",
      valeur: "Africa/Bamako",
    },
    {
      cle: "jours_ouvres",
      libelle: "Jours travaillés (1 = lundi)",
      valeur: [1, 2, 3, 4, 5],
    },
    {
      cle: "fenetre_envoi",
      libelle: "Plage d'expédition des relances",
      valeur: { debut: "08:00", fin: "18:00" },
    },
    {
      cle: "cadence_synchro_minutes",
      libelle: "Filet de sécurité : interrogation différentielle de la boîte",
      valeur: 5,
    },
    {
      cle: "delai_attribution_heures_ouvrees",
      libelle:
        "Au-delà, un échange sans propriétaire est un incident (règle RG-12)",
      valeur: 4,
    },
    {
      cle: "alerte_battement_coeur_minutes",
      libelle:
        "Aucun passage du moteur pendant cette durée déclenche une alerte",
      valeur: 15,
    },
    {
      cle: "alerte_expiration_secret_jours",
      libelle: "Préavis avant expiration du secret du compte de service",
      valeur: 30,
    },
  ];

  for (const p of parametres) {
    await prisma.parametre.upsert({
      where: { cle: p.cle },
      update: { libelle: p.libelle, valeur: p.valeur as object },
      create: { cle: p.cle, libelle: p.libelle, valeur: p.valeur as object },
    });
  }

  // ── Modèles de message ───────────────────────────────────────────────────
  // Trois suffisent. Variables disponibles : {{numero}} {{sujet}}
  // {{correspondant}} {{organisation}} {{recuLe}} {{joursEcoules}}
  // {{echeance}} {{lienMail}} {{lienFiche}}
  const modeles = [
    {
      code: "RAPPEL_COURTOIS",
      libelle: "Rappel courtois (1re relance)",
      sujet: "Rappel · {{sujet}}",
      corps: [
        "Bonjour,",
        "",
        "Le message ci-dessous de {{correspondant}} ({{organisation}}), reçu le {{recuLe}},",
        "attend une réponse depuis {{joursEcoules}}.",
        "",
        "Ouvrir le message : {{lienMail}}",
        "Voir la fiche de suivi : {{lienFiche}}",
        "",
        "Réf. {{numero}}",
      ].join("\n"),
    },
    {
      code: "RAPPEL_FERME",
      libelle: "Rappel ferme, avec copie (2e et 3e relances)",
      sujet: "Relance {{numero}} · {{sujet}}",
      corps: [
        "Bonjour,",
        "",
        "Le dossier {{numero}} est sans réponse depuis {{joursEcoules}}.",
        "Échéance dépassée : {{echeance}}.",
        "Correspondant : {{correspondant}} ({{organisation}}).",
        "",
        "Merci de répondre depuis la boîte suivie, afin que la réponse soit",
        "détectée automatiquement et que les relances s'arrêtent.",
        "",
        "Ouvrir le message : {{lienMail}}",
      ].join("\n"),
    },
    {
      code: "ESCALADE",
      libelle: "Note d'escalade vers la hiérarchie",
      sujet: "Escalade · {{numero}} sans réponse · {{sujet}}",
      corps: [
        "Bonjour,",
        "",
        "Le dossier {{numero}} a épuisé ses relances sans obtenir de réponse.",
        "",
        "Correspondant : {{correspondant}} ({{organisation}})",
        "Reçu le : {{recuLe}}",
        "Sans réponse depuis : {{joursEcoules}}",
        "",
        "Une décision est attendue : réaffecter, relancer autrement,",
        "ou classer sans suite avec motif.",
        "",
        "Voir la fiche : {{lienFiche}}",
      ].join("\n"),
    },
  ];

  for (const m of modeles) {
    await prisma.modeleMessage.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }

  const modeleId = async (code: string) =>
    (await prisma.modeleMessage.findUniqueOrThrow({ where: { code } })).id;

  const courtois = await modeleId("RAPPEL_COURTOIS");
  const ferme = await modeleId("RAPPEL_FERME");
  const escalade = await modeleId("ESCALADE");

  // ── Catégories et règles de relance ──────────────────────────────────────
  // `delaiJoursOuvres` se compte depuis la réception, ou à rebours depuis
  // `Echange.dateButoir` pour les catégories marquées `aDateButoir`.
  const categories = [
    {
      code: "DATE_BUTOIR",
      libelle: "Date butoir imposée (tutelle, douane, fiscalité)",
      couleur: "#a92a20",
      priorite: "CRITIQUE" as const,
      aDateButoir: true,
      ordre: 1,
      regles: [
        { ordre: 1, delaiJoursOuvres: 3, destinataire: "PROPRIETAIRE" as const, modeleId: courtois },
        { ordre: 2, delaiJoursOuvres: 1, destinataire: "ESCALADE" as const, modeleId: escalade },
      ],
    },
    {
      code: "APPRO",
      libelle: "Approvisionnement, logistique, transit",
      couleur: "#a06a06",
      priorite: "HAUTE" as const,
      aDateButoir: false,
      ordre: 2,
      regles: [
        { ordre: 1, delaiJoursOuvres: 1, destinataire: "PROPRIETAIRE" as const, modeleId: courtois },
        { ordre: 2, delaiJoursOuvres: 1, destinataire: "PROPRIETAIRE" as const, modeleId: ferme },
        { ordre: 3, delaiJoursOuvres: 1, destinataire: "ESCALADE" as const, modeleId: escalade },
      ],
    },
    {
      code: "COMMERCIAL",
      libelle: "Commercial, offres, contrats",
      couleur: "#3d6675",
      priorite: "NORMALE" as const,
      aDateButoir: false,
      ordre: 3,
      regles: [
        { ordre: 1, delaiJoursOuvres: 2, destinataire: "PROPRIETAIRE" as const, modeleId: courtois },
        { ordre: 2, delaiJoursOuvres: 2, destinataire: "PROPRIETAIRE" as const, modeleId: ferme },
        { ordre: 3, delaiJoursOuvres: 3, destinataire: "ESCALADE" as const, modeleId: escalade },
      ],
    },
    {
      code: "TECHNIQUE",
      libelle: "Technique, exploitation",
      couleur: "#2b7048",
      priorite: "HAUTE" as const,
      aDateButoir: false,
      ordre: 4,
      regles: [
        { ordre: 1, delaiJoursOuvres: 1, destinataire: "PROPRIETAIRE" as const, modeleId: courtois },
        { ordre: 2, delaiJoursOuvres: 2, destinataire: "PROPRIETAIRE" as const, modeleId: ferme },
        { ordre: 3, delaiJoursOuvres: 2, destinataire: "ESCALADE" as const, modeleId: escalade },
      ],
    },
    {
      code: "ADMIN",
      libelle: "Administratif courant, personnel",
      couleur: "#5c6669",
      priorite: "BASSE" as const,
      aDateButoir: false,
      ordre: 5,
      regles: [
        { ordre: 1, delaiJoursOuvres: 3, destinataire: "PROPRIETAIRE" as const, modeleId: courtois },
        { ordre: 2, delaiJoursOuvres: 3, destinataire: "ESCALADE" as const, modeleId: escalade },
      ],
    },
  ];

  for (const c of categories) {
    const { regles, ...donnees } = c;
    const categorie = await prisma.categorie.upsert({
      where: { code: c.code },
      update: donnees,
      create: donnees,
    });

    for (const r of regles) {
      await prisma.regleRelance.upsert({
        where: { categorieId_ordre: { categorieId: categorie.id, ordre: r.ordre } },
        update: { ...r, categorieId: categorie.id },
        create: { ...r, categorieId: categorie.id },
      });
    }
  }

  // ── Liste d'exclusion de départ ──────────────────────────────────────────
  // Le filtre le plus rentable du dispositif. Elle s'enrichira des échanges
  // classés HORS_PERIMETRE pendant les deux semaines d'observation.
  const exclusions: { type: "ADRESSE" | "DOMAINE" | "MOTIF"; valeur: string; motif: string }[] = [
    // `[^@]*` et non `@` : les envois transactionnels glissent un jeton entre
    // le mot et l'arobase (`no-reply-po9rz...@mail.anthropic.com`). Exiger
    // l'arobase collée laissait passer seize dossiers sur cent lors du
    // calibrage, tous venant d'adresses qui disent elles-mêmes de ne pas
    // répondre.
    { type: "MOTIF", valeur: "^(no-?reply|ne-pas-repondre|donotreply)[^@]*@", motif: "Adresses sans réponse possible" },
    { type: "MOTIF", valeur: "^(newsletter|news|info|marketing|promo)@", motif: "Diffusion commerciale" },
    { type: "MOTIF", valeur: "^(notification|notifications|alert|alerts)@", motif: "Notifications applicatives" },
    { type: "MOTIF", valeur: "^(mailer-daemon|postmaster)@", motif: "Messages de service (traités à part comme incidents)" },
  ];

  for (const e of exclusions) {
    await prisma.expediteurExclu.upsert({
      where: { type_valeur: { type: e.type, valeur: e.valeur } },
      update: { motif: e.motif },
      create: e,
    });
  }

  // ── Jours fériés ─────────────────────────────────────────────────────────
  // À compléter par l'administrateur. Sans eux, des relances partiront un
  // jour chômé et le calcul des jours ouvrés sera faux.
  console.log(
    "Jours fériés : aucun n'est chargé par défaut. À saisir depuis l'écran Paramètres avant la mise en service."
  );

  console.log("Jeu de données initial en place.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
