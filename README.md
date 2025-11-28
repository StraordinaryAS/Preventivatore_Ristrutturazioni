# GEKO Preventivi Ristrutturazioni

Webapp per generare preventivi veloci per ristrutturazioni appartamenti in Piemonte.

## Setup

### 1. Installa dipendenze

```bash
npm install
```

### 2. Configura Supabase

Le credenziali sono già configurate in `.env.local` e puntano al **GEKO Tenant Demo** DB (condiviso con Business Tracking).

**Namespace tabelle**: `ristrutturazioni_*` - SEPARATO dalle 6 tabelle Business Tracking esistenti

### 3. Crea le tabelle nel Tenant Demo DB

**Metodo veloce**: Usa il file SQL combinato [EXECUTE_THIS_ON_SUPABASE.sql](./EXECUTE_THIS_ON_SUPABASE.sql)

Vai sulla [dashboard Supabase](https://supabase.com/dashboard/project/sngyhrzlblokthugamib/editor) e:

1. Vai su **SQL Editor** → **New Query**
2. Apri il file [EXECUTE_THIS_ON_SUPABASE.sql](./EXECUTE_THIS_ON_SUPABASE.sql)
3. Copia **TUTTO** il contenuto e incollalo nell'editor SQL
4. Clicca **Run** (o Ctrl+Enter)

Questo eseguirà in una volta sola:
- Creazione schema (5 tabelle)
- Seed prezzario (~40 voci)
- Seed ricette e coefficienti

### 4. Avvia il dev server

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

## Funzionalità MVP

### Input (form semplice):
- Nome progetto
- Superficie (mq)
- Numero bagni
- Numero cucine
- Piano e ascensore
- Livello finiture (economy/standard/premium)

### Output:
- **Totale preventivo** (IVA inclusa)
- **Riepilogo economico** con tutte le voci:
  - Lavori base (L)
  - Oneri sicurezza (2%)
  - Spese generali (10%)
  - Utile impresa (10%)
  - Pratiche tecniche (€3.200 fisso)
  - Contingenze (7%)
  - IVA agevolata (10%)
- **Breakdown per categorie** (demolizioni, impianti, pavimenti, ecc.)
- **Coefficienti applicati** (es. maggiorazione +6% per piano senza ascensore)

### Calcolo

Il preventivo è basato su:
- **Ricetta base**: appartamento tipo 90mq
- **Scaling automatico**: quantità scalate in base ai mq effettivi
- **Prezzario Piemonte 2024** (semplificato per MVP)
- **Formule PRD**: applica tutte le formule economiche del documento

## Struttura Progetto

```
/app
  page.tsx          # Home con form e risultati
  layout.tsx        # Layout base
  globals.css       # Stili Tailwind
/lib
  supabase.ts       # Client Supabase + types
  pricing-engine.ts # Motore calcolo preventivi
/supabase
  /migrations       # SQL per setup DB
/components         # (future componenti riutilizzabili)
```

## Database

Tutte le tabelle usano prefisso **`ristrutturazioni_`**:

- `ristrutturazioni_progetti` - Input utente
- `ristrutturazioni_computi` - Output calcoli
- `ristrutturazioni_prezzario` - Voci prezzario
- `ristrutturazioni_ricette` - Mapping interventi → voci
- `ristrutturazioni_coefficienti` - Moltiplicatori

## Prossimi Step

- [ ] Export PDF con jsPDF
- [ ] Export Excel con ExcelJS
- [ ] Dettaglio voci nel computo
- [ ] Gestione progetti salvati
- [ ] Wizard multi-step
- [ ] Prezzario completo Piemonte
- [ ] Più ricette (bagno, cucina, impianti separati)
- [ ] Integrazione con Business Tracking

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Note

- Il preventivo è **indicativo** e basato su dati semplificati
- IVA agevolata 10% (verificare requisiti)
- Pratiche tecniche fisse a €3.200 (CILA + DL + APE)
- Coefficienti e prezzario da validare con dati reali

---

**GEKO** - Made with ❤️ in Piemonte
