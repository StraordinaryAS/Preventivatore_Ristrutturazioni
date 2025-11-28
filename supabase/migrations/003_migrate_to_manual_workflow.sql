-- Migration 003: Manual Workflow with Work Categories
-- Description: Switches from recipe-based auto-scaling to manual category selection
-- Date: 2025-11-28

-- ==========================================
-- STEP 1: Create new table structure
-- ==========================================

-- Categorie di lavorazione (14 macro-categorie dal PRD)
CREATE TABLE IF NOT EXISTS ristrutturazioni_categorie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  descrizione TEXT,
  ordine INT NOT NULL,
  attiva BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sottocategorie di lavorazione (dettaglio granulare)
CREATE TABLE IF NOT EXISTS ristrutturazioni_sottocategorie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_categoria UUID NOT NULL REFERENCES ristrutturazioni_categorie(id) ON DELETE CASCADE,
  codice VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(300) NOT NULL,
  descrizione TEXT,
  unita_misura VARCHAR(20) NOT NULL DEFAULT 'cad',
  prezzo_economy DECIMAL(10,2),
  prezzo_standard DECIMAL(10,2),
  prezzo_premium DECIMAL(10,2),
  note TEXT,
  ordine INT NOT NULL,
  attiva BOOLEAN DEFAULT true,
  applica_f_accesso BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selezioni utente per progetto (quali sottocategorie sono state scelte)
CREATE TABLE IF NOT EXISTS ristrutturazioni_selezioni_progetto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_progetto UUID NOT NULL REFERENCES ristrutturazioni_progetti(id) ON DELETE CASCADE,
  id_sottocategoria UUID NOT NULL REFERENCES ristrutturazioni_sottocategorie(id) ON DELETE CASCADE,
  quantita DECIMAL(10,2) NOT NULL DEFAULT 1,
  prezzo_unitario_custom DECIMAL(10,2), -- Se l'utente modifica il prezzo
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_progetto, id_sottocategoria)
);

-- ==========================================
-- STEP 2: Modify existing tables
-- ==========================================

-- Add workflow mode to projects table
ALTER TABLE ristrutturazioni_progetti
ADD COLUMN IF NOT EXISTS workflow_mode VARCHAR(20) DEFAULT 'manual' CHECK (workflow_mode IN ('auto', 'manual'));

-- Add comments
COMMENT ON TABLE ristrutturazioni_categorie IS 'Categorie principali di lavorazione (14 macro-categorie)';
COMMENT ON TABLE ristrutturazioni_sottocategorie IS 'Sottocategorie dettagliate con prezzi per livello finitura';
COMMENT ON TABLE ristrutturazioni_selezioni_progetto IS 'Lavorazioni selezionate dall''utente con quantità manuali';

-- ==========================================
-- STEP 3: Create indexes for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_sottocategorie_categoria ON ristrutturazioni_sottocategorie(id_categoria);
CREATE INDEX IF NOT EXISTS idx_sottocategorie_codice ON ristrutturazioni_sottocategorie(codice);
CREATE INDEX IF NOT EXISTS idx_selezioni_progetto ON ristrutturazioni_selezioni_progetto(id_progetto);
CREATE INDEX IF NOT EXISTS idx_selezioni_sottocategoria ON ristrutturazioni_selezioni_progetto(id_sottocategoria);

-- ==========================================
-- STEP 4: Insert 14 macro-categories
-- ==========================================

INSERT INTO ristrutturazioni_categorie (codice, nome, descrizione, ordine) VALUES
('DEM', 'Demolizioni, rimozioni, smaltimenti', 'Demolizioni interne, rimozioni impiantistiche e smaltimento rifiuti', 1),
('MUR', 'Opere murarie e strutturali leggere', 'Tramezzi, intonaci, rasature, sottofondi e massetti', 2),
('CGE', 'Cartongesso, contropareti, controsoffitti', 'Contropareti, controsoffitti, pareti divisorie leggere', 3),
('PAV', 'Pavimenti, rivestimenti e sottofondi', 'Pavimenti in gres, parquet, laminato, rivestimenti ceramici', 4),
('SER', 'Serramenti interni ed esterni', 'Porte interne, finestre, oscuranti, davanzali', 5),
('ELE', 'Impianto elettrico, dati, domotica', 'Quadri, distribuzione, punti luce/prese, domotica', 6),
('IDR', 'Impianto idrico-sanitario e gas', 'Distribuzione idrica, scarichi, dotazioni bagno/cucina, gas', 7),
('TER', 'Impianto termico, raffrescamento, VMC', 'Riscaldamento, raffrescamento, pompe di calore, VMC', 8),
('ISO', 'Isolamenti termici e acustici interni', 'Contropareti isolate, materassini anticalpestio', 9),
('FIN', 'Finiture e tinteggiature', 'Rasature, pitture, verniciature, decorazioni', 10),
('FAL', 'Opere da falegname / arredi fissi', 'Boiserie, mobili bagno su misura, piani cucina', 11),
('EXT', 'Extra cantiere, oneri accesso, logistica', 'Protezioni, trasporti, montacarichi, OSP, pulizie', 12),
('SIC', 'Sicurezza in cantiere', 'PSC, CSE, POS, apprestamenti di sicurezza', 13),
('PRA', 'Pratiche tecniche e amministrative', 'CILA, SCIA, DL, CSP/CSE, APE, Legge 10, DOCFA', 14)
ON CONFLICT (codice) DO NOTHING;

-- ==========================================
-- STEP 5: Insert detailed subcategories with Piemonte 2025 pricing
-- ==========================================

-- 3.1 DEMOLIZIONI, RIMOZIONI, SMALTIMENTI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_01', 'Demolizione tramezzi in laterizio/intonaco', 'mq', 25.00, 28.00, 32.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_02', 'Demolizione tramezzi in cartongesso', 'mq', 18.00, 20.00, 24.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_03', 'Demolizione controsoffitti', 'mq', 12.00, 14.00, 16.00, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_04', 'Demolizione pavimenti e sottofondi', 'mq', 15.00, 18.00, 22.00, 4, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_05', 'Demolizione rivestimenti ceramici', 'mq', 12.00, 14.00, 17.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_06', 'Demolizione massetti', 'mq', 18.00, 22.00, 26.00, 6, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_07', 'Demolizione intonaci interni', 'mq', 8.00, 10.00, 12.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_08', 'Smontaggio sanitari e rubinetterie', 'cad', 80.00, 100.00, 120.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_09', 'Smontaggio porte interne', 'cad', 35.00, 40.00, 50.00, 9, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_10', 'Smontaggio radiatori', 'cad', 45.00, 55.00, 65.00, 10, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_11', 'Rimozione tubazioni idriche', 'ml', 8.00, 10.00, 12.00, 11, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_12', 'Rimozione canalizzazioni elettriche', 'ml', 6.00, 8.00, 10.00, 12, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_13', 'Smaltimento rifiuti inerti', 't', 35.00, 40.00, 45.00, 13, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='DEM'), 'DEM_14', 'Smaltimento rifiuti misti', 't', 120.00, 140.00, 160.00, 14, true);

-- 3.2 OPERE MURARIE E STRUTTURALI LEGGERE
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_01', 'Tramezzi in laterizio forato sp. 8cm', 'mq', 45.00, 52.00, 60.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_02', 'Tramezzi in laterizio forato sp. 12cm', 'mq', 55.00, 62.00, 70.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_03', 'Tramezzi in blocchi gasbeton', 'mq', 50.00, 58.00, 66.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_04', 'Intonaco civile su nuove murature', 'mq', 18.00, 22.00, 26.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_05', 'Rasatura su intonaco esistente', 'mq', 12.00, 15.00, 18.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_06', 'Intonaco deumidificante', 'mq', 28.00, 32.00, 38.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_07', 'Sottofondo alleggerito', 'mq', 25.00, 30.00, 35.00, 7, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_08', 'Massetto tradizionale sp. 5cm', 'mq', 22.00, 26.00, 30.00, 8, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_09', 'Massetto autolivellante', 'mq', 28.00, 32.00, 38.00, 9, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_10', 'Massetto per impianto radiante', 'mq', 32.00, 38.00, 45.00, 10, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_11', 'Formazione soglie interne', 'cad', 45.00, 55.00, 65.00, 11, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='MUR'), 'MUR_12', 'Fori passanti in muratura', 'cad', 35.00, 42.00, 50.00, 12, false);

-- 3.3 CARTONGESSO, CONTROPARETI, CONTROSOFFITTI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_01', 'Controparete in cartongesso semplice', 'mq', 32.00, 38.00, 45.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_02', 'Controparete con isolamento termico', 'mq', 42.00, 50.00, 58.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_03', 'Controparete con isolamento acustico', 'mq', 48.00, 56.00, 65.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_04', 'Controsoffitto in lastre cartongesso', 'mq', 35.00, 42.00, 50.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_05', 'Controsoffitto ispezionabile con pannelli', 'mq', 45.00, 52.00, 62.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_06', 'Velette e ribassamenti per luce indiretta', 'ml', 55.00, 65.00, 78.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_07', 'Parete divisoria cartongesso singolo strato', 'mq', 38.00, 45.00, 54.00, 7, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_08', 'Parete divisoria cartongesso doppio strato', 'mq', 48.00, 58.00, 68.00, 8, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='CGE'), 'CGE_09', 'Parete acustica rinforzata', 'mq', 65.00, 75.00, 88.00, 9, true);

-- 3.4 PAVIMENTI, RIVESTIMENTI E SOTTOFONDI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_01', 'Gres porcellanato 60x60 (forn.+posa)', 'mq', 45.00, 55.00, 75.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_02', 'Gres porcellanato 80x80 (forn.+posa)', 'mq', 55.00, 68.00, 90.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_03', 'Gres effetto legno (forn.+posa)', 'mq', 50.00, 62.00, 85.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_04', 'Parquet prefinto rovere (forn.+posa)', 'mq', 55.00, 72.00, 95.00, 4, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_05', 'Parquet prefinto essenze pregiate (forn.+posa)', 'mq', 75.00, 95.00, 130.00, 5, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_06', 'Laminato AC4-AC5 (forn.+posa)', 'mq', 28.00, 35.00, 45.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_07', 'PVC/LVT (forn.+posa)', 'mq', 32.00, 42.00, 55.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_08', 'Rivestimento ceramico bagno 20x60', 'mq', 38.00, 45.00, 58.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_09', 'Rivestimento ceramico bagno 30x90', 'mq', 45.00, 55.00, 70.00, 9, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_10', 'Rivestimento cucina paraschizzi', 'mq', 42.00, 50.00, 65.00, 10, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_11', 'Battiscopa ceramica coordinato', 'ml', 12.00, 15.00, 18.00, 11, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_12', 'Battiscopa legno/MDF', 'ml', 8.00, 12.00, 16.00, 12, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PAV'), 'PAV_13', 'Soglie di passaggio', 'cad', 35.00, 45.00, 58.00, 13, false);

-- 3.5 SERRAMENTI INTERNI ED ESTERNI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_01', 'Porta interna battente tamburata (forn.+posa)', 'cad', 280.00, 350.00, 480.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_02', 'Porta interna battente listellare (forn.+posa)', 'cad', 350.00, 450.00, 620.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_03', 'Porta scorrevole interno muro (forn.+posa)', 'cad', 520.00, 680.00, 920.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_04', 'Porta scorrevole esterno muro (forn.+posa)', 'cad', 420.00, 550.00, 750.00, 4, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_05', 'Porta REI 60 per ingresso (forn.+posa)', 'cad', 850.00, 1050.00, 1350.00, 5, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_06', 'Finestra PVC 2 ante (forn.+posa)', 'cad', 650.00, 850.00, 1200.00, 6, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_07', 'Finestra legno 2 ante (forn.+posa)', 'cad', 950.00, 1250.00, 1750.00, 7, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_08', 'Finestra alluminio taglio termico (forn.+posa)', 'cad', 850.00, 1150.00, 1550.00, 8, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_09', 'Portafinestra 1 anta (forn.+posa)', 'cad', 750.00, 950.00, 1350.00, 9, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_10', 'Tapparelle con cassonetto', 'cad', 320.00, 420.00, 580.00, 10, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SER'), 'SER_11', 'Davanzale interno marmo/agglomerato', 'ml', 45.00, 58.00, 75.00, 11, false);

-- 3.6 IMPIANTO ELETTRICO, DATI, DOMOTICA
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_01', 'Quadro elettrico generale (forn.+posa)', 'cad', 450.00, 650.00, 950.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_02', 'Interruttore differenziale', 'cad', 85.00, 120.00, 180.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_03', 'Punto luce (plafoniera/centro stanza)', 'cad', 45.00, 58.00, 75.00, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_04', 'Punto comando (interruttore/deviatore)', 'cad', 38.00, 48.00, 62.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_05', 'Presa standard 10/16A', 'cad', 35.00, 45.00, 58.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_06', 'Presa dedicata forno', 'cad', 55.00, 68.00, 85.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_07', 'Presa dedicata piano induzione', 'cad', 75.00, 95.00, 120.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_08', 'Presa dedicata climatizzatore', 'cad', 65.00, 82.00, 105.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_09', 'Presa TV/SAT', 'cad', 42.00, 52.00, 68.00, 9, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_10', 'Presa dati RJ45', 'cad', 48.00, 62.00, 78.00, 10, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_11', 'Impianto elettrico livello L1 (base)', 'cad', 2500.00, 3200.00, 4200.00, 11, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_12', 'Impianto elettrico livello L2 (standard)', 'cad', 3800.00, 4800.00, 6500.00, 12, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_13', 'Impianto elettrico livello L3 (domotica)', 'cad', 6500.00, 8500.00, 12000.00, 13, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_14', 'Termostato smart Wi-Fi', 'cad', 180.00, 250.00, 380.00, 14, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ELE'), 'ELE_15', 'Modulo relè Wi-Fi per luci/prese', 'cad', 45.00, 65.00, 95.00, 15, false);

-- 3.7 IMPIANTO IDRICO-SANITARIO E GAS
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_01', 'Impianto idrico-sanitario bagno completo', 'cad', 2800.00, 3600.00, 4800.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_02', 'Piatto doccia 70x90 + box cristallo', 'cad', 450.00, 650.00, 950.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_03', 'Piatto doccia 80x120 + box cristallo', 'cad', 550.00, 780.00, 1150.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_04', 'Vasca da bagno standard', 'cad', 680.00, 950.00, 1450.00, 4, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_05', 'WC sospeso con cassetta incasso', 'cad', 380.00, 520.00, 780.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_06', 'WC a terra', 'cad', 280.00, 380.00, 550.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_07', 'Lavabo sospeso con rubinetteria', 'cad', 320.00, 450.00, 680.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_08', 'Bidet sospeso con rubinetteria', 'cad', 280.00, 380.00, 550.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_09', 'Rubinetteria bagno completa (economy)', 'set', 220.00, 350.00, 580.00, 9, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_10', 'Collettore acqua sanitaria', 'cad', 280.00, 380.00, 520.00, 10, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_11', 'Punto acqua cucina (fredda/calda)', 'cad', 280.00, 350.00, 480.00, 11, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_12', 'Scarico cucina/lavastoviglie', 'cad', 180.00, 250.00, 350.00, 12, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_13', 'Linea gas cucina', 'cad', 320.00, 420.00, 580.00, 13, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='IDR'), 'IDR_14', 'Linea gas caldaia', 'cad', 280.00, 380.00, 520.00, 14, false);

-- 3.8 IMPIANTO TERMICO, RAFFRESCAMENTO, VMC
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_01', 'Caldaia a condensazione 24kW (forn.+posa)', 'cad', 1500.00, 1950.00, 2650.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_02', 'Caldaia a condensazione 32kW (forn.+posa)', 'cad', 1850.00, 2350.00, 3150.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_03', 'Radiatore in alluminio 800mm (forn.+posa)', 'cad', 180.00, 250.00, 350.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_04', 'Radiatore in acciaio tubolare (forn.+posa)', 'cad', 220.00, 320.00, 480.00, 4, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_05', 'Termoarredo bagno (forn.+posa)', 'cad', 280.00, 420.00, 650.00, 5, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_06', 'Valvole termostatiche', 'cad', 65.00, 85.00, 120.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_07', 'Impianto radiante a pavimento', 'mq', 65.00, 85.00, 115.00, 7, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_08', 'Collettore riscaldamento con regolazione', 'cad', 450.00, 620.00, 850.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_09', 'Pompa di calore aria-acqua (forn.+posa)', 'cad', 4500.00, 6500.00, 9500.00, 9, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_10', 'Split mono 9000 BTU (forn.+posa)', 'cad', 650.00, 850.00, 1250.00, 10, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_11', 'Split mono 12000 BTU (forn.+posa)', 'cad', 750.00, 950.00, 1450.00, 11, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_12', 'Multi-split 2 unità interne (forn.+posa)', 'cad', 1950.00, 2650.00, 3850.00, 12, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_13', 'VMC puntuale singola stanza', 'cad', 380.00, 520.00, 750.00, 13, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_14', 'VMC canalizzata completa', 'cad', 4500.00, 6500.00, 9500.00, 14, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='TER'), 'TER_15', 'Cronotermostato ambiente', 'cad', 120.00, 180.00, 280.00, 15, false);

-- 3.9 ISOLAMENTI TERMICI E ACUSTICI INTERNI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_01', 'Isolamento controparete lana minerale 6cm', 'mq', 18.00, 24.00, 32.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_02', 'Isolamento controparete lana minerale 10cm', 'mq', 24.00, 32.00, 42.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_03', 'Isolamento EPS per controparete', 'mq', 15.00, 22.00, 30.00, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_04', 'Isolamento XPS per controparete', 'mq', 22.00, 30.00, 40.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_05', 'Materassino anticalpestio 3mm', 'mq', 8.00, 12.00, 16.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_06', 'Materassino anticalpestio 5mm', 'mq', 12.00, 16.00, 22.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='ISO'), 'ISO_07', 'Pannelli fonoassorbenti parete/soffitto', 'mq', 35.00, 48.00, 65.00, 7, false);

-- 3.10 FINITURE E TINTEGGIATURE
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_01', 'Rasatura pareti e soffitti', 'mq', 8.00, 10.00, 14.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_02', 'Stuccatura e carteggiatura', 'mq', 5.00, 7.00, 10.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_03', 'Primer fissativo', 'mq', 3.00, 4.00, 5.50, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_04', 'Pittura lavabile 2 mani', 'mq', 8.00, 10.00, 14.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_05', 'Pittura traspirante 2 mani', 'mq', 9.00, 12.00, 16.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_06', 'Pittura antimuffa', 'mq', 12.00, 16.00, 22.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_07', 'Smalto su superfici metalliche', 'mq', 14.00, 18.00, 25.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_08', 'Pittura decorativa effetto spatolato', 'mq', 22.00, 30.00, 42.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FIN'), 'FIN_09', 'Carta da parati (forn.+posa)', 'mq', 28.00, 38.00, 55.00, 9, false);

-- 3.11 OPERE DA FALEGNAME / ARREDI FISSI
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FAL'), 'FAL_01', 'Boiserie rivestimento parete legno', 'mq', 120.00, 180.00, 280.00, 1, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FAL'), 'FAL_02', 'Mobile bagno su misura sospeso', 'cad', 850.00, 1250.00, 1950.00, 2, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FAL'), 'FAL_03', 'Mobile bagno su misura a terra', 'cad', 720.00, 1050.00, 1650.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FAL'), 'FAL_04', 'Piano cucina laminato', 'ml', 180.00, 250.00, 380.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='FAL'), 'FAL_05', 'Piano cucina quarzo/agglomerato', 'ml', 380.00, 520.00, 750.00, 5, false);

-- 3.12 EXTRA CANTIERE, ONERI ACCESSO, LOGISTICA
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_01', 'Protezione pavimenti esistenti', 'mq', 3.00, 4.00, 5.50, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_02', 'Barriere antipolvere (zip wall)', 'ml', 8.00, 12.00, 16.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_03', 'Trasporto materiali', 'giorno', 120.00, 180.00, 250.00, 3, true),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_04', 'Nolo montascale/montacarichi', 'giorno', 180.00, 250.00, 350.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_05', 'OSP (occupazione suolo pubblico)', 'mese', 150.00, 200.00, 280.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_06', 'Pulizia grossolana di cantiere', 'giorno', 80.00, 120.00, 180.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='EXT'), 'EXT_07', 'Pulizia fine lavori completa', 'cad', 350.00, 500.00, 750.00, 7, false);

-- 3.13 SICUREZZA IN CANTIERE
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_01', 'Redazione PSC (Piano Sicurezza Coordinamento)', 'cad', 800.00, 1200.00, 1800.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_02', 'CSE (Coordinamento Sicurezza Esecuzione)', 'cad', 1200.00, 1800.00, 2800.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_03', 'POS (Piano Operativo Sicurezza)', 'cad', 450.00, 650.00, 950.00, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_04', 'Parapetti provvisori', 'ml', 12.00, 16.00, 22.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_05', 'Protezioni aperture', 'cad', 45.00, 65.00, 95.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='SIC'), 'SIC_06', 'Segnaletica di sicurezza', 'set', 120.00, 180.00, 280.00, 6, false);

-- 3.14 PRATICHE TECNICHE E AMMINISTRATIVE
INSERT INTO ristrutturazioni_sottocategorie (id_categoria, codice, nome, unita_misura, prezzo_economy, prezzo_standard, prezzo_premium, ordine, applica_f_accesso) VALUES
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_01', 'CILA (Comunicazione Inizio Lavori Asseverata)', 'cad', 800.00, 1200.00, 1800.00, 1, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_02', 'SCIA (Segnalazione Certificata Inizio Attività)', 'cad', 1200.00, 1800.00, 2800.00, 2, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_03', 'Progettazione architettonica', 'cad', 1500.00, 2500.00, 4000.00, 3, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_04', 'Direzione lavori', 'cad', 2000.00, 3500.00, 5500.00, 4, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_05', 'CSP (Coordinamento Sicurezza Progettazione)', 'cad', 800.00, 1200.00, 1800.00, 5, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_06', 'APE post-intervento', 'cad', 250.00, 350.00, 500.00, 6, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_07', 'Relazione Legge 10', 'cad', 450.00, 650.00, 950.00, 7, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_08', 'DOCFA (aggiornamento catastale)', 'cad', 350.00, 500.00, 750.00, 8, false),
((SELECT id FROM ristrutturazioni_categorie WHERE codice='PRA'), 'PRA_09', 'Diritti di segreteria comunale', 'cad', 50.00, 80.00, 120.00, 9, false);

-- ==========================================
-- STEP 6: Enable RLS on new tables
-- ==========================================

ALTER TABLE ristrutturazioni_categorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_sottocategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristrutturazioni_selezioni_progetto ENABLE ROW LEVEL SECURITY;

-- Public read access to categories and subcategories (price catalog)
CREATE POLICY "Categorie are publicly readable" ON ristrutturazioni_categorie FOR SELECT USING (true);
CREATE POLICY "Sottocategorie are publicly readable" ON ristrutturazioni_sottocategorie FOR SELECT USING (true);

-- User-specific access to project selections
CREATE POLICY "Users can manage their project selections" ON ristrutturazioni_selezioni_progetto FOR ALL USING (true);

-- ==========================================
-- STEP 7: Update existing coefficients table
-- ==========================================

-- Keep f_accesso coefficient (elevator/no-elevator)
UPDATE ristrutturazioni_coefficienti SET valore = 1.06 WHERE nome = 'f_accesso_piano_alto';

-- ==========================================
-- FINAL MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completata con successo!';
  RAISE NOTICE 'Sono state create:';
  RAISE NOTICE '- 14 categorie di lavorazione';
  RAISE NOTICE '- ~150 sottocategorie con prezzi Piemonte 2025';
  RAISE NOTICE '- Nuove tabelle per workflow manuale';
  RAISE NOTICE 'Il coefficiente f_accesso (1.06) è stato mantenuto per piano senza ascensore';
END $$;
