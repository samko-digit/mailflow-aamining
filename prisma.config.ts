/**
 * MailFlow · Configuration Prisma
 *
 * Depuis Prisma 7, l'URL de connexion ne figure plus dans schema.prisma.
 * Elle est déclarée ici pour les commandes Migrate et Introspect, et passée
 * séparément au client applicatif via un adaptateur (voir src/lib/prisma.ts).
 *
 * Conséquence pratique : la base de production n'est jamais atteignable
 * depuis le schéma seul. C'est une bonne chose.
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
    // Base d'ombre utilisée par Migrate pour détecter les dérives de schéma.
    // Facultative en développement local, requise sur certains hébergeurs
    // qui n'autorisent pas la création de bases à la volée.
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },

  migrations: {
    // `tsx prisma/seed.ts` échoue sous Windows : le lanceur de seed de Prisma
    // ne résout pas les binaires de node_modules/.bin. Passer par node avec
    // le chargeur tsx fonctionne sur les trois systèmes.
    seed: "node --import tsx prisma/seed.ts",
  },
});
