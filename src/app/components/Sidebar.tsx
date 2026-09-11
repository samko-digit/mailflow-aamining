/**
 * MailFlow · Sidebar réutilisable
 *
 * Composant de navigation latéral avec gestion des états actifs.
 * Affiche les compteurs dynamiques et permet la navigation entre les pages.
 */

import { prisma } from "../../lib/prisma";
import {
  IconeAccueil,
  IconeHorloge,
  IconeRelance,
  IconeValide,
  IconeMail,
  IconeArchive,
  IconeUtilisateurs,
  IconeRegles,
  IconeReglages,
  IconeJournal,
} from "../icones";

interface SidebarProps {
  routeActuelle: string;
  compteurs?: {
    enAttente?: number;
    relancesDues?: number;
    repondus?: number;
  };
}

async function utilisateurCourant() {
  const u = await prisma.utilisateur.findFirst({
    where: { role: "ADMINISTRATEUR", actif: true },
    select: { nomComplet: true, role: true, initiales: true },
  });
  return u || { nomComplet: "Utilisateur inconnu", role: "LECTEUR", initiales: "?" };
}

export async function Sidebar({ routeActuelle, compteurs = {} }: SidebarProps) {
  const { enAttente = 0, relancesDues = 0, repondus = 0 } = compteurs;
  const utilisateur = await utilisateurCourant();

  const estActif = (route: string) => {
    // Pour les routes dynamiques, on ne met rien en actif
    if (routeActuelle.startsWith("/echange/")) {
      return "";
    }
    return routeActuelle === route ? "actif" : "";
  };

  return (
    <aside className="lateral">
      <div className="marque">
        <div className="logo">M</div>
        <div>
          <div className="nom">MailFlow</div>
          <div className="baseline">Suivi · Relance · Résultats</div>
        </div>
      </div>

      <nav className="groupe-nav">
        <a href="/" className={`nav-item ${estActif("/")}`}>
          <IconeAccueil /> Tableau de bord
        </a>
      </nav>

      <nav className="groupe-nav">
        <div className="groupe-titre">Principal</div>
        <a href="/mails-en-attente" className={`nav-item ${estActif("/mails-en-attente")}`}>
          <IconeHorloge /> Mails en attente
          <em className="compteur">{enAttente}</em>
        </a>
        <a href="/relances" className={`nav-item ${estActif("/relances")}`}>
          <IconeRelance /> Relances
          <em className={`compteur ${relancesDues > 0 ? "alerte" : ""}`}>{relancesDues}</em>
        </a>
        <a href="/repondus" className={`nav-item ${estActif("/repondus")}`}>
          <IconeValide /> Répondus
          <em className="compteur">{repondus}</em>
        </a>
      </nav>

      <nav className="groupe-nav">
        <div className="groupe-titre">Archives</div>
        <a href="/emails" className={`nav-item ${estActif("/emails")}`}>
          <IconeMail /> Tous les e-mails
        </a>
        <a href="/archives" className={`nav-item ${estActif("/archives")}`}>
          <IconeArchive /> Archives
        </a>
      </nav>

      <nav className="groupe-nav">
        <div className="groupe-titre">Administration</div>
        <a href="/utilisateurs" className={`nav-item ${estActif("/utilisateurs")}`}>
          <IconeUtilisateurs /> Utilisateurs
        </a>
        <a href="/regles-relance" className={`nav-item ${estActif("/regles-relance")}`}>
          <IconeRegles /> Règles de relance
        </a>
        <a href="/parametres" className={`nav-item ${estActif("/parametres")}`}>
          <IconeReglages /> Paramètres
        </a>
        <a href="/journal-activite" className={`nav-item ${estActif("/journal-activite")}`}>
          <IconeJournal /> Journal d&apos;activité
        </a>
      </nav>

      <div className="pied">
        <div className="carte-profil">
          <div className="profil-ligne">
            <div className="avatar">{utilisateur.initiales}</div>
            <div>
              <div className="nom">{utilisateur.nomComplet}</div>
              <div className="role">{utilisateur.role}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
