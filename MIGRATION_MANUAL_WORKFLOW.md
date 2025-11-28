# Migration to Manual Workflow - Documentation

## Overview

Questa migrazione introduce un **nuovo workflow manuale** per la selezione delle lavorazioni, sostituendo il sistema automatico basato su ricette e auto-scaling da 90mq.

### Key Changes

**Prima (Auto-scaling):**
- Input: mq, numero bagni, numero cucine
- Sistema: ricetta base 90mq con scaling automatico
- Output: preventivo calcolato automaticamente

**Dopo (Manual):**
- Input: selezione manuale categorie → sottocategorie → quantità
- Sistema: catalogo completo 14 categorie + ~150 sottocategorie
- Output: preventivo basato su selezioni utente
- **Mantenuto**: coefficiente f_accesso (+6% piano senza ascensore ≥3)

---

## Database Changes

### New Tables

#### 1. `ristrutturazioni_categorie`
14 macro-categorie di lavorazione:

| Codice | Nome |
|--------|------|
| DEM | Demolizioni, rimozioni, smaltimenti |
| MUR | Opere murarie e strutturali leggere |
| CGE | Cartongesso, contropareti, controsoffitti |
| PAV | Pavimenti, rivestimenti e sottofondi |
| SER | Serramenti interni ed esterni |
| ELE | Impianto elettrico, dati, domotica |
| IDR | Impianto idrico-sanitario e gas |
| TER | Impianto termico, raffrescamento, VMC |
| ISO | Isolamenti termici e acustici interni |
| FIN | Finiture e tinteggiature |
| FAL | Opere da falegname / arredi fissi |
| EXT | Extra cantiere, oneri accesso, logistica |
| SIC | Sicurezza in cantiere |
| PRA | Pratiche tecniche e amministrative |

**Schema:**
```sql
- id: UUID (PK)
- codice: VARCHAR(50) UNIQUE
- nome: VARCHAR(200)
- descrizione: TEXT
- ordine: INT
- attiva: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

#### 2. `ristrutturazioni_sottocategorie`
~150 sottocategorie con prezzi Piemonte 2025:

**Schema:**
```sql
- id: UUID (PK)
- id_categoria: UUID (FK)
- codice: VARCHAR(50) UNIQUE
- nome: VARCHAR(300)
- descrizione: TEXT
- unita_misura: VARCHAR(20) (mq, cad, ml, t, giorno, set, ecc.)
- prezzo_economy: DECIMAL(10,2)
- prezzo_standard: DECIMAL(10,2)
- prezzo_premium: DECIMAL(10,2)
- note: TEXT
- ordine: INT
- attiva: BOOLEAN
- applica_f_accesso: BOOLEAN  -- Applica maggiorazione piano senza ascensore
- created_at, updated_at: TIMESTAMPTZ
```

**Esempi prezzi:**
- `DEM_04`: Demolizione pavimenti: €15-22/mq (economy-premium)
- `ELE_03`: Punto luce: €45-75/cad
- `IDR_01`: Impianto idrico bagno completo: €2800-4800/cad
- `TER_01`: Caldaia condensazione 24kW: €1500-2650/cad
- `PAV_01`: Gres porcellanato 60x60: €45-75/mq

#### 3. `ristrutturazioni_selezioni_progetto`
Selezioni utente per ogni progetto:

**Schema:**
```sql
- id: UUID (PK)
- id_progetto: UUID (FK)
- id_sottocategoria: UUID (FK)
- quantita: DECIMAL(10,2)
- prezzo_unitario_custom: DECIMAL(10,2) -- Opzionale, override prezzo
- note: TEXT
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(id_progetto, id_sottocategoria)
```

### Modified Tables

#### `ristrutturazioni_progetti`
Aggiunto campo:
```sql
- workflow_mode: VARCHAR(20) DEFAULT 'manual' CHECK IN ('auto', 'manual')
```

### Indexes Created
```sql
- idx_sottocategorie_categoria ON ristrutturazioni_sottocategorie(id_categoria)
- idx_sottocategorie_codice ON ristrutturazioni_sottocategorie(codice)
- idx_selezioni_progetto ON ristrutturazioni_selezioni_progetto(id_progetto)
- idx_selezioni_sottocategoria ON ristrutturazioni_selezioni_progetto(id_sottocategoria)
```

### RLS Policies
- Public read per categorie e sottocategorie (catalogo pubblico)
- User-specific per selezioni progetto

---

## Migration Steps

### 1. Execute SQL Migration

Vai su [Supabase Dashboard - GEKO Tenant Demo](https://supabase.com/dashboard/project/sngyhrzlblokthugamib/editor)

**SQL Editor → New Query → Esegui:**

```bash
# File: supabase/migrations/003_migrate_to_manual_workflow.sql
```

**Contenuto:**
- Creazione 3 nuove tabelle
- Insert 14 categorie
- Insert ~150 sottocategorie con prezzi Piemonte 2025
- Indexes e RLS policies
- Modifica tabella progetti

**Tempo esecuzione:** ~2-3 secondi

**Output atteso:**
```
Migration 003 completata con successo!
Sono state create:
- 14 categorie di lavorazione
- ~150 sottocategorie con prezzi Piemonte 2025
- Nuove tabelle per workflow manuale
Il coefficiente f_accesso (1.06) è stato mantenuto per piano senza ascensore
```

### 2. Verify Tables Created

Nel **Table Editor**, verifica presenza tabelle:
- ✅ `ristrutturazioni_categorie` (14 righe)
- ✅ `ristrutturazioni_sottocategorie` (~150 righe)
- ✅ `ristrutturazioni_selezioni_progetto` (0 righe inizialmente)

### 3. Test New Workflow

#### Opzione A: Test con nuova pagina (consigliato)

1. Rinomina file esistente:
```bash
mv app/page.tsx app/page-auto-old.tsx
```

2. Rinomina nuovo file:
```bash
mv app/page-manual.tsx app/page.tsx
```

3. Avvia dev server (se non già avviato):
```bash
npm run dev
```

4. Apri http://localhost:3000

#### Opzione B: Test affiancato

Mantieni entrambe le pagine:
- `app/page.tsx` → Workflow auto (old)
- `app/page-manual.tsx` → Workflow manuale (new)

Accedi a:
- http://localhost:3000 → Auto workflow
- Crea route `app/manual/page.tsx` che importa `page-manual.tsx` → Manual workflow

---

## New Code Architecture

### 1. TypeScript Types (`lib/supabase.ts`)

Aggiunti nuovi tipi:
```typescript
interface Categoria { ... }
interface Sottocategoria { ... }
interface SelezioneProgetto { ... }
interface SottocategoriaWithCategoria extends Sottocategoria { ... }
interface SelezioneProgettoWithDetails extends SelezioneProgetto { ... }
```

Modificato:
```typescript
interface Progetto {
  ...
  workflow_mode: 'auto' | 'manual'  // NEW
}
```

### 2. Pricing Engine Manual (`lib/pricing-engine-manual.ts`)

**Metodi principali:**

#### `calcolaPreventivoDaSelezioni(progetto: Progetto)`
Calcola preventivo basandosi su selezioni salvate nel DB per il progetto.

#### `calcolaPreventivoDaVoci(progetto: Progetto, voci: VoceDettaglio[])`
Calcola preventivo da array di voci (senza salvare DB).
Utile per preview real-time mentre l'utente seleziona.

#### `salvaSelezioni(id_progetto: string, voci: VoceDettaglio[])`
Salva selezioni utente nel DB (DELETE + INSERT).

#### `caricaCatalogo()`
Carica catalogo completo con categorie e sottocategorie ordinate.

**Formula prezzi:**
```typescript
prezzo_base = sottocategoria.prezzo_[economy|standard|premium]
prezzo_custom = selezione.prezzo_unitario_custom || prezzo_base

if (sottocategoria.applica_f_accesso && !progetto.ha_ascensore && progetto.piano >= 3) {
  prezzo_finale = prezzo_custom * 1.06 * coeff_complessita
} else {
  prezzo_finale = prezzo_custom * coeff_complessita
}

subtotale = quantita * prezzo_finale
```

**Formule economiche (identiche a prima):**
```
L = Σ subtotale_voci
O_sic = L × 0.02
S = L × 0.10
U = (L + S) × 0.10
P_tec = 3200 (fisso)
A = (L + S + U) × 0.07
I = L + O_sic + S + U + P_tec + A
IVA = I × 0.10
T = I + IVA
```

### 3. UI Component (`app/page-manual.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Header: Preventivatore - Workflow Manuale  │
└─────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────┐
│ Left Sidebar     │ Main Area                │
│                  │                          │
│ ┌─────────────┐  │ ┌────────────────────┐  │
│ │ Dati        │  │ │ Catalogo           │  │
│ │ Progetto    │  │ │ Lavorazioni        │  │
│ │             │  │ │                    │  │
│ │ - Nome      │  │ │ ▶ Demolizioni      │  │
│ │ - Mq        │  │ │ ▼ Murature         │  │
│ │ - Piano     │  │ │   • MUR_01 → +     │  │
│ │ - Ascensore │  │ │   • MUR_02 → +     │  │
│ │ - Finiture  │  │ │ ▶ Impianti         │  │
│ └─────────────┘  │ │ ...                │  │
│                  │ └────────────────────┘  │
│ ┌─────────────┐  │                          │
│ │ Lavorazioni │  │                          │
│ │ Selezionate │  │                          │
│ │ (15)        │  │                          │
│ └─────────────┘  │                          │
│                  │                          │
│ [Calcola]        │                          │
└──────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────┐
│ Risultati (dopo calcolo)                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Tabella Modifica Quantità/Prezzi       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Riepilogo Economico                     │ │
│ │ • Lavori Base: €X                       │ │
│ │ • Oneri, Spese, Utile, ecc.            │ │
│ │ • TOTALE: €Y                            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Breakdown per Categorie                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**User Flow:**
1. Inserisci dati progetto (nome, mq, piano, ascensore, finiture)
2. Espandi categorie e clicca "Aggiungi" su sottocategorie desiderate
3. Voci selezionate appaiono in sidebar
4. Click "Calcola Preventivo" → Salva progetto + selezioni + calcola
5. Appare tabella modifica quantità/prezzi
6. Modifica valori e click "Ricalcola"
7. Visualizza riepilogo economico e breakdown

**Features:**
- ✅ Catalogo completo navigabile per categoria
- ✅ Prezzi dinamici per livello finiture (economy/standard/premium)
- ✅ Modifica quantità in real-time
- ✅ Override prezzo unitario (campo custom)
- ✅ Ricalcolo istantaneo
- ✅ Warning visivo se piano senza ascensore
- ✅ Coefficiente f_accesso applicato solo su voci con flag
- ✅ Salvataggio progetto e selezioni in DB
- ✅ Riepilogo economico completo
- ✅ Breakdown per categorie

---

## Testing Checklist

### Database
- [ ] Migration 003 eseguita con successo
- [ ] 14 categorie create
- [ ] ~150 sottocategorie create con prezzi
- [ ] RLS policies attive
- [ ] Indexes creati

### Frontend
- [ ] Catalogo caricato correttamente
- [ ] Espansione/chiusura categorie funziona
- [ ] Aggiunta voce funziona
- [ ] Rimozione voce funziona
- [ ] Prezzi cambiano con livello finiture
- [ ] Warning piano senza ascensore appare se piano ≥3

### Calculation
- [ ] Calcolo preventivo con selezioni funziona
- [ ] Coefficiente f_accesso (+6%) applicato correttamente
- [ ] Formule economiche corrette (O_sic, S, U, A, IVA)
- [ ] Breakdown per categorie corretto
- [ ] Modifica quantità → ricalcolo corretto
- [ ] Override prezzo custom funziona

### Database Persistence
- [ ] Progetto salvato in `ristrutturazioni_progetti` con `workflow_mode='manual'`
- [ ] Selezioni salvate in `ristrutturazioni_selezioni_progetto`
- [ ] Computo salvato in `ristrutturazioni_computi`
- [ ] Ricalcolo aggiorna selezioni esistenti

---

## Prezzario Piemonte 2025 - Sample

### Demolizioni (DEM)
| Codice | Descrizione | Prezzo Economy | Standard | Premium | U.M. |
|--------|-------------|----------------|----------|---------|------|
| DEM_01 | Demolizione tramezzi laterizio | €25 | €28 | €32 | mq |
| DEM_04 | Demolizione pavimenti | €15 | €18 | €22 | mq |
| DEM_13 | Smaltimento inerti | €35 | €40 | €45 | t |

### Impianti Elettrici (ELE)
| Codice | Descrizione | Prezzo Economy | Standard | Premium | U.M. |
|--------|-------------|----------------|----------|---------|------|
| ELE_01 | Quadro elettrico generale | €450 | €650 | €950 | cad |
| ELE_03 | Punto luce | €45 | €58 | €75 | cad |
| ELE_12 | Impianto elettrico L2 | €3800 | €4800 | €6500 | cad |

### Idraulica (IDR)
| Codice | Descrizione | Prezzo Economy | Standard | Premium | U.M. |
|--------|-------------|----------------|----------|---------|------|
| IDR_01 | Impianto bagno completo | €2800 | €3600 | €4800 | cad |
| IDR_05 | WC sospeso | €380 | €520 | €780 | cad |
| IDR_11 | Punto acqua cucina | €280 | €350 | €480 | cad |

### Pavimenti (PAV)
| Codice | Descrizione | Prezzo Economy | Standard | Premium | U.M. |
|--------|-------------|----------------|----------|---------|------|
| PAV_01 | Gres 60x60 | €45 | €55 | €75 | mq |
| PAV_04 | Parquet prefinto | €55 | €72 | €95 | mq |
| PAV_08 | Rivestimento bagno 20x60 | €38 | €45 | €58 | mq |

### Pratiche (PRA)
| Codice | Descrizione | Prezzo Economy | Standard | Premium | U.M. |
|--------|-------------|----------------|----------|---------|------|
| PRA_01 | CILA | €800 | €1200 | €1800 | cad |
| PRA_04 | Direzione lavori | €2000 | €3500 | €5500 | cad |
| PRA_06 | APE | €250 | €350 | €500 | cad |

**Totale voci catalogo:** ~150 sottocategorie

---

## Coefficient f_accesso

**Applicazione:**
- Condizione: `!ha_ascensore && piano >= 3`
- Valore: `1.06` (+6%)
- Applicato solo su voci con `applica_f_accesso = true`

**Esempi voci con f_accesso = true:**
- Demolizioni (movimentazione detriti)
- Murature (trasporto materiali)
- Pavimenti pesanti (gres, parquet)
- Serramenti (trasporto porte/finestre)
- Termica (caldaie, radiatori)
- Smaltimenti

**Esempi voci con f_accesso = false:**
- Finiture leggere (pitture)
- Impianti elettrici (cavi)
- Pratiche tecniche (burocratiche)
- Sicurezza documentale

---

## Rollback Plan

Se necessario tornare al workflow automatico:

### 1. Database Rollback (Opzionale)
```sql
-- Non eliminare le nuove tabelle (potrebbero essere utili)
-- Basta switchare la UI al vecchio workflow

-- Se proprio necessario:
DROP TABLE IF EXISTS ristrutturazioni_selezioni_progetto CASCADE;
DROP TABLE IF EXISTS ristrutturazioni_sottocategorie CASCADE;
DROP TABLE IF EXISTS ristrutturazioni_categorie CASCADE;

-- Rimuovi campo workflow_mode
ALTER TABLE ristrutturazioni_progetti DROP COLUMN IF EXISTS workflow_mode;
```

### 2. Frontend Rollback
```bash
# Ripristina vecchia pagina
mv app/page.tsx app/page-manual-backup.tsx
mv app/page-auto-old.tsx app/page.tsx

# Restart dev server
npm run dev
```

---

## Next Steps

### Immediate (MVP Complete)
- [x] Migration SQL eseguita
- [x] Nuovo pricing engine testato
- [x] UI manuale funzionante
- [x] Salvataggio progetti e selezioni
- [x] Coefficiente f_accesso mantenuto

### Short Term (Enhancements)
- [ ] Export PDF preventivo dettagliato
- [ ] Export Excel con computo metrico
- [ ] Gestione progetti salvati (lista, carica, duplica)
- [ ] Search box per catalogo lavorazioni
- [ ] Filtri per categoria nel catalogo
- [ ] Template preventivi predefiniti (es: "Bagno standard")

### Medium Term (Business Features)
- [ ] Multi-user con autenticazione
- [ ] Storico modifiche prezzi
- [ ] Confronto preventivi (versioning)
- [ ] Statistiche progetti (tempi, costi medi)
- [ ] Integrazione con Business Tracking GEKO

### Long Term (Advanced)
- [ ] Import planimetrie con computer vision
- [ ] Calcolo automatico quantità da DXF/PDF
- [ ] AI suggerimenti lavorazioni
- [ ] Gestione fornitori con offerte
- [ ] Workflow approvazione cliente
- [ ] Integrazione Mude Piemonte

---

## Support & Troubleshooting

### Error: "Ricetta non trovata"
**Causa:** Stai usando il vecchio pricing engine con workflow manuale
**Fix:** Usa `PricingEngineManual` invece di `PricingEngine`

### Error: "Nessuna lavorazione selezionata"
**Causa:** Non hai salvato selezioni per il progetto
**Fix:** Assicurati di chiamare `PricingEngineManual.salvaSelezioni()` prima di calcolare

### Prezzi visualizzati: €0.00
**Causa:** Prezzi non inseriti per il livello finiture selezionato
**Fix:** Verifica nel DB che le sottocategorie abbiano prezzi per tutti i livelli

### Coefficiente f_accesso non applicato
**Causa:** Campo `applica_f_accesso = false` sulla sottocategoria
**Fix:** Verifica nel DB quali voci devono avere il flag a `true`

### Catalogo non si carica
**Causa:** RLS policies non configurate o errore query
**Fix:**
```sql
-- Verifica RLS
SELECT * FROM ristrutturazioni_categorie LIMIT 1;
SELECT * FROM ristrutturazioni_sottocategorie LIMIT 1;

-- Se fallisce, controlla policies:
SELECT * FROM pg_policies WHERE tablename LIKE 'ristrutturazioni%';
```

---

## Contacts

**Developer:** Claude (Anthropic AI)
**Project:** GEKO Preventivatore Ristrutturazioni
**Version:** 2.0 - Manual Workflow
**Date:** 2025-11-28

**Repository:** https://github.com/StraordinaryAS/Preventivatore_Ristrutturazioni
**Branch:** `feature/modular-workflow-manual-quantities`

---

**Made with ❤️ in Piemonte**
