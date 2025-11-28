-- ============================================
-- ESEGUI QUESTO FILE COMPLETO SU SUPABASE
-- ============================================
-- PROJECT: GEKO Tenant Demo (sngyhrzlblokthugamib)
-- Vai su: https://supabase.com/dashboard/project/sngyhrzlblokthugamib/editor
-- SQL Editor → New Query → Copia/Incolla TUTTO questo file → Run
--
-- NOTA: Queste tabelle con prefisso 'ristrutturazioni_' saranno SEPARATE
-- dalle 6 tabelle esistenti del Business Tracking (transactions, categories, etc)
-- ============================================

-- ============================================
-- PARTE 1: SCHEMA
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
CREATE INDEX IF NOT EXISTS idx_progetti_stato ON ristrutturazioni_progetti(stato);
CREATE INDEX IF NOT EXISTS idx_progetti_user ON ristrutturazioni_progetti(user_id);
CREATE INDEX IF NOT EXISTS idx_computi_progetto ON ristrutturazioni_computi(progetto_id);
CREATE INDEX IF NOT EXISTS idx_prezzario_categoria ON ristrutturazioni_prezzario(categoria);
CREATE INDEX IF NOT EXISTS idx_prezzario_codice ON ristrutturazioni_prezzario(codice);
CREATE INDEX IF NOT EXISTS idx_ricette_categoria ON ristrutturazioni_ricette(categoria);
CREATE INDEX IF NOT EXISTS idx_coefficienti_tipo ON ristrutturazioni_coefficienti(tipo);

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

DROP TRIGGER IF EXISTS update_ristrutturazioni_progetti_updated_at ON ristrutturazioni_progetti;
CREATE TRIGGER update_ristrutturazioni_progetti_updated_at
  BEFORE UPDATE ON ristrutturazioni_progetti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES (per futura integrazione auth)
-- ============================================
ALTER TABLE ristrutturazioni_progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_computi ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable all for development" ON ristrutturazioni_progetti;
DROP POLICY IF EXISTS "Enable all for development" ON ristrutturazioni_computi;

-- Policy temporanea: consenti tutto per sviluppo MVP
CREATE POLICY "Enable all for development" ON ristrutturazioni_progetti FOR ALL USING (true);
CREATE POLICY "Enable all for development" ON ristrutturazioni_computi FOR ALL USING (true);

-- Tabelle di configurazione: read-only per utenti normali
ALTER TABLE ristrutturazioni_prezzario ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_ricette ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_coefficienti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON ristrutturazioni_prezzario;
DROP POLICY IF EXISTS "Enable read for all" ON ristrutturazioni_ricette;
DROP POLICY IF EXISTS "Enable read for all" ON ristrutturazioni_coefficienti;

CREATE POLICY "Enable read for all" ON ristrutturazioni_prezzario FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON ristrutturazioni_ricette FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON ristrutturazioni_coefficienti FOR SELECT USING (true);

-- ============================================
-- PARTE 2: SEED DATA
-- ============================================

-- PREZZARIO BASE
INSERT INTO ristrutturazioni_prezzario (codice, categoria, sottocategoria, descrizione, prezzo_economy, prezzo_standard, prezzo_premium, unita_misura) VALUES

-- DEMOLIZIONI
('DEM01', 'demolizioni', 'pavimenti', 'Demolizione pavimenti esistenti con smaltimento', 15.00, 18.00, 22.00, 'mq'),
('DEM02', 'demolizioni', 'rivestimenti', 'Demolizione rivestimenti ceramici con smaltimento', 12.00, 14.00, 18.00, 'mq'),
('DEM03', 'demolizioni', 'tramezzi', 'Demolizione tramezzi in muratura con smaltimento', 25.00, 28.00, 32.00, 'mq'),
('DEM04', 'demolizioni', 'sanitari', 'Rimozione sanitari e smaltimento', 80.00, 100.00, 120.00, 'pz'),

-- MURATURE
('MUR01', 'murature', 'tramezzi', 'Tramezzo in muratura intonacato (sp. 8-10 cm)', 50.00, 58.00, 68.00, 'mq'),
('MUR02', 'murature', 'intonaci', 'Intonaco civile su pareti', 18.00, 22.00, 28.00, 'mq'),
('MUR03', 'murature', 'massetti', 'Massetto alleggerito per pavimenti (sp. 5 cm)', 22.00, 28.00, 35.00, 'mq'),

-- CARTONGESSO
('CART01', 'cartongesso', 'pareti', 'Parete in cartongesso con isolamento (sp. 10 cm)', 35.00, 42.00, 52.00, 'mq'),
('CART02', 'cartongesso', 'controsoffitti', 'Controsoffitto in cartongesso', 30.00, 38.00, 48.00, 'mq'),

-- IMPIANTI ELETTRICI
('IMP_EL01', 'impianti', 'elettrico', 'Punto luce completo (interruttore + cablaggio)', 55.00, 65.00, 85.00, 'pz'),
('IMP_EL02', 'impianti', 'elettrico', 'Presa elettrica completa (presa + cablaggio)', 50.00, 60.00, 75.00, 'pz'),
('IMP_EL03', 'impianti', 'elettrico', 'Quadro elettrico completo (6-12 moduli)', 350.00, 450.00, 600.00, 'cad'),
('IMP_EL04', 'impianti', 'elettrico', 'Impianto domotico base (1 ambiente)', NULL, 800.00, 1200.00, 'cad'),

-- IMPIANTI IDRAULICI
('IMP_IDR01', 'impianti', 'idraulico', 'Impianto idrico-sanitario bagno completo', 3200.00, 3600.00, 4500.00, 'cad'),
('IMP_IDR02', 'impianti', 'idraulico', 'Punto acqua cucina (carico/scarico)', 180.00, 220.00, 280.00, 'pz'),
('IMP_IDR03', 'impianti', 'idraulico', 'Punto gas cucina con certificazione', 200.00, 250.00, 320.00, 'pz'),

-- IMPIANTI TERMICI
('IMP_TERM01', 'impianti', 'termico', 'Radiatore in alluminio (600-800W)', 180.00, 220.00, 280.00, 'pz'),
('IMP_TERM02', 'impianti', 'termico', 'Caldaia a condensazione (24 kW)', 1800.00, 2200.00, 2800.00, 'cad'),
('IMP_TERM03', 'impianti', 'termico', 'Impianto radiante a pavimento', 65.00, 85.00, 110.00, 'mq'),

-- PAVIMENTI
('PAV01', 'pavimenti', 'gres', 'Pavimento in gres porcellanato 60x60 con posa', 38.00, 55.00, 85.00, 'mq'),
('PAV02', 'pavimenti', 'parquet', 'Parquet prefinito con posa flottante', NULL, 65.00, 95.00, 'mq'),
('PAV03', 'pavimenti', 'battiscopa', 'Battiscopa coordinato con posa', 8.00, 12.00, 18.00, 'ml'),

-- RIVESTIMENTI
('RIV01', 'rivestimenti', 'bagno', 'Rivestimento ceramico bagno 30x60 con posa', 35.00, 45.00, 65.00, 'mq'),
('RIV02', 'rivestimenti', 'cucina', 'Rivestimento cucina (zona cottura)', 40.00, 50.00, 75.00, 'mq'),

-- SERRAMENTI INTERNI
('SERR_INT01', 'serramenti', 'porte', 'Porta interna battente con telaio e posa', 280.00, 350.00, 550.00, 'pz'),
('SERR_INT02', 'serramenti', 'porte', 'Porta scorrevole a scomparsa con posa', NULL, 650.00, 950.00, 'pz'),

-- TINTEGGIATURE
('TINT01', 'tinteggiature', 'pareti', 'Tinteggiatura pareti con idropittura lavabile', 8.00, 10.00, 14.00, 'mq'),
('TINT02', 'tinteggiature', 'soffitti', 'Tinteggiatura soffitti', 9.00, 11.00, 15.00, 'mq'),

-- SANITARI E ACCESSORI
('SAN01', 'sanitari', 'bagno', 'WC con cassetta e sedile', 180.00, 280.00, 450.00, 'pz'),
('SAN02', 'sanitari', 'bagno', 'Lavabo con colonna o sospeso', 150.00, 220.00, 380.00, 'pz'),
('SAN03', 'sanitari', 'bagno', 'Piatto doccia 80x80 con box cristallo', 450.00, 650.00, 950.00, 'cad'),
('SAN04', 'sanitari', 'bagno', 'Rubinetteria bagno completa (3 pezzi)', 180.00, 280.00, 500.00, 'set'),

-- EXTRA CANTIERE
('EXTRA01', 'extra', 'protezioni', 'Protezioni e pulizie cantiere', 150.00, 200.00, 250.00, 'mq'),
('EXTRA02', 'extra', 'trasporti', 'Trasporti e movimentazioni materiali', 100.00, 150.00, 200.00, 'mq')

ON CONFLICT (codice) DO NOTHING;

-- RICETTE BASE
INSERT INTO ristrutturazioni_ricette (nome_intervento, categoria, descrizione, voci_prezzario, formula_quantita) VALUES
(
  'ristrutturazione_totale_90mq',
  'completo',
  'Ristrutturazione totale appartamento 90mq tipo',
  '[
    {"codice": "DEM01", "quantita_base": 90, "moltiplicatore": 1.0},
    {"codice": "DEM02", "quantita_base": 50, "moltiplicatore": 1.0},
    {"codice": "DEM03", "quantita_base": 15, "moltiplicatore": 1.0},
    {"codice": "MUR03", "quantita_base": 90, "moltiplicatore": 1.0},
    {"codice": "IMP_EL01", "quantita_base": 35, "moltiplicatore": 1.0},
    {"codice": "IMP_EL02", "quantita_base": 35, "moltiplicatore": 1.0},
    {"codice": "IMP_EL03", "quantita_base": 1, "moltiplicatore": 1.0},
    {"codice": "IMP_IDR01", "quantita_base": 1, "moltiplicatore": "numero_bagni"},
    {"codice": "IMP_IDR02", "quantita_base": 1, "moltiplicatore": "numero_cucine"},
    {"codice": "IMP_IDR03", "quantita_base": 1, "moltiplicatore": "numero_cucine"},
    {"codice": "PAV01", "quantita_base": 90, "moltiplicatore": 1.0},
    {"codice": "PAV03", "quantita_base": 40, "moltiplicatore": 1.0},
    {"codice": "RIV01", "quantita_base": 25, "moltiplicatore": "numero_bagni"},
    {"codice": "SERR_INT01", "quantita_base": 6, "moltiplicatore": 1.0},
    {"codice": "TINT01", "quantita_base": 250, "moltiplicatore": 1.0},
    {"codice": "TINT02", "quantita_base": 90, "moltiplicatore": 1.0},
    {"codice": "SAN01", "quantita_base": 1, "moltiplicatore": "numero_bagni"},
    {"codice": "SAN02", "quantita_base": 1, "moltiplicatore": "numero_bagni"},
    {"codice": "SAN03", "quantita_base": 1, "moltiplicatore": "numero_bagni"},
    {"codice": "SAN04", "quantita_base": 1, "moltiplicatore": "numero_bagni"},
    {"codice": "EXTRA01", "quantita_base": 90, "moltiplicatore": 1.0},
    {"codice": "EXTRA02", "quantita_base": 90, "moltiplicatore": 1.0}
  ]',
  'scalato_su_mq_totali'
)
ON CONFLICT (nome_intervento) DO NOTHING;

-- COEFFICIENTI BASE
INSERT INTO ristrutturazioni_coefficienti (tipo, nome, descrizione, valore, condizioni) VALUES

-- Coefficienti accesso
('accesso', 'piano_no_ascensore', 'Piano 3+ senza ascensore (+6%)', 1.060, '{"piano_min": 3, "ha_ascensore": false}'),
('accesso', 'piano_standard', 'Piano con ascensore o piano basso', 1.000, '{}'),

-- Coefficienti complessità
('complessita', 'standard', 'Complessità standard', 1.000, '{}'),
('complessita', 'alta', 'Edificio storico o vincoli particolari', 1.150, '{}'),

-- Coefficienti spese generali/utile
('percentuale', 'spese_generali', 'Spese generali impresa', 0.100, '{}'),
('percentuale', 'utile_impresa', 'Utile impresa', 0.100, '{}'),
('percentuale', 'oneri_sicurezza', 'Oneri sicurezza', 0.020, '{}'),
('percentuale', 'contingenze', 'Contingenze e imprevisti', 0.070, '{}'),
('percentuale', 'iva_agevolata', 'IVA agevolata 10%', 0.100, '{}')

ON CONFLICT (tipo, nome) DO NOTHING;

-- ============================================
-- DONE! ✅
-- ============================================
SELECT 'Setup completato! Verifica le tabelle nel Table Editor.' AS messaggio;
