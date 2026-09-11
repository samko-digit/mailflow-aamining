/**
 * MailFlow · Données pour les pages de navigation
 *
 * Fonctions de chargement de données pour chaque page de l'interface.
 * Chaque fonction retourne les données nécessaires pour son affichage.
 */

import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";
import { STATUTS_ACTIFS } from "../domaine/cycle-echange";

const ACTIFS = [...STATUTS_ACTIFS];

const ZONE = "Africa/Bamako";

/**
 * Charge les échanges en attente (statut EN_ATTENTE)
 */
export async function chargerMailsEnAttente() {
  const maintenant = new Date();
  const debutDuJour = DateTime.fromJSDate(maintenant, { zone: ZONE }).startOf("day").toJSDate();

  const [echanges, total, utilisateurs, categories] = await Promise.all([
    prisma.echange.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: [{ echeance: { sort: "asc", nulls: "last" } }, { recuLe: "asc" }],
      take: 50,
      select: {
        id: true,
        numero: true,
        sujet: true,
        extrait: true,
        statut: true,
        priorite: true,
        recuLe: true,
        echeance: true,
        prochaineRelanceLe: true,
        nbRelances: true,
        aPieceJointe: true,
        webLink: true,
        correspondant: { select: { email: true, organisation: true } },
        responsable: { select: { id: true, nomComplet: true, initiales: true } },
        categorie: { select: { id: true, libelle: true, couleur: true } },
      },
    }),
    prisma.echange.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.utilisateur.findMany({
      where: { actif: true },
      orderBy: { nomComplet: "asc" },
      select: { id: true, nomComplet: true, initiales: true },
    }),
    prisma.categorie.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, code: true, libelle: true },
    }),
  ]);

  return {
    maintenant,
    echanges,
    total,
    utilisateurs,
    categories,
  };
}

/**
 * Charge l'historique des relances
 */
export async function chargerRelances() {
  const maintenant = new Date();

  const [relances, total] = await Promise.all([
    prisma.relance.findMany({
      orderBy: { envoyeeLe: "desc" },
      take: 50,
      select: {
        id: true,
        ordre: true,
        statut: true,
        envoyeeLe: true,
        messageIdEnvoye: true,
        erreur: true,
        echange: {
          select: {
            id: true,
            numero: true,
            sujet: true,
            statut: true,
            correspondant: { select: { email: true, organisation: true } },
          },
        },
        destinataire: {
          select: { id: true, nomComplet: true, initiales: true },
        },
        modele: {
          select: { code: true, libelle: true },
        },
      },
    }),
    prisma.relance.count(),
  ]);

  return {
    maintenant,
    relances,
    total,
  };
}

/**
 * Charge les échanges répondus (statut REPONDU)
 */
export async function chargerRepondus() {
  const maintenant = new Date();

  const [echanges, total, utilisateurs] = await Promise.all([
    prisma.echange.findMany({
      where: { statut: "REPONDU" },
      orderBy: { reponduLe: "desc" },
      take: 50,
      select: {
        id: true,
        numero: true,
        sujet: true,
        extrait: true,
        statut: true,
        priorite: true,
        recuLe: true,
        reponduLe: true,
        canalReponse: true,
        aPieceJointe: true,
        webLink: true,
        correspondant: { select: { email: true, organisation: true } },
        responsable: { select: { id: true, nomComplet: true, initiales: true } },
        categorie: { select: { id: true, libelle: true, couleur: true } },
      },
    }),
    prisma.echange.count({ where: { statut: "REPONDU" } }),
    prisma.utilisateur.findMany({
      where: { actif: true },
      orderBy: { nomComplet: "asc" },
      select: { id: true, nomComplet: true, initiales: true },
    }),
  ]);

  return {
    maintenant,
    echanges,
    total,
    utilisateurs,
  };
}

/**
 * Charge tous les échanges avec recherche
 */
export async function chargerTousEmails(recherche?: string) {
  const maintenant = new Date();
  const q = (recherche ?? "").trim();

  // Recherche plein texte similaire au tableau de bord
  const idsTrouves =
    q.length > 1
      ? (
          await prisma.$queryRaw<{ id: string }[]>`
            SELECT e.id
              FROM echange e
              JOIN correspondant c ON c.id = e.correspondant_id
             WHERE e.recherche @@ plainto_tsquery('french', ${q})
                OR lower(c.email) LIKE ${"%" + q.toLowerCase() + "%"}
                OR lower(coalesce(c.organisation, '')) LIKE ${"%" + q.toLowerCase() + "%"}
             LIMIT 200`
        ).map((r) => r.id)
      : null;

  const filtre = idsTrouves ? { id: { in: idsTrouves } } : {};

  const [echanges, total] = await Promise.all([
    prisma.echange.findMany({
      where: filtre,
      orderBy: { recuLe: "desc" },
      take: idsTrouves ? 50 : 50,
      select: {
        id: true,
        numero: true,
        sujet: true,
        extrait: true,
        statut: true,
        priorite: true,
        recuLe: true,
        echeance: true,
        aPieceJointe: true,
        webLink: true,
        correspondant: { select: { email: true, organisation: true } },
        responsable: { select: { id: true, nomComplet: true, initiales: true } },
        categorie: { select: { id: true, libelle: true, couleur: true } },
      },
    }),
    prisma.echange.count({ where: filtre }),
  ]);

  return {
    maintenant,
    echanges,
    total,
    recherche: q,
    enRecherche: idsTrouves !== null,
  };
}

/**
 * Charge les échanges archivés (statut ARCHIVE)
 */
export async function chargerArchives() {
  const maintenant = new Date();

  const [echanges, total] = await Promise.all([
    prisma.echange.findMany({
      where: { statut: "ARCHIVE" },
      orderBy: { archiveLe: "desc" },
      take: 50,
      select: {
        id: true,
        numero: true,
        sujet: true,
        extrait: true,
        statut: true,
        priorite: true,
        recuLe: true,
        archiveLe: true,
        archiveUrl: true,
        motifCloture: true,
        correspondant: { select: { email: true, organisation: true } },
        responsable: { select: { id: true, nomComplet: true, initiales: true } },
        categorie: { select: { id: true, libelle: true, couleur: true } },
      },
    }),
    prisma.echange.count({ where: { statut: "ARCHIVE" } }),
  ]);

  return {
    maintenant,
    echanges,
    total,
  };
}

/**
 * Charge la liste des utilisateurs
 */
export async function chargerUtilisateurs() {
  const utilisateurs = await prisma.utilisateur.findMany({
    orderBy: { nomComplet: "asc" },
    select: {
      id: true,
      email: true,
      nomComplet: true,
      initiales: true,
      avatarUrl: true,
      fonction: true,
      role: true,
      actif: true,
      creeLe: true,
      modifieLe: true,
      suppleant: {
        select: { id: true, nomComplet: true, initiales: true },
      },
    },
  });

  return {
    utilisateurs,
    total: utilisateurs.length,
  };
}

/**
 * Charge les règles de relance
 */
export async function chargerReglesRelance() {
  const categories = await prisma.categorie.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
    select: {
      id: true,
      code: true,
      libelle: true,
      couleur: true,
      priorite: true,
      aDateButoir: true,
      escaladeVers: {
        select: { id: true, nomComplet: true, initiales: true },
      },
      regles: {
        where: { actif: true },
        orderBy: { ordre: "asc" },
        select: {
          id: true,
          ordre: true,
          delaiJoursOuvres: true,
          destinataire: true,
          copieA: true,
          modele: {
            select: { code: true, libelle: true },
          },
        },
      },
    },
  });

  return {
    categories,
    total: categories.length,
  };
}

/**
 * Charge les paramètres de l'application
 */
export async function chargerParametres() {
  const [parametres, boites, joursFeries] = await Promise.all([
    prisma.parametre.findMany({
      orderBy: { cle: "asc" },
    }),
    prisma.boiteSuivie.findMany({
      orderBy: { libelle: "asc" },
      select: {
        id: true,
        adresse: true,
        libelle: true,
        fournisseur: true,
        actif: true,
        derniereSynchroLe: true,
        derniereAnomalie: true,
      },
    }),
    prisma.jourFerie.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        libelle: true,
      },
    }),
  ]);

  return {
    parametres,
    boites,
    joursFeries,
  };
}

/**
 * Charge le journal d'activité
 */
export async function chargerJournalActivite() {
  const maintenant = new Date();

  const [evenements, total] = await Promise.all([
    prisma.evenement.findMany({
      orderBy: { creeLe: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        acteur: true,
        libelle: true,
        creeLe: true,
        utilisateur: {
          select: { id: true, nomComplet: true, initiales: true },
        },
        echange: {
          select: { id: true, numero: true, sujet: true },
        },
      },
    }),
    prisma.evenement.count(),
  ]);

  return {
    maintenant,
    evenements,
    total,
  };
}

/**
 * Charge les compteurs pour la sidebar
 */
export async function chargerCompteursSidebar() {
  const maintenant = new Date();
  const finDuJour = DateTime.fromJSDate(maintenant, { zone: ZONE }).endOf("day").toJSDate();

  const [enAttente, relancesDues, repondus] = await Promise.all([
    prisma.echange.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.echange.count({
      where: {
        statut: { in: ACTIFS },
        prochaineRelanceLe: { not: null, lte: finDuJour },
      },
    }),
    prisma.echange.count({ where: { statut: "REPONDU" } }),
  ]);

  return {
    enAttente,
    relancesDues,
    repondus,
  };
}
