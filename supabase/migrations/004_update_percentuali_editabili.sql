-- Migration 004: Percentuali Editabili per Progetto
-- Description: Permette di modificare le percentuali economiche per ogni progetto
-- Date: 2025-11-28

-- ==========================================
-- STEP 1: Add columns to progetti table
-- ==========================================

ALTER TABLE ristrutturazioni_progetti
ADD COLUMN IF NOT EXISTS perc_oneri_sicurezza DECIMAL(5,4) DEFAULT 0.0200,
ADD COLUMN IF NOT EXISTS perc_spese_generali DECIMAL(5,4) DEFAULT 0.1000,
ADD COLUMN IF NOT EXISTS perc_utile_impresa DECIMAL(5,4) DEFAULT 0.1000,
ADD COLUMN IF NOT EXISTS pratiche_tecniche_importo DECIMAL(10,2) DEFAULT 3200.00,
ADD COLUMN IF NOT EXISTS perc_contingenze DECIMAL(5,4) DEFAULT 0.0700,
ADD COLUMN IF NOT EXISTS perc_iva DECIMAL(5,4) DEFAULT 0.1000;

-- Add comments
COMMENT ON COLUMN ristrutturazioni_progetti.perc_oneri_sicurezza IS 'Percentuale oneri sicurezza (default 2%)';
COMMENT ON COLUMN ristrutturazioni_progetti.perc_spese_generali IS 'Percentuale spese generali (default 10%)';
COMMENT ON COLUMN ristrutturazioni_progetti.perc_utile_impresa IS 'Percentuale utile impresa (default 10%)';
COMMENT ON COLUMN ristrutturazioni_progetti.pratiche_tecniche_importo IS 'Importo fisso pratiche tecniche (default €3200)';
COMMENT ON COLUMN ristrutturazioni_progetti.perc_contingenze IS 'Percentuale contingenze (default 7%)';
COMMENT ON COLUMN ristrutturazioni_progetti.perc_iva IS 'Percentuale IVA agevolata (default 10%)';

-- ==========================================
-- STEP 2: Update existing coefficienti table
-- ==========================================

-- Add note about project-level overrides
UPDATE ristrutturazioni_coefficienti
SET descrizione = 'Oneri sicurezza (default 2% - modificabile per progetto)'
WHERE nome = 'oneri_sicurezza';

UPDATE ristrutturazioni_coefficienti
SET descrizione = 'Spese generali (default 10% - modificabile per progetto)'
WHERE nome = 'spese_generali';

UPDATE ristrutturazioni_coefficienti
SET descrizione = 'Utile impresa (default 10% - modificabile per progetto)'
WHERE nome = 'utile_impresa';

UPDATE ristrutturazioni_coefficienti
SET descrizione = 'Contingenze (default 7% - modificabile per progetto)'
WHERE nome = 'contingenze';

UPDATE ristrutturazioni_coefficienti
SET descrizione = 'IVA agevolata (default 10% - modificabile per progetto)'
WHERE nome = 'iva_agevolata';

-- ==========================================
-- FINAL MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 004 completata con successo!';
  RAISE NOTICE 'Aggiunte 6 colonne per percentuali editabili:';
  RAISE NOTICE '- perc_oneri_sicurezza (2%%)';
  RAISE NOTICE '- perc_spese_generali (10%%)';
  RAISE NOTICE '- perc_utile_impresa (10%%)';
  RAISE NOTICE '- pratiche_tecniche_importo (€3200)';
  RAISE NOTICE '- perc_contingenze (7%%)';
  RAISE NOTICE '- perc_iva (10%%)';
  RAISE NOTICE 'Valori di default applicati, modificabili per ogni progetto';
END $$;
