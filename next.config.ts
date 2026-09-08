import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma et le pilote PostgreSQL restent hors du paquet serveur :
  // ils chargent des binaires natifs que le compilateur ne doit pas inclure.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
