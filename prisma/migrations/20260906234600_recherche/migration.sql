-- ═══════════════════════════════════════════════════════════════════════════
--  MailFlow · Recherche plein texte
--
--  La barre de recherche de la console (« Rechercher un e-mail, un contact,
--  un sujet… ») s'appuie sur la recherche plein texte native de PostgreSQL.
--  Aucun moteur de recherche séparé n'est nécessaire.
--
--  PÉRIMÈTRE VOLONTAIREMENT BORNÉ : on indexe l'objet et l'extrait, PAS le
--  corps HTML complet des messages. Un index sur l'intégralité des corps
--  peut peser plusieurs fois la taille des données utiles pour un gain de
--  pertinence faible : on retrouve un échange par son correspondant, son
--  objet et sa date, très rarement par une phrase enfouie dans le corps.
--
--  MODE D'EMPLOI : même procédure que 01_index_partiels.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Colonne générée sur l'échange ──────────────────────────────────────────
-- Générée par PostgreSQL, jamais écrite par l'application. Le poids A sur
-- l'objet le fait remonter avant une correspondance trouvée dans l'extrait.
-- Le schéma Prisma la déclare en Unsupported("tsvector") pour que la
-- migration suivante ne la supprime pas.
ALTER TABLE echange
  DROP COLUMN IF EXISTS recherche;

ALTER TABLE echange
  ADD COLUMN recherche tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(sujet, '')),   'A') ||
    setweight(to_tsvector('french', coalesce(extrait, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS echange_recherche_idx
  ON echange USING GIN (recherche);

-- ── Recherche par correspondant ────────────────────────────────────────────
-- Recherche partielle sur l'adresse et l'organisation, insensible à la casse.
-- pg_trgm rend LIKE '%…%' utilisable, ce qu'un index classique ne permet pas.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS correspondant_email_trgm_idx
  ON correspondant USING GIN (lower(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS correspondant_organisation_trgm_idx
  ON correspondant USING GIN (lower(coalesce(organisation, '')) gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════
--  REQUÊTES DE RÉFÉRENCE
--  À utiliser via prisma.$queryRaw : Prisma ne modélise ni tsvector, ni
--  FOR UPDATE SKIP LOCKED.
-- ═══════════════════════════════════════════════════════════════════════════

-- Recherche dans la console, classée par pertinence puis par fraîcheur.
--
--   SELECT e.id, e.numero, e.sujet, e.recu_le,
--          ts_rank(e.recherche, plainto_tsquery('french', $1)) AS score
--     FROM echange e
--    WHERE e.recherche @@ plainto_tsquery('french', $1)
--    ORDER BY score DESC, e.recu_le DESC
--    LIMIT 50;

-- Prise de travaux par l'ordonnanceur. SKIP LOCKED laisse plusieurs
-- exécutants tourner en parallèle sans se bloquer ni envoyer deux fois la
-- même relance. C'est le modèle de file d'attente le plus simple qui soit
-- fiable, et il évite d'exploiter un serveur de messages dédié pour
-- quelques centaines de travaux par jour.
--
--   UPDATE travail_planifie t
--      SET statut = 'EN_COURS', verrou_par = $1, verrou_a = now()
--    WHERE t.id IN (
--            SELECT id FROM travail_planifie
--             WHERE statut = 'EN_ATTENTE' AND executer_a <= now()
--             ORDER BY executer_a
--             LIMIT $2
--             FOR UPDATE SKIP LOCKED
--          )
--   RETURNING *;

-- Contrôle de cohérence nocturne du compteur dénormalisé.
-- Doit ne renvoyer aucune ligne. Toute ligne renvoyée est une anomalie
-- à signaler, pas à corriger silencieusement.
--
--   SELECT e.id, e.numero, e.nb_relances, count(r.id) AS reel
--     FROM echange e
--     LEFT JOIN relance r ON r.echange_id = e.id AND r.statut = 'ENVOYEE'
--    GROUP BY e.id
--   HAVING e.nb_relances <> count(r.id);
