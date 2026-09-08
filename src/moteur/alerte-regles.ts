/**
 * MailFlow · Règles du canal d'alerte
 *
 * Module PUR : quoi envoyer, à qui, et surtout à quelle fréquence. Aucune
 * base, aucun réseau, donc l'anti-répétition se vérifie en simulant quarante-
 * huit passages du moteur au lieu d'attendre quatre heures.
 *
 * La lecture des incidents et l'expédition vivent dans `alerte.ts`.
 *
 * ── POURQUOI CE MODULE EXISTE ─────────────────────────────────────────────
 *
 * Le moteur agit seul : il lit une boîte, écrit des messages au nom de la
 * maison, change l'état des dossiers. Trois de ses issues demandent qu'un
 * humain regarde, et elles n'allaient jusqu'ici que sur la sortie d'erreur
 * d'un processus lancé par une tâche planifiée. Personne ne lit ce fichier.
 *
 *   UN SYSTÈME QUI AGIT SEUL ET QUI ÉCHOUE EN SILENCE EST PIRE QU'UN
 *   SYSTÈME QUI N'AGIT PAS.
 *
 * C'est le principe de la surveillance, retourné contre elle : elle sait
 * tout, et elle ne le dit à personne.
 *
 * ── CE QUI PART PAR COURRIEL, ET CE QUI RESTE À L'ÉCRAN ───────────────────
 *
 * Courriel : ce qui est CASSÉ. Anomalies critiques, relances non remises,
 * dossiers rouverts, incidents techniques. On dérange quelqu'un.
 *
 * Console : ce qui demande de l'ATTENTION. Cent dossiers à qualifier, une
 * catégorie sans destinataire d'escalade. Personne n'est réveillé pour ça, et
 * une boîte qui reçoit une alarme toutes les quatre heures pour un travail en
 * retard devient une boîte dont on filtre les alarmes.
 */

import { DateTime } from "luxon";

/** Une même alarme n'est pas répétée avant ce délai. */
export const SILENCE_HEURES = 4;

/** Au-delà, le récapitulatif est tronqué : on ne lit pas cent lignes. */
const LIGNES_MAX = 15;

export type Alerte = {
  code: string;
  message: string;
};

export type EtatAlertes = {
  /** Dernier envoi par code, en ISO. Sert au silence. */
  derniersEnvois: Record<string, string>;
  /** Dernier incident déjà diffusé. Les suivants sont neufs. */
  filigrane: string | null;
};

export const ETAT_NEUF: EtatAlertes = { derniersEnvois: {}, filigrane: null };

// ── Partie pure : que faut-il envoyer ? ────────────────────────────────────

export function lireEtat(valeur: unknown): EtatAlertes {
  if (!valeur || typeof valeur !== "object") return { ...ETAT_NEUF };
  const o = valeur as Partial<EtatAlertes>;
  return {
    derniersEnvois:
      o.derniersEnvois && typeof o.derniersEnvois === "object"
        ? { ...o.derniersEnvois }
        : {},
    filigrane: typeof o.filigrane === "string" ? o.filigrane : null,
  };
}

/**
 * Retire les alarmes déjà criées récemment.
 *
 * Sans ce filtre, une panne qui dure produit un courriel toutes les cinq
 * minutes, soit près de trois cents par jour. Au troisième, le destinataire
 * crée une règle de tri, et le canal d'alerte est mort sans que personne
 * ne l'ait décidé.
 */
export function aDiffuser(
  candidates: Alerte[],
  etat: EtatAlertes,
  maintenant: Date,
  silenceHeures: number = SILENCE_HEURES
): Alerte[] {
  const seuil = maintenant.getTime() - silenceHeures * 3_600_000;
  const vues = new Set<string>();

  return candidates.filter((a) => {
    if (vues.has(a.code)) return false; // un code, une ligne
    const dernier = etat.derniersEnvois[a.code];
    if (dernier && new Date(dernier).getTime() > seuil) return false;
    vues.add(a.code);
    return true;
  });
}

/** Note les codes qui viennent de partir, et oublie les très anciens. */
export function marquerEnvoyees(
  etat: EtatAlertes,
  envoyees: Alerte[],
  filigraneNeuf: Date | null,
  maintenant: Date
): EtatAlertes {
  const derniersEnvois = { ...etat.derniersEnvois };
  for (const a of envoyees) derniersEnvois[a.code] = maintenant.toISOString();

  // Un code qu'on n'a plus vu depuis une semaine n'a plus à occuper la place :
  // sa prochaine occurrence doit sonner comme une nouveauté.
  const peremption = maintenant.getTime() - 7 * 86_400_000;
  for (const [code, iso] of Object.entries(derniersEnvois)) {
    if (new Date(iso).getTime() < peremption) delete derniersEnvois[code];
  }

  return {
    derniersEnvois,
    filigrane: filigraneNeuf
      ? filigraneNeuf.toISOString()
      : etat.filigrane,
  };
}

/** Compose le récapitulatif. Pur, donc lisible dans un test. */
export function composerRecapitulatif(
  alertes: Alerte[],
  boite: string,
  maintenant: Date,
  urlConsole: string
): { sujet: string; corps: string } {
  const quand = DateTime.fromJSDate(maintenant, { zone: "Africa/Bamako" })
    .setLocale("fr")
    .toFormat("dd/LL/yyyy 'à' HH'h'mm");

  const montrees = alertes.slice(0, LIGNES_MAX);
  const reste = alertes.length - montrees.length;

  const lignes = [
    `Le suivi du courrier de ${boite} signale ${alertes.length} anomalie(s).`,
    `Constaté le ${quand}.`,
    "",
    ...montrees.map((a) => `· [${a.code}] ${a.message}`),
    ...(reste > 0 ? [`· … et ${reste} autre(s), visibles dans la console.`] : []),
    "",
    `Console : ${urlConsole}`,
    "",
    "Ce message n'est pas répété avant quatre heures pour une même anomalie.",
    "Il ne part que pour ce qui est cassé ; ce qui demande seulement de",
    "l'attention reste à l'écran.",
  ];

  const tete = alertes[0]?.code ?? "ALERTE";
  const sujet =
    alertes.length === 1
      ? `MailFlow · ${tete} · ${boite}`
      : `MailFlow · ${alertes.length} anomalies · ${boite}`;

  return { sujet, corps: lignes.join("\n") };
}

/** Adresses de supervision. Vide = les alarmes restent en base et à l'écran. */
export function destinatairesAlerte(
  env: Record<string, string | undefined> = process.env
): string[] {
  return (env.MAILFLOW_ALERTES_A ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}
