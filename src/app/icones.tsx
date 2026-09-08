/** MailFlow · Pictogrammes. Trait de 1,8, couleur héritée du contexte. */

type P = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconeAccueil = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /></svg>
);
export const IconeHorloge = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconeRelance = (p: P) => (
  <svg {...base} {...p}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4.5h-4.5" /></svg>
);
export const IconeValide = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-4.9" /></svg>
);
export const IconeMail = (p: P) => (
  <svg {...base} {...p}><rect x="2.8" y="5" width="18.4" height="14" rx="2.4" /><path d="m3.5 7.5 8.5 6 8.5-6" /></svg>
);
export const IconeArchive = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="4.5" rx="1.4" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></svg>
);
export const IconeUtilisateurs = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8.5" r="3.3" /><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16.5 6.4a3.2 3.2 0 0 1 0 6.2M17 14.8c2.2.5 3.6 2.3 3.6 4.7" /></svg>
);
export const IconeRegles = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h11M18 7h2M4 17h3M10 17h10" /><circle cx="16.5" cy="7" r="2.2" /><circle cx="8.5" cy="17" r="2.2" /></svg>
);
export const IconeReglages = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z" /></svg>
);
export const IconeJournal = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" rx="2.2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></svg>
);
export const IconeRecherche = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);
export const IconeCloche = (p: P) => (
  <svg {...base} {...p}><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5" /><path d="M13.7 19.5a2 2 0 0 1-3.4 0" /></svg>
);
export const IconeSoleil = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></svg>
);
export const IconeCalendrier = (p: P) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconeAlerte = (p: P) => (
  <svg {...base} {...p}><path d="M12 4.5 2.8 20h18.4z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IconeOeil = (p: P) => (
  <svg {...base} {...p}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconePoints = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="5.5" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="18.5" r="1.3" fill="currentColor" /></svg>
);
export const IconeTrombone = (p: P) => (
  <svg {...base} {...p} strokeWidth={1.6}><path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.8-7.8a3.1 3.1 0 0 1 4.4 4.4l-7.7 7.7a1.6 1.6 0 0 1-2.2-2.2l7-7" /></svg>
);
export const IconeChevronBas = (p: P) => (
  <svg {...base} {...p}><path d="m6.5 9.5 5.5 5 5.5-5" /></svg>
);
export const IconeChevronGauche = (p: P) => (
  <svg {...base} {...p}><path d="m14 6.5-5.5 5.5 5.5 5.5" /></svg>
);
export const IconeChevronDroite = (p: P) => (
  <svg {...base} {...p}><path d="m10 6.5 5.5 5.5L10 17.5" /></svg>
);
export const IconeFleche = (p: P) => (
  <svg {...base} {...p}><path d="M4.5 12h14M13.5 6.5 19.5 12l-6 5.5" /></svg>
);
export const IconeCamembert = (p: P) => (
  <svg {...base} {...p}><path d="M12 3.5A8.5 8.5 0 1 0 20.5 12H12z" /><path d="M14.5 2.2A8.6 8.6 0 0 1 21.8 9.5h-7.3z" /></svg>
);
export const IconeEquipe = (p: P) => (
  <svg {...base} {...p}><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M3 19c0-2.9 2.5-4.8 5.5-4.8s5.5 1.9 5.5 4.8" /><path d="M16 14.6c2.6 0 4.6 1.6 4.6 4" /></svg>
);
export const IconePouls = (p: P) => (
  <svg {...base} {...p}><path d="M3 12.5h4l2.5-6 4 12L16 12.5h5" /></svg>
);
export const IconeRobot = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4.5V8M8.5 13v1.5M15.5 13v1.5M2.5 12.5v3M21.5 12.5v3" /><circle cx="12" cy="3.6" r="1.2" /></svg>
);
export const IconeEclair = (p: P) => (
  <svg {...base} {...p}><path d="M13.5 2.5 4.5 13.8h6.2l-1.2 7.7 9-11.3h-6.2z" /></svg>
);
export const IconeCoche = (p: P) => (
  <svg {...base} {...p} strokeWidth={2.6}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
);
export const IconeCarre = (p: P) => (
  <svg {...base} {...p}><rect x="4.5" y="4.5" width="15" height="15" rx="3.2" /></svg>
);
