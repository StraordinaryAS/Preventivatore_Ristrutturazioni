-- ============================================
-- GEKO Preventivi Ristrutturazioni - Schema MVP
-- ============================================
-- Migration: 001
-- Created: 2025-11-27
-- Namespace: ristrutturazioni_*
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROGETTI (input utente)
-- ============================================
CREATE TABLE IF NOT EXISTS ristrutturazioni_progetti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Dati progetto
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,

  -- Dati immobile
  mq_totali DECIMAL(8,2) NOT NULL,
  numero_bagni INTEGER NOT NULL DEFAULT 1,
  numero_cucine INTEGER NOT NULL DEFAULT 1,
  piano INTEGER,
  ha_ascensore BOOLEAN DEFAULT true,

  -- Livello finiture
  livello_finiture VARCHAR(20) NOT NULL DEFAULT 'standard', -- economy, standard, premium

  -- Stato e calcolo
  stato VARCHAR(20) DEFAULT 'bozza', -- bozza, calcolato, approvato

  -- Metadata
  user_id UUID, -- per futura integrazione auth
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- 2. COMPUTI (output calcoli)
-- ============================================
CREATE TABLE IF NOT EXISTS ristrutturazioni_computi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progetto_id UUID NOT NULL REFERENCES ristrutturazioni_progetti(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Totali principali (€)
  lavori_base DECIMAL(12,2) NOT NULL, -- L
  oneri_sicurezza DECIMAL(12,2) DEFAULT 0, -- O_sic
  spese_generali DECIMAL(12,2) DEFAULT 0, -- S
  utile_impresa DECIMAL(12,2) DEFAULT 0, -- U
  pratiche_tecniche DECIMAL(12,2) DEFAULT 0, -- P_tec
  contingenze DECIMAL(12,2) DEFAULT 0, -- A
  imponibile DECIMAL(12,2) NOT NULL, -- I
  iva DECIMAL(12,2) NOT NULL, -- IVA
  totale DECIMAL(12,2) NOT NULL, -- T

  -- Breakdown per categorie (JSON)
  breakdown_categorie JSONB NOT NULL, -- {demolizioni: 1620, impianti: 4550, ...}

  -- Coefficienti applicati
  coeff_accesso DECIMAL(5,3) DEFAULT 1.000,
  coeff_complessita DECIMAL(5,3) DEFAULT 1.000,

  -- Export
  pdf_url TEXT,
  excel_url TEXT,

  -- Metadata
  versione INTEGER DEFAULT 1,
  note TEXT
);

-- ============================================
-- 3. PREZZARIO BASE (voci semplificate)
-- ============================================
CREATE TABLE IF NOT EXISTS ristrutturazioni_prezzario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Classificazione
  categoria VARCHAR(50) NOT NULL, -- demolizioni, murature, impianti, pavimenti, etc
  sottocategoria VARCHAR(50),
  codice VARCHAR(20) UNIQUE NOT NULL,
  descrizione TEXT NOT NULL,

  -- Prezzi per livello finiture
  prezzo_economy DECIMAL(10,2),
  prezzo_standard DECIMAL(10,2) NOT NULL,
  prezzo_premium DECIMAL(10,2),

  -- Unità misura
  unita_misura VARCHAR(10) NOT NULL, -- mq, ml, pz, cad, etc

  -- Metadata
  anno_prezzario INTEGER DEFAULT 2024,
  fonte VARCHAR(50) DEFAULT 'Piemonte 2024',
  attivo BOOLEAN DEFAULT true
);

-- ============================================
-- 4. RICETTE (mapping interventi → voci prezzario)
-- ============================================
CREATE TABLE IF NOT EXISTS ristrutturazioni_ricette (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Intervento
  nome_intervento VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT,
  categoria VARCHAR(50) NOT NULL,

  -- Voci prezzario collegate (array IDs o JSON)
  voci_prezzario JSONB NOT NULL, -- [{codice: "DEM01", quantita_per_mq: 1, ...}]

  -- Formula quantità (se custom)
  formula_quantita TEXT, -- es: "mq_totali * 1.2" o "numero_bagni * 50"

  -- Metadata
  attivo BOOLEAN DEFAULT true,
  priorita INTEGER DEFAULT 100
);

-- ============================================
-- 5. COEFFICIENTI (moltiplicatori)
-- ============================================
CREATE TABLE IF NOT EXISTS ristrutturazioni_coefficienti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  tipo VARCHAR(50) NOT NULL, -- accesso, complessita, livello_finiture
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,

  valore DECIMAL(5,3) NOT NULL,

  -- Condizioni di applicazione (JSON)
  condizioni JSONB, -- {piano_min: 3, ha_ascensore: false, ...}

  attivo BOOLEAN DEFAULT true,

  UNIQUE(tipo, nome)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_progetti_stato ON ristrutturazioni_progetti(stato);
CREATE INDEX idx_progetti_user ON ristrutturazioni_progetti(user_id);
CREATE INDEX idx_computi_progetto ON ristrutturazioni_computi(progetto_id);
CREATE INDEX idx_prezzario_categoria ON ristrutturazioni_prezzario(categoria);
CREATE INDEX idx_prezzario_codice ON ristrutturazioni_prezzario(codice);
CREATE INDEX idx_ricette_categoria ON ristrutturazioni_ricette(categoria);
CREATE INDEX idx_coefficienti_tipo ON ristrutturazioni_coefficienti(tipo);

-- ============================================
-- TRIGGERS (updated_at auto-update)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ristrutturazioni_progetti_updated_at
  BEFORE UPDATE ON ristrutturazioni_progetti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES (per futura integrazione auth)
-- ============================================
ALTER TABLE ristrutturazioni_progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_computi ENABLE ROW LEVEL SECURITY;

-- Policy temporanea: consenti tutto per sviluppo MVP
CREATE POLICY "Enable all for development" ON ristrutturazioni_progetti FOR ALL USING (true);
CREATE POLICY "Enable all for development" ON ristrutturazioni_computi FOR ALL USING (true);

-- Tabelle di configurazione: read-only per utenti normali
ALTER TABLE ristrutturazioni_prezzario ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_ricette ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_coefficienti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON ristrutturazioni_prezzario FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON ristrutturazioni_ricette FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON ristrutturazioni_coefficienti FOR SELECT USING (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE ristrutturazioni_progetti IS 'Progetti di ristrutturazione con input utente';
COMMENT ON TABLE ristrutturazioni_computi IS 'Computi metrici estimativi generati';
COMMENT ON TABLE ristrutturazioni_prezzario IS 'Prezzario base con voci Piemonte 2024';
COMMENT ON TABLE ristrutturazioni_ricette IS 'Mapping interventi → voci prezzario';
COMMENT ON TABLE ristrutturazioni_coefficienti IS 'Coefficienti moltiplicatori (accesso, complessità, etc)';
