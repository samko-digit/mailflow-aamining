-- ═══════════════════════════════════════════════════════════════════════════
--  MailFlow · Index partiels
--
--  Prisma ne sait pas exprimer un index partiel (clause WHERE). Ces index
--  s'ajoutent donc à la main dans une migration.
--
--  POURQUOI ILS COMPTENT : au bout de deux ans, plus de 95 % des lignes de
--  `echange` sont archivées et n'intéressent plus aucune requête courante.
--  Un index complet grossit avec l'historique ; un index partiel reste
--  petit et tient en mémoire quel que soit le volume total. C'est la mesure
--  qui empêche le système de ralentir en vieillissant, et elle coûte une
--  ligne de migration.
--
--  MODE D'EMPLOI
--    1. Créer une migration vide :
--         npx prisma migrate dev --create-only --name index_partiels
--    2. Coller ce contenu dans le fichier migration.sql généré.
--    3. Appliquer : npx prisma migrate dev
--
--  ⚠ CONCURRENTLY est volontairement absent : Prisma exécute chaque migration
--    dans une transaction, et CREATE INDEX CONCURRENTLY ne peut pas s'y
--    exécuter. Sur une base neuve, l'index se crée instantanément.
--    Pour ajouter un index à une base déjà volumineuse et en service, le
--    faire hors migration, à la main, avec CONCURRENTLY.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. La requête la plus sollicitée du système ────────────────────────────
-- Lue une fois par minute par l'ordonnanceur. Doit lire un index minuscule
-- ne contenant que les travaux en attente, jamais parcourir l'historique.
CREATE INDEX IF NOT EXISTS travail_a_executer_idx
  ON travail_planifie (executer_a)
  WHERE statut = 'EN_ATTENTE';

-- Reprise après incident : retrouver les travaux verrouillés puis abandonnés
-- par un exécutant qui s'est arrêté en cours de route.
CREATE INDEX IF NOT EXISTS travail_verrou_perime_idx
  ON travail_planifie (verrou_a)
  WHERE statut = 'EN_COURS';

-- ── 2. Échanges actifs ─────────────────────────────────────────────────────
-- « En retard » n'est pas un statut stocké : c'est echeance < now() sur un
-- état actif. Cet index rend ce calcul gratuit.
CREATE INDEX IF NOT EXISTS echange_actif_echeance_idx
  ON echange (echeance)
  WHERE statut IN ('A_QUALIFIER', 'EN_ATTENTE', 'RELANCE', 'ESCALADE');

-- Vue « Mes échanges » et compteur « Mails par responsable ».
CREATE INDEX IF NOT EXISTS echange_actif_responsable_idx
  ON echange (responsable_id, echeance)
  WHERE statut IN ('EN_ATTENTE', 'RELANCE', 'ESCALADE');

-- Écran « À qualifier », trié du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS echange_a_qualifier_idx
  ON echange (recu_le DESC)
  WHERE statut = 'A_QUALIFIER';

-- Encart « Prochaine relance » du tableau de bord.
CREATE INDEX IF NOT EXISTS echange_prochaine_relance_idx
  ON echange (prochaine_relance_le)
  WHERE prochaine_relance_le IS NOT NULL
    AND statut IN ('EN_ATTENTE', 'RELANCE');

-- Alerte RG-12 : un échange sans propriétaire au-delà de 4 heures ouvrées
-- est un incident.
CREATE INDEX IF NOT EXISTS echange_sans_responsable_idx
  ON echange (recu_le)
  WHERE responsable_id IS NULL
    AND statut IN ('A_QUALIFIER', 'EN_ATTENTE');

-- ── 3. Contrôles de cohérence nocturnes ────────────────────────────────────
-- Rapprochement entre le compteur dénormalisé et la table des relances.
CREATE INDEX IF NOT EXISTS relance_echange_idx
  ON relance (echange_id, ordre)
  WHERE statut = 'ENVOYEE';

-- ── 4. Garde-fou métier ────────────────────────────────────────────────────
-- Un échange clos sans suite doit porter un motif. La règle est dans le code,
-- la contrainte est dans la base : c'est elle qui a le dernier mot.
ALTER TABLE echange
  DROP CONSTRAINT IF EXISTS echange_motif_obligatoire;
ALTER TABLE echange
  ADD CONSTRAINT echange_motif_obligatoire
  CHECK (statut <> 'SANS_SUITE' OR motif_cloture IS NOT NULL);

-- Un échange répondu doit porter une date de réponse.
ALTER TABLE echange
  DROP CONSTRAINT IF EXISTS echange_reponse_datee;
ALTER TABLE echange
  ADD CONSTRAINT echange_reponse_datee
  CHECK (statut <> 'REPONDU' OR repondu_le IS NOT NULL);

-- Le compteur de relances ne peut pas être négatif.
ALTER TABLE echange
  DROP CONSTRAINT IF EXISTS echange_nb_relances_positif;
ALTER TABLE echange
  ADD CONSTRAINT echange_nb_relances_positif
  CHECK (nb_relances >= 0);
