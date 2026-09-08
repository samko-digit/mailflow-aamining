import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailFlow · Suivi, relance, résultats",
  description:
    "Suivi, relance automatique et archivage des courriels engageants.",
};

export default function RacineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
