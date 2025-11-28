-- Migration 005: Prezzi Custom Globali e Features Avanzate
-- Description: Aggiunge tabella prezzi custom, campo prezzo a corpo, e supporto duplicazione progetti
-- Date: 2025-11-28

-- ==========================================
-- STEP 1: Tabella Prezzi Custom Globali
-- ==========================================

CREATE TABLE IF NOT EXISTS ristrutturazioni_prezzi_custom (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sottocategoria UUID NOT NULL REFERENCES ristrutturazioni_sottocategorie(id) ON DELETE CASCADE,

  -- Prezzi personalizzati per livello
  prezzo_economy_custom DECIMAL(10,2),
  prezzo_standard_custom DECIMAL(10,2),
  prezzo_premium_custom DECIMAL(10,2),

  -- Metadata
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(id_sottocategoria)
);

CREATE INDEX idx_prezzi_custom_sottocategoria ON ristrutturazioni_prezzi_custom(id_sottocategoria);

COMMENT ON TABLE ristrutturazioni_prezzi_custom IS 'Prezzi personalizzati globali che sovrascrivono il prezzario base';
COMMENT ON COLUMN ristrutturazioni_prezzi_custom.prezzo_economy_custom IS 'Prezzo economy personalizzato (priorità su prezzario base)';
COMMENT ON COLUMN ristrutturazioni_prezzi_custom.prezzo_standard_custom IS 'Prezzo standard personalizzato (priorità su prezzario base)';
COMMENT ON COLUMN ristrutturazioni_prezzi_custom.prezzo_premium_custom IS 'Prezzo premium personalizzato (priorità su prezzario base)';

-- ==========================================
-- STEP 2: Aggiungi campo prezzo_a_corpo
-- ==========================================

ALTER TABLE ristrutturazioni_selezioni_progetto
ADD COLUMN IF NOT EXISTS prezzo_a_corpo DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS usa_prezzo_a_corpo BOOLEAN DEFAULT false;

COMMENT ON COLUMN ristrutturazioni_selezioni_progetto.prezzo_a_corpo IS 'Prezzo totale a corpo (ignora quantità × prezzo_unitario)';
COMMENT ON COLUMN ristrutturazioni_selezioni_progetto.usa_prezzo_a_corpo IS 'Se true, usa prezzo_a_corpo invece di quantità × prezzo_unitario';

-- ==========================================
-- STEP 3: Aggiungi campi per duplicazione
-- ==========================================

ALTER TABLE ristrutturazioni_progetti
ADD COLUMN IF NOT EXISTS progetto_originale_id UUID REFERENCES ristrutturazioni_progetti(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duplicato_da TEXT;

COMMENT ON COLUMN ristrutturazioni_progetti.progetto_originale_id IS 'ID del progetto da cui è stato duplicato';
COMMENT ON COLUMN ristrutturazioni_progetti.duplicato_da IS 'Nome del progetto originale (per riferimento)';

-- ==========================================
-- STEP 4: Trigger per updated_at
-- ==========================================

CREATE TRIGGER update_ristrutturazioni_prezzi_custom_updated_at
  BEFORE UPDATE ON ristrutturazioni_prezzi_custom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ristrutturazioni_selezioni_progetto_updated_at
  BEFORE UPDATE ON ristrutturazioni_selezioni_progetto
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- STEP 5: RLS Policies
-- ==========================================

ALTER TABLE ristrutturazioni_prezzi_custom ENABLE ROW LEVEL SECURITY;

-- Policy temporanea: consenti tutto per sviluppo MVP
CREATE POLICY "Enable all for development" ON ristrutturazioni_prezzi_custom FOR ALL USING (true);

-- ==========================================
-- FINAL MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 005 completata con successo!';
  RAISE NOTICE 'Nuove funzionalità aggiunte:';
  RAISE NOTICE '1. Tabella prezzi_custom per prezzi personalizzati globali';
  RAISE NOTICE '2. Campo prezzo_a_corpo nelle selezioni progetto';
  RAISE NOTICE '3. Campi per supporto duplicazione progetti';
  RAISE NOTICE '4. Triggers e policies configurati';
  RAISE NOTICE '';
  RAISE NOTICE 'Priorità prezzi: Custom globale > Prezzo unitario custom progetto > Prezzario base';
END $$;
