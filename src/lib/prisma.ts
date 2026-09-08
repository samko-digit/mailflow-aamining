/**
 * MailFlow · Client Prisma
 *
 * Depuis Prisma 7, le client ne lit plus l'URL depuis le schéma : la
 * connexion passe par un adaptateur de pilote. C'est ici, et nulle part
 * ailleurs, que la base est ouverte.
 *
 * Deux points de performance sont réglés dans ce fichier :
 *
 *  - P11 · réserve de connexions. Sans dimensionnement explicite, chaque
 *    traitement ouvre sa propre connexion et PostgreSQL atteint sa limite
 *    alors qu'il n'est chargé à rien. Cette panne ressemble à un problème
 *    de performance et n'en est pas un.
 *
 *  - Le singleton sur globalThis évite qu'un rechargement à chaud en
 *    développement n'ouvre une réserve de plus à chaque sauvegarde.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL absente. Renseigner le fichier .env (voir .env.example)."
  );
}

function creerClient() {
  const adapter = new PrismaPg({
    connectionString,
    // Dimensionner en fonction du nombre d'exécutants, pas au hasard :
    // une instance web + un ordonnanceur tiennent largement dans dix
    // connexions pour le volume attendu.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Une connexion inactive plus longtemps que cela est rendue au serveur.
    idleTimeoutMillis: 30_000,
    // Échouer vite plutôt que faire attendre une requête indéfiniment.
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

const global_ = globalThis as unknown as {
  prisma?: ReturnType<typeof creerClient>;
};

export const prisma = global_.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  global_.prisma = prisma;
}
