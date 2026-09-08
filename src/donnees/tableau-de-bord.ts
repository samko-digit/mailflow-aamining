/**
 * MailFlow · Données du tableau de bord
 *
 * UNE requête par écran, pas une par ligne affichée (recommandation P16).
 * Tout part en parallèle, rien n'est rechargé au rendu de chaque carte.
 *
 * Rappel de conception : « En retard » n'est pas un statut stocké. C'est
 * `echeance < maintenant` sur un état actif, et l'index partiel
 * `echange_actif_echeance_idx` rend ce calcul gratuit.
 */

import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";
import { STATUTS_ACTIFS } from "../domaine/cycle-echange";

const ZONE = "Africa/Bamako";
const ACTIFS = [...STATUTS_ACTIFS];

export type LigneATraiter = Awaited<
  ReturnType<typeof chargerTableauDeBord>
>["aTraiter"][number];

export async function chargerTableauDeBord(recherche?: string) {
  const maintenant = new Date();
  const q = (recherche ?? "").trim();

  // Un nombre seul désigne un numéro d'échange. C'est la « référence
  // parlante, citée en réunion » du modèle, et c'est aussi la cible du lien
  // que porte chaque relance : sans elle, « voir la fiche de suivi » ouvre
  // une liste de deux cents dossiers, et le lien perd sa crédibilité au
  // premier clic.
  const numero = /^#?\d{1,9}$/.test(q) ? Number(q.replace("#", "")) : null;

  // Recherche plein texte sur la colonne générée `recherche` (index GIN),
  // complétée par une recherche partielle sur le correspondant (index trigramme).
  // Voir prisma/sql/02_recherche.sql.
  const idsTrouves =
    numero !== null
      ? (
          await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM echange WHERE numero = ${numero} LIMIT 1`
        ).map((r) => r.id)
      : q.length > 1
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

  // En recherche on ne se limite plus aux états actifs : on cherche partout.
  const filtreListe = idsTrouves
    ? { id: { in: idsTrouves } }
    : { statut: { in: ACTIFS } };
  const zone = DateTime.fromJSDate(maintenant, { zone: ZONE });
  const debutDuJour = zone.startOf("day").toJSDate();
  const finDuJour = zone.endOf("day").toJSDate();

  const [
    totalSuivis,
    parStatut,
    enRetard,
    relancesDuJour,
    reponsesDuJour,
    aTraiter,
    parResponsable,
    sansResponsable,
    utilisateurs,
    categories,
    evenements,
    prochaineRelance,
    relancesDues,
    prochainTravail,
  ] = await Promise.all([
    prisma.echange.count({ where: { statut: { not: "HORS_PERIMETRE" } } }),

    prisma.echange.groupBy({
      by: ["statut"],
      _count: { _all: true },
      where: { statut: { not: "HORS_PERIMETRE" } },
    }),

    prisma.echange.count({
      where: { statut: { in: ACTIFS }, echeance: { lt: maintenant } },
    }),

    prisma.relance.count({
      where: { statut: "ENVOYEE", envoyeeLe: { gte: debutDuJour } },
    }),

    prisma.evenement.count({
      where: { type: "REPONSE_DETECTEE", creeLe: { gte: debutDuJour } },
    }),

    prisma.echange.findMany({
      where: filtreListe,
      orderBy: [{ echeance: { sort: "asc", nulls: "last" } }, { recuLe: "asc" }],
      take: idsTrouves ? 12 : 8,
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

    prisma.echange.groupBy({
      by: ["responsableId"],
      _count: { _all: true },
      where: { statut: { in: ACTIFS }, responsableId: { not: null } },
    }),

    prisma.echange.count({
      where: { statut: { in: ACTIFS }, responsableId: null },
    }),

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

    prisma.evenement.findMany({
      orderBy: { creeLe: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        libelle: true,
        creeLe: true,
        echange: { select: { numero: true } },
      },
    }),

    prisma.echange.findFirst({
      where: { statut: { in: ACTIFS }, prochaineRelanceLe: { not: null } },
      orderBy: { prochaineRelanceLe: "asc" },
      select: {
        id: true,
        numero: true,
        sujet: true,
        prochaineRelanceLe: true,
        responsable: { select: { nomComplet: true } },
        correspondant: { select: { organisation: true } },
      },
    }),

    prisma.echange.count({
      where: {
        statut: { in: ACTIFS },
        prochaineRelanceLe: { not: null, lte: finDuJour },
      },
    }),

    prisma.travailPlanifie.findFirst({
      where: { statut: "EN_ATTENTE" },
      orderBy: { executerA: "asc" },
      select: { executerA: true, type: true },
    }),
  ]);

  const compte = (statut: string) =>
    parStatut.find((s) => s.statut === statut)?._count._all ?? 0;

  const nomsUtilisateurs = new Map(utilisateurs.map((u) => [u.id, u]));

  const charge = parResponsable
    .map((r) => ({
      id: r.responsableId!,
      nom: nomsUtilisateurs.get(r.responsableId!)?.nomComplet ?? "Inconnu",
      initiales: nomsUtilisateurs.get(r.responsableId!)?.initiales ?? "?",
      nombre: r._count._all,
    }))
    .sort((a, b) => b.nombre - a.nombre);

  if (sansResponsable > 0) {
    charge.push({
      id: "aucun",
      nom: "Non attribués",
      initiales: "—",
      nombre: sansResponsable,
    });
  }

  const totalCharge = charge.reduce((s, c) => s + c.nombre, 0);

  return {
    maintenant,
    recherche: q,
    enRecherche: idsTrouves !== null,
    utilisateurs,
    categories,
    indicateurs: {
      totalSuivis,
      enAttente: compte("EN_ATTENTE"),
      enRetard,
      relancesDuJour,
      reponsesDuJour,
    },
    menu: {
      enAttente: compte("EN_ATTENTE"),
      relancesDues,
      repondus: compte("REPONDU"),
    },
    // Uniquement des statuts STOCKÉS, donc mutuellement exclusifs : les parts
    // somment exactement au total. « En retard » n'y figure pas, c'est une
    // dérivation qui recouperait « En attente » et « Relancés ». Elle reste
    // un indicateur à part.
    repartition: [
      { cle: "EN_ATTENTE", libelle: "En attente", nombre: compte("EN_ATTENTE"), couleur: "var(--jaune)" },
      { cle: "RELANCE", libelle: "Relancés", nombre: compte("RELANCE"), couleur: "var(--bleu)" },
      { cle: "REPONDU", libelle: "Répondus", nombre: compte("REPONDU"), couleur: "var(--vert)" },
      { cle: "ESCALADE", libelle: "Escaladés", nombre: compte("ESCALADE"), couleur: "var(--violet)" },
      { cle: "A_QUALIFIER", libelle: "À qualifier", nombre: compte("A_QUALIFIER"), couleur: "var(--cyan)" },
      { cle: "ARCHIVE", libelle: "Archivés", nombre: compte("ARCHIVE"), couleur: "var(--gris-plein)" },
    ].filter((r) => r.nombre > 0),
    aTraiter,
    charge,
    totalCharge,
    evenements,
    prochaineRelance,
    prochainTravail,
  };
}
