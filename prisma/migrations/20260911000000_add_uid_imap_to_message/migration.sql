-- Ajoute uidImap au modèle Message pour permettre la récupération directe par UID IMAP
-- nécessaire pour la fonctionnalité de transfert d'emails

-- Migration additive : ne supprime aucune colonne, ne modifie aucune donnée existante
-- Si la colonne existe déjà (suite à un prisma db pull), cette migration est idempotente
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message' 
    AND column_name = 'uid_imap'
  ) THEN
    ALTER TABLE "message" ADD COLUMN "uid_imap" INTEGER;
    
    -- Commentaire pour documenter la colonne
    COMMENT ON COLUMN "message"."uid_imap" IS 'UID IMAP du message, pour récupération directe via IMAP nécessaire au transfert';
  END IF;
END $$;
