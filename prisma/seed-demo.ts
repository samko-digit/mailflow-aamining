/**
 * MailFlow · Jeu de données de démonstration
 *
 *   npm run db:demo
 *
 * Vingt échanges répartis sur tous les états, dans un contexte d'exploitation
 * minière : transit et douane, approvisionnement, administration fiscale,
 * commercial, exploitation.
 *
 * ⚠ Ces données sont FICTIVES et destinées au développement et à la
 *   démonstration. Le script efface les tables métier avant de les recréer.
 *   Il refuse de s'exécuter en production.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DateTime } from "luxon";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ZONE = "Africa/Bamako";

/** Ancre temporelle du jeu : lundi 7 septembre 2026, 10 h 24 à Bamako. */
const MAINTENANT = DateTime.fromISO("2026-09-07T10:24", { zone: ZONE });

/** Raccourci : instant relatif à l'ancre. */
const il_y_a = (opts: { jours?: number; heures?: number }) =>
  MAINTENANT.minus({ days: opts.jours ?? 0, hours: opts.heures ?? 0 }).toJSDate();

const dans = (opts: { jours?: number; heures?: number }) =>
  MAINTENANT.plus({ days: opts.jours ?? 0, hours: opts.heures ?? 0 }).toJSDate();

const jour = (iso: string, heure = "09:00") =>
  DateTime.fromISO(`${iso}T${heure}`, { zone: ZONE }).toJSDate();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refus : ce script efface des données et ne doit jamais tourner en production."
    );
  }

  console.log("Effacement des données métier existantes…");
  await prisma.evenement.deleteMany();
  await prisma.relance.deleteMany();
  await prisma.travailPlanifie.deleteMany();
  await prisma.pieceJointe.deleteMany();
  await prisma.message.deleteMany();
  await prisma.echange.deleteMany();
  await prisma.correspondant.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.boiteSuivie.deleteMany();
  await prisma.jourFerie.deleteMany();
  await prisma.utilisateur.deleteMany();

  // ── Jours fériés maliens 2026 (à confirmer par le client) ───────────────
  const feries: [string, string][] = [
    ["2026-01-01", "Jour de l'An"],
    ["2026-01-20", "Fête de l'Armée"],
    ["2026-03-26", "Journée des Martyrs"],
    ["2026-05-01", "Fête du Travail"],
    ["2026-09-22", "Fête de l'Indépendance"],
    ["2026-12-25", "Noël"],
  ];
  await prisma.jourFerie.createMany({
    data: feries.map(([date, libelle]) => ({ date: new Date(date), libelle })),
  });

  // ── Utilisateurs ────────────────────────────────────────────────────────
  const mamadou = await prisma.utilisateur.create({
    data: {
      email: "mamadou.berthe@exemple-mining.ml",
      nomComplet: "Mamadou Berthé",
      initiales: "MB",
      fonction: "Responsable administratif",
      role: "ADMINISTRATEUR",
    },
  });
  const fatoumata = await prisma.utilisateur.create({
    data: {
      email: "fatoumata.diallo@exemple-mining.ml",
      nomComplet: "Fatoumata Diallo",
      initiales: "FD",
      fonction: "Approvisionnements",
      role: "GESTIONNAIRE",
      suppleantId: mamadou.id,
    },
  });
  const bintou = await prisma.utilisateur.create({
    data: {
      email: "bintou.keita@exemple-mining.ml",
      nomComplet: "Bintou Keïta",
      initiales: "BK",
      fonction: "Comptabilité et fiscalité",
      role: "GESTIONNAIRE",
      suppleantId: mamadou.id,
    },
  });
  const seydou = await prisma.utilisateur.create({
    data: {
      email: "seydou.coulibaly@exemple-mining.ml",
      nomComplet: "Seydou Coulibaly",
      initiales: "SC",
      fonction: "Exploitation",
      role: "RESPONSABLE",
    },
  });

  // ── Boîte suivie ────────────────────────────────────────────────────────
  // Inactive à dessein : aucun connecteur ne peut ouvrir cette boîte, qui
  // n'existe pas. La laisser active ferait sonner l'alarme « boîte plus lue »
  // en permanence, et une alarme qui sonne toujours ne se lit plus.
  const boite = await prisma.boiteSuivie.create({
    data: {
      adresse: "administration@exemple-mining.ml",
      libelle: "Administration du site (démonstration)",
      fournisseur: "MICROSOFT",
      actif: false,
      derniereSynchroLe: il_y_a({ heures: 0.1 }),
      abonnementExpireLe: dans({ jours: 2 }),
    },
  });

  // ── Correspondants ──────────────────────────────────────────────────────
  const c = async (
    email: string,
    nom: string,
    organisation: string,
    type: "CLIENT" | "FOURNISSEUR" | "AUTORITE" | "PARTENAIRE" | "AUTRE"
  ) =>
    prisma.correspondant.create({
      data: { email, nom, organisation, type },
    });

  const transitSahel = await c("ops@transit-sahel.example", "Amadou Sow", "Transit Sahel SARL", "FOURNISSEUR");
  const douanes = await c("bureau.kayes@douanes.example", "Bureau de Kayes", "Direction des Douanes", "AUTORITE");
  const foragex = await c("ventes@foragex.example", "Claire Nguyen", "Foragex Industries", "FOURNISSEUR");
  const impots = await c("controle@impots.example", "Brigade de vérification", "Administration fiscale", "AUTORITE");
  const sahelEquip = await c("commercial@sahel-equipements.example", "Ibrahim Touré", "Sahel Équipements", "FOURNISSEUR");
  const carbura = await c("logistique@carbura.example", "Awa Diarra", "Carbura Distribution", "FOURNISSEUR");
  const geoconseil = await c("contact@geoconseil.example", "Paul Mercier", "GéoConseil", "PARTENAIRE");
  const assurances = await c("sinistres@mutuelle-pro.example", "Service sinistres", "Mutuelle Pro", "PARTENAIRE");
  const energieSud = await c("facturation@energie-sud.example", "Service clients", "Énergie Sud", "FOURNISSEUR");
  const laboAnalyse = await c("resultats@labo-analyse.example", "Dr Sanogo", "Laboratoire d'analyses", "FOURNISSEUR");

  // ── Catégories déjà en base (jeu initial) ───────────────────────────────
  const cats = await prisma.categorie.findMany();
  const parCode = new Map(cats.map((x) => [x.code, x]));
  const cat = (code: string) => {
    const v = parCode.get(code);
    if (!v) throw new Error(`Catégorie absente : ${code}. Lancer npm run db:seed d'abord.`);
    return v.id;
  };

  // ── Échanges ────────────────────────────────────────────────────────────
  type Def = {
    sujet: string;
    extrait: string;
    correspondant: { id: string; email: string };
    categorie: string;
    priorite: "BASSE" | "NORMALE" | "HAUTE" | "CRITIQUE";
    statut:
      | "A_QUALIFIER"
      | "EN_ATTENTE"
      | "RELANCE"
      | "ESCALADE"
      | "REPONDU"
      | "ARCHIVE";
    responsable?: { id: string };
    recuLe: Date;
    echeance?: Date;
    dateButoir?: Date;
    prochaineRelanceLe?: Date;
    derniereRelanceLe?: Date;
    nbRelances?: number;
    reponduLe?: Date;
    aPieceJointe?: boolean;
  };

  const defs: Def[] = [
    // ── En retard, à traiter en priorité ────────────────────────────────
    {
      sujet: "Mainlevée conteneur MSKU 4471 bloqué au port",
      extrait: "Le conteneur de pièces de rechange est immobilisé depuis jeudi, nous attendons votre pouvoir…",
      correspondant: transitSahel,
      categorie: cat("APPRO"),
      priorite: "CRITIQUE",
      statut: "RELANCE",
      responsable: fatoumata,
      recuLe: il_y_a({ jours: 5 }),
      echeance: il_y_a({ jours: 3 }),
      prochaineRelanceLe: il_y_a({ heures: 1 }),
      derniereRelanceLe: il_y_a({ heures: 3 }),
      nbRelances: 2,
      aPieceJointe: true,
    },
    {
      sujet: "Avis de vérification de comptabilité, exercices 2024 et 2025",
      extrait: "Nous vous informons qu'une vérification de comptabilité sera engagée à compter du…",
      correspondant: impots,
      categorie: cat("DATE_BUTOIR"),
      priorite: "CRITIQUE",
      statut: "ESCALADE",
      responsable: bintou,
      recuLe: il_y_a({ jours: 8 }),
      echeance: il_y_a({ jours: 2 }),
      dateButoir: jour("2026-09-15", "23:59"),
      derniereRelanceLe: il_y_a({ jours: 1 }),
      nbRelances: 2,
      aPieceJointe: true,
    },
    {
      sujet: "Régularisation déclaration en détail n° 2026-0884",
      extrait: "Il subsiste un écart entre la valeur déclarée et la facture fournisseur jointe…",
      correspondant: douanes,
      categorie: cat("DATE_BUTOIR"),
      priorite: "HAUTE",
      statut: "RELANCE",
      responsable: bintou,
      recuLe: il_y_a({ jours: 4 }),
      echeance: il_y_a({ heures: 6 }),
      prochaineRelanceLe: dans({ heures: 2 }),
      derniereRelanceLe: il_y_a({ heures: 5 }),
      nbRelances: 1,
      dateButoir: jour("2026-09-18", "23:59"),
      aPieceJointe: true,
    },
    {
      sujet: "Panne compresseur atelier 2, devis de réparation",
      extrait: "Suite à notre intervention de vendredi, veuillez trouver le devis de remise en état…",
      correspondant: sahelEquip,
      categorie: cat("TECHNIQUE"),
      priorite: "HAUTE",
      statut: "RELANCE",
      responsable: seydou,
      recuLe: il_y_a({ jours: 3 }),
      echeance: il_y_a({ heures: 20 }),
      prochaineRelanceLe: dans({ heures: 5 }),
      derniereRelanceLe: il_y_a({ heures: 6 }),
      nbRelances: 1,
      aPieceJointe: true,
    },

    // ── En attente, dans les temps ──────────────────────────────────────
    {
      sujet: "Proposition de contrat cadre, forage et sondage 2027",
      extrait: "Comme convenu lors de notre échange, voici notre proposition de contrat cadre…",
      correspondant: foragex,
      categorie: cat("COMMERCIAL"),
      priorite: "NORMALE",
      statut: "EN_ATTENTE",
      responsable: mamadou,
      recuLe: il_y_a({ jours: 1 }),
      echeance: dans({ jours: 1 }),
      prochaineRelanceLe: dans({ jours: 1 }),
      aPieceJointe: true,
    },
    {
      sujet: "Programme de livraison gasoil, semaine 38",
      extrait: "Merci de confirmer les volumes et les créneaux de déchargement pour la semaine prochaine…",
      correspondant: carbura,
      categorie: cat("APPRO"),
      priorite: "HAUTE",
      statut: "EN_ATTENTE",
      responsable: fatoumata,
      recuLe: il_y_a({ heures: 20 }),
      echeance: dans({ heures: 4 }),
      prochaineRelanceLe: dans({ heures: 4 }),
    },
    {
      sujet: "Résultats d'analyses, campagne d'août",
      extrait: "Les résultats de la campagne du mois d'août sont disponibles, un point vous est proposé…",
      correspondant: laboAnalyse,
      categorie: cat("TECHNIQUE"),
      priorite: "NORMALE",
      statut: "EN_ATTENTE",
      responsable: seydou,
      recuLe: il_y_a({ jours: 2 }),
      echeance: dans({ jours: 2 }),
      prochaineRelanceLe: dans({ jours: 2 }),
      aPieceJointe: true,
    },
    {
      sujet: "Déclaration de sinistre véhicule de service, suite",
      extrait: "Nous accusons réception de votre déclaration et sollicitons deux pièces complémentaires…",
      correspondant: assurances,
      categorie: cat("ADMIN"),
      priorite: "BASSE",
      statut: "EN_ATTENTE",
      responsable: mamadou,
      recuLe: il_y_a({ jours: 2 }),
      echeance: dans({ jours: 3 }),
      prochaineRelanceLe: dans({ jours: 3 }),
    },
    {
      sujet: "Révision tarifaire du poste de livraison haute tension",
      extrait: "À compter du prochain trimestre, la grille applicable au poste de livraison évolue…",
      correspondant: energieSud,
      categorie: cat("ADMIN"),
      priorite: "NORMALE",
      statut: "EN_ATTENTE",
      responsable: bintou,
      recuLe: il_y_a({ jours: 3 }),
      echeance: dans({ heures: 30 }),
      prochaineRelanceLe: dans({ heures: 30 }),
      aPieceJointe: true,
    },

    // ── À qualifier ─────────────────────────────────────────────────────
    {
      sujet: "Demande de rendez-vous, présentation de nos services d'ingénierie",
      extrait: "Notre cabinet accompagne les opérateurs miniers de la sous-région et souhaiterait…",
      correspondant: geoconseil,
      categorie: cat("COMMERCIAL"),
      priorite: "BASSE",
      statut: "A_QUALIFIER",
      recuLe: il_y_a({ heures: 2 }),
    },
    {
      sujet: "Relance facture FA-2026-1187",
      extrait: "Sauf erreur de notre part, la facture ci-dessous demeure impayée à ce jour…",
      correspondant: sahelEquip,
      categorie: cat("ADMIN"),
      priorite: "NORMALE",
      statut: "A_QUALIFIER",
      recuLe: il_y_a({ heures: 4 }),
      aPieceJointe: true,
    },
    {
      sujet: "Nouvelle grille de fret depuis Dakar",
      extrait: "Veuillez trouver notre grille tarifaire révisée applicable au 1er octobre…",
      correspondant: transitSahel,
      categorie: cat("APPRO"),
      priorite: "BASSE",
      statut: "A_QUALIFIER",
      recuLe: il_y_a({ heures: 6 }),
      aPieceJointe: true,
    },

    // ── Répondus ────────────────────────────────────────────────────────
    {
      sujet: "Confirmation de commande, pièces d'usure concasseur",
      extrait: "Nous accusons réception de votre bon de commande n° BC-2026-0442…",
      correspondant: foragex,
      categorie: cat("APPRO"),
      priorite: "NORMALE",
      statut: "REPONDU",
      responsable: fatoumata,
      recuLe: il_y_a({ jours: 4 }),
      echeance: il_y_a({ jours: 2 }),
      reponduLe: il_y_a({ heures: 4 }),
      nbRelances: 1,
      derniereRelanceLe: il_y_a({ jours: 1 }),
    },
    {
      sujet: "Attestation de régularité fiscale, renouvellement",
      extrait: "Votre demande d'attestation a été instruite, le document est disponible…",
      correspondant: impots,
      categorie: cat("ADMIN"),
      priorite: "NORMALE",
      statut: "REPONDU",
      responsable: bintou,
      recuLe: il_y_a({ jours: 6 }),
      echeance: il_y_a({ jours: 3 }),
      reponduLe: il_y_a({ heures: 26 }),
    },
    {
      sujet: "Planning d'intervention groupe électrogène de secours",
      extrait: "Notre technicien peut intervenir mercredi ou jeudi, merci de nous indiquer…",
      correspondant: sahelEquip,
      categorie: cat("TECHNIQUE"),
      priorite: "NORMALE",
      statut: "REPONDU",
      responsable: seydou,
      recuLe: il_y_a({ jours: 3 }),
      echeance: il_y_a({ jours: 1 }),
      reponduLe: il_y_a({ heures: 30 }),
    },
    {
      sujet: "Avenant au contrat de transport, clause de carburant",
      extrait: "Comme discuté, voici l'avenant intégrant la clause d'indexation carburant…",
      correspondant: transitSahel,
      categorie: cat("COMMERCIAL"),
      priorite: "NORMALE",
      statut: "REPONDU",
      responsable: mamadou,
      recuLe: il_y_a({ jours: 7 }),
      echeance: il_y_a({ jours: 5 }),
      reponduLe: il_y_a({ jours: 2 }),
      nbRelances: 2,
      derniereRelanceLe: il_y_a({ jours: 3 }),
      aPieceJointe: true,
    },

    // ── Archivés ────────────────────────────────────────────────────────
    {
      sujet: "Procès-verbal de réception, station de pompage",
      extrait: "Veuillez trouver le procès-verbal signé des deux parties…",
      correspondant: sahelEquip,
      categorie: cat("TECHNIQUE"),
      priorite: "NORMALE",
      statut: "ARCHIVE",
      responsable: seydou,
      recuLe: il_y_a({ jours: 24 }),
      echeance: il_y_a({ jours: 22 }),
      reponduLe: il_y_a({ jours: 21 }),
      aPieceJointe: true,
    },
    {
      sujet: "Quitus douanier campagne d'importation 2025",
      extrait: "Le quitus vous est délivré au titre des opérations de l'exercice écoulé…",
      correspondant: douanes,
      categorie: cat("DATE_BUTOIR"),
      priorite: "HAUTE",
      statut: "ARCHIVE",
      responsable: bintou,
      recuLe: il_y_a({ jours: 31 }),
      echeance: il_y_a({ jours: 28 }),
      reponduLe: il_y_a({ jours: 27 }),
      nbRelances: 1,
      aPieceJointe: true,
    },
    {
      sujet: "Clôture du dossier de sinistre 2026-114",
      extrait: "Le dossier est clos, l'indemnisation a été virée sur le compte indiqué…",
      correspondant: assurances,
      categorie: cat("ADMIN"),
      priorite: "BASSE",
      statut: "ARCHIVE",
      responsable: mamadou,
      recuLe: il_y_a({ jours: 40 }),
      echeance: il_y_a({ jours: 37 }),
      reponduLe: il_y_a({ jours: 36 }),
    },
    {
      sujet: "Rapport d'audit énergétique du site",
      extrait: "Le rapport définitif intègre vos observations du mois dernier…",
      correspondant: geoconseil,
      categorie: cat("TECHNIQUE"),
      priorite: "NORMALE",
      statut: "ARCHIVE",
      responsable: mamadou,
      recuLe: il_y_a({ jours: 52 }),
      echeance: il_y_a({ jours: 49 }),
      reponduLe: il_y_a({ jours: 47 }),
      aPieceJointe: true,
    },
  ];

  let n = 0;
  for (const d of defs) {
    n++;
    const echange = await prisma.echange.create({
      data: {
        boiteId: boite.id,
        conversationId: `AAQk-demo-${String(n).padStart(3, "0")}`,
        sujet: d.sujet,
        extrait: d.extrait,
        webLink: "https://outlook.office365.com/",
        correspondantId: d.correspondant.id,
        categorieId: d.categorie,
        priorite: d.priorite,
        statut: d.statut,
        responsableId: d.responsable?.id ?? null,
        recuLe: d.recuLe,
        echeance: d.echeance ?? null,
        dateButoir: d.dateButoir ?? null,
        prochaineRelanceLe: d.prochaineRelanceLe ?? null,
        derniereRelanceLe: d.derniereRelanceLe ?? null,
        nbRelances: d.nbRelances ?? 0,
        reponduLe: d.reponduLe ?? null,
        canalReponse: d.reponduLe ? "MAIL" : null,
        reponseParId: d.reponduLe ? (d.responsable?.id ?? null) : null,
        aPieceJointe: d.aPieceJointe ?? false,
        archiveLe: d.statut === "ARCHIVE" ? d.reponduLe : null,
        archiveUrl:
          d.statut === "ARCHIVE"
            ? `https://stockage.exemple-mining.ml/archives/${n}`
            : null,
      },
    });

    // Message entrant d'origine
    await prisma.message.create({
      data: {
        echangeId: echange.id,
        boiteId: boite.id,
        internetMessageId: `<demo-${n}@${d.correspondant.email.split("@")[1]}>`,
        sens: "ENTRANT",
        expediteur: d.correspondant.email,
        destinataires: [boite.adresse],
        sujet: d.sujet,
        extrait: d.extrait,
        dateMessage: d.recuLe,
        aPieceJointe: d.aPieceJointe ?? false,
      },
    });

    // Relances effectivement envoyées
    for (let i = 1; i <= (d.nbRelances ?? 0); i++) {
      await prisma.relance.create({
        data: {
          echangeId: echange.id,
          ordre: i,
          destinataireId: d.responsable!.id,
          envoyeeLe: DateTime.fromJSDate(d.derniereRelanceLe ?? d.recuLe)
            .minus({ days: (d.nbRelances ?? 1) - i })
            .toJSDate(),
          cleIdempotence: `demo-${n}-relance-${i}`,
        },
      });
    }
  }

  // ── Travaux planifiés pour les échanges en attente ──────────────────────
  const aRelancer = await prisma.echange.findMany({
    where: { prochaineRelanceLe: { not: null }, statut: { in: ["EN_ATTENTE", "RELANCE"] } },
  });
  for (const e of aRelancer) {
    await prisma.travailPlanifie.create({
      data: {
        type: "RELANCE",
        echangeId: e.id,
        executerA: e.prochaineRelanceLe!,
        charge: { ordre: e.nbRelances + 1 },
        cleIdempotence: `demo-travail-${e.id}`,
      },
    });
  }

  // ── Journal d'activité ──────────────────────────────────────────────────
  const echanges = await prisma.echange.findMany({ orderBy: { numero: "asc" } });
  const evenements: {
    type: "REPONSE_DETECTEE" | "RELANCE_ENVOYEE" | "MAIL_ATTRIBUE" | "MAIL_ARCHIVE" | "MAIL_QUALIFIE";
    libelle: string;
    echangeId: string;
    creeLe: Date;
    acteur: "SYSTEME" | "UTILISATEUR";
    utilisateurId?: string;
  }[] = [];

  const parSujet = (debut: string) => {
    const e = echanges.find((x) => x.sujet.startsWith(debut));
    if (!e) throw new Error(`Échange introuvable pour le journal : ${debut}`);
    return e;
  };

  evenements.push(
    {
      type: "REPONSE_DETECTEE",
      libelle: "Re: Confirmation de commande, pièces d'usure concasseur",
      echangeId: parSujet("Confirmation de commande").id,
      creeLe: il_y_a({ heures: 4 }),
      acteur: "SYSTEME",
    },
    {
      type: "RELANCE_ENVOYEE",
      libelle: "Relance 2 · Mainlevée conteneur MSKU 4471",
      echangeId: parSujet("Mainlevée conteneur").id,
      creeLe: il_y_a({ jours: 1 }),
      acteur: "SYSTEME",
    },
    {
      type: "MAIL_ATTRIBUE",
      libelle: "Programme de livraison gasoil attribué à Fatoumata Diallo",
      echangeId: parSujet("Programme de livraison").id,
      creeLe: il_y_a({ heures: 19 }),
      acteur: "UTILISATEUR",
      utilisateurId: mamadou.id,
    },
    {
      type: "REPONSE_DETECTEE",
      libelle: "Re: Attestation de régularité fiscale",
      echangeId: parSujet("Attestation de régularité").id,
      creeLe: il_y_a({ heures: 26 }),
      acteur: "SYSTEME",
    },
    {
      type: "MAIL_ARCHIVE",
      libelle: "Procès-verbal de réception, station de pompage",
      echangeId: parSujet("Procès-verbal de réception").id,
      creeLe: il_y_a({ jours: 21 }),
      acteur: "SYSTEME",
    },
    {
      type: "MAIL_QUALIFIE",
      libelle: "Régularisation déclaration en détail · catégorie Date butoir",
      echangeId: parSujet("Régularisation déclaration").id,
      creeLe: il_y_a({ jours: 4 }),
      acteur: "UTILISATEUR",
      utilisateurId: bintou.id,
    }
  );

  for (const ev of evenements) {
    await prisma.evenement.create({ data: ev });
  }

  // ── Récapitulatif ───────────────────────────────────────────────────────
  const parStatut = await prisma.echange.groupBy({
    by: ["statut"],
    _count: { _all: true },
  });

  console.log(`\n${defs.length} échanges créés, répartis ainsi :`);
  for (const s of parStatut.sort((a, b) => a.statut.localeCompare(b.statut))) {
    console.log(`  ${s.statut.padEnd(16)} ${s._count._all}`);
  }
  console.log(`\n${feries.length} jours fériés, 4 utilisateurs, 10 correspondants.`);
  console.log("Jeu de démonstration en place.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
