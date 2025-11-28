-- ============================================
-- GEKO Preventivi Ristrutturazioni - Seed Data
-- ============================================
-- Migration: 002
-- Created: 2025-11-27
-- Prezzario base semplificato per MVP
-- ============================================

-- ============================================
-- PREZZARIO BASE
-- ============================================

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
('EXTRA02', 'extra', 'trasporti', 'Trasporti e movimentazioni materiali', 100.00, 150.00, 200.00, 'mq');

-- ============================================
-- RICETTE BASE (interventi standard)
-- ============================================

INSERT INTO ristrutturazioni_ricette (nome_intervento, categoria, descrizione, voci_prezzario, formula_quantita) VALUES

-- Ristrutturazione completa base
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
);

-- ============================================
-- COEFFICIENTI BASE
-- ============================================

INSERT INTO ristrutturazioni_coefficienti (tipo, nome, descrizione, valore, condizioni) VALUES

-- Coefficienti accesso
('accesso', 'piano_no_ascensore', 'Piano 3+ senza ascensore (+6%)', 1.060, '{"piano_min": 3, "ha_ascensore": false}'),
('accesso', 'piano_standard', 'Piano con ascensore o piano basso', 1.000, '{}'),

-- Coefficienti complessità (da implementare)
('complessita', 'standard', 'Complessità standard', 1.000, '{}'),
('complessita', 'alta', 'Edificio storico o vincoli particolari', 1.150, '{}'),

-- Coefficienti spese generali/utile
('percentuale', 'spese_generali', 'Spese generali impresa', 0.100, '{}'),
('percentuale', 'utile_impresa', 'Utile impresa', 0.100, '{}'),
('percentuale', 'oneri_sicurezza', 'Oneri sicurezza', 0.020, '{}'),
('percentuale', 'contingenze', 'Contingenze e imprevisti', 0.070, '{}'),
('percentuale', 'iva_agevolata', 'IVA agevolata 10%', 0.100, '{}');

-- ============================================
-- DONE
-- ============================================
