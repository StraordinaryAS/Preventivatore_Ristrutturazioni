# Preventivatore Ristrutturazioni - Documentazione per Claude

## 📋 Panoramica Progetto

**Applicazione web MVP completa** per generare preventivi di ristrutturazione edilizia con prezzario base Piemonte 2025.

### Stack Tecnologico
- **Frontend**: Next.js 15.5.6, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL con Row Level Security)
- **Deployment**: Vercel (configurato con sottodomini Infomaniak)
- **State Management**: React hooks (useState, useEffect)

---

## 🗄️ Architettura Database

### Namespace: `ristrutturazioni_*`

Tutte le tabelle usano il prefisso `ristrutturazioni_` per isolamento logico.

#### Tabelle Principali

**1. `ristrutturazioni_progetti`**
```sql
- id (uuid, PK)
- nome (text) - Nome progetto
- mq_totali (numeric)
- piano (integer)
- ha_ascensore (boolean)
- livello_finiture (text) - 'economy' | 'standard' | 'premium'
- workflow_mode (text) - 'auto' | 'manual'
- stato (text) - 'bozza' | 'calcolato' | 'approvato'
- perc_oneri_sicurezza (numeric) - Default 0.02 (2%)
- perc_spese_generali (numeric) - Default 0.10 (10%)
- perc_utile_impresa (numeric) - Default 0.10 (10%)
- pratiche_tecniche_importo (numeric) - Default 3200
- perc_contingenze (numeric) - Default 0.07 (7%)
- perc_iva (numeric) - Default 0.10 (10%)
- progetto_originale_id (uuid) - Per versioning
- duplicato_da (text) - Descrizione origine
- created_at, updated_at
```

**2. `ristrutturazioni_computi`**
```sql
- id (uuid, PK)
- progetto_id (uuid, FK)
- lavori_base (numeric)
- oneri_sicurezza (numeric)
- spese_generali (numeric)
- utile_impresa (numeric)
- pratiche_tecniche (numeric)
- contingenze (numeric)
- imponibile (numeric)
- iva (numeric)
- totale (numeric)
- breakdown_categorie (jsonb)
- coeff_accesso (numeric)
- coeff_complessita (numeric)
- versione (integer)
- created_at
```

**3. `ristrutturazioni_categorie`**
```sql
- id (uuid, PK)
- codice (text, unique)
- nome (text)
- descrizione (text)
- ordine (integer)
- attiva (boolean)
- created_at, updated_at
```

**4. `ristrutturazioni_sottocategorie`**
```sql
- id (uuid, PK)
- id_categoria (uuid, FK)
- codice (text, unique)
- nome (text)
- descrizione (text)
- unita_misura (text) - 'mq', 'ml', 'cad', etc.
- prezzo_economy (numeric)
- prezzo_standard (numeric)
- prezzo_premium (numeric)
- applica_f_accesso (boolean)
- ordine (integer)
- attiva (boolean)
- created_at, updated_at
```

**5. `ristrutturazioni_selezioni_progetto`**
```sql
- id (uuid, PK)
- id_progetto (uuid, FK)
- id_sottocategoria (uuid, FK)
- quantita (numeric)
- prezzo_unitario_custom (numeric) - Override prezzo
- prezzo_a_corpo (numeric) - Prezzo fisso totale
- usa_prezzo_a_corpo (boolean)
- note (text)
- created_at, updated_at
```

**6. `ristrutturazioni_prezzi_custom`**
```sql
- id (uuid, PK)
- id_sottocategoria (uuid, FK, unique)
- prezzo_economy_custom (numeric)
- prezzo_standard_custom (numeric)
- prezzo_premium_custom (numeric)
- note (text)
- created_at, updated_at
```

### Migrations Eseguite

- ✅ **Migration 003**: Creazione tabelle workflow manuale (categorie, sottocategorie, selezioni)
- ✅ **Migration 004**: Aggiunta percentuali editabili a progetti
- ✅ **Migration 005**: Aggiunta tabella prezzi_custom + campo usa_prezzo_a_corpo

---

## 🏗️ Struttura File Progetto

```
preventivi-ristrutturazioni-app/
├── app/
│   ├── page.tsx                    # Main app - Form + Calcolo + Lista progetti
│   ├── prezzi/
│   │   └── page.tsx               # Gestione prezzi custom globali
│   ├── admin/
│   │   └── prezzario/
│   │       └── page.tsx           # CRUD categorie/sottocategorie
│   └── preventivo/                # 🚧 TODO: Refactoring 2-page structure
│       ├── nuovo/
│       │   └── page.tsx          # 🚧 TODO: Nuovi preventivi
│       └── [id]/
│           └── page.tsx          # 🚧 TODO: Vista/modifica progetto
├── lib/
│   ├── supabase.ts               # Client Supabase + TypeScript types
│   └── pricing-engine-manual.ts  # Backend logic (17 metodi statici)
├── supabase/
│   └── migrations/
│       ├── 003_manual_workflow.sql
│       ├── 004_update_percentuali_editabili.sql
│       └── 005_prezzi_custom_e_prezzo_a_corpo.sql
├── .env.local                     # Environment variables (gitignored)
├── CHANGELOG.md                   # Storico sviluppo completo
└── CLAUDE.md                      # Questo file
```

---

## 🎯 Features Implementate (MVP 100%)

### ✅ 1. Workflow Manuale Completo
- Selezione categorie → sottocategorie → quantità
- Calcolo automatico con coefficienti (accesso, complessità)
- Formule PRD complete per riepilogo economico

### ✅ 2. Gestione Progetti
- **Salva**: Crea nuovo progetto con versioning automatico
- **Carica**: Ripristina tutti i dati (info + percentuali + selezioni)
- **Duplica**: Copia completa con nuovo nome
- **Elimina**: Cascade delete (progetto + selezioni + computi)
- **Versioning automatico**: Nome → Nome v2 → Nome v3

### ✅ 3. Prezzi Custom (3 livelli)
- **Livello 1 - Prezzario base**: Default da DB (Piemonte 2025)
- **Livello 2 - Prezzi custom globali**: `/prezzi` - Override permanenti
- **Livello 3 - Prezzi custom progetto**: Override per singolo preventivo
- **Livello 4 - Prezzo a corpo**: Prezzo fisso totale (ignora quantità)

### ✅ 4. Percentuali Economiche Editabili
Ogni progetto può personalizzare:
- Oneri sicurezza (default 2%)
- Spese generali (default 10%)
- Utile impresa (default 10%)
- Pratiche tecniche (default €3200)
- Contingenze (default 7%)
- IVA (default 10%)

### ✅ 5. Admin - Gestione Prezzario CRUD
Pagina `/admin/prezzario`:
- Crea/modifica/elimina categorie
- Crea/modifica/elimina sottocategorie
- Toggle attiva/disattiva (soft delete)
- Modali per form
- Protezioni eliminazione

### ✅ 6. Prezzo a Corpo
- Checkbox nella tabella quantità/prezzi
- Quando attivo: ignora quantità e prezzo unitario
- Campo "Prezzo totale" con stile evidenziato
- Priorità massima nel calcolo

---

## 🔧 Backend: PricingEngineManual

File: `lib/pricing-engine-manual.ts`

### Metodi Principali (17 totali)

#### Catalogo e Calcolo
```typescript
static async caricaCatalogo(): Promise<CategoriaConSottocategorie[]>
static async calcolaPreventivo(params: CalcoloParams): Promise<CalcoloManualResult>
```

#### Gestione Progetti
```typescript
static async caricaProgetti(limit?: number): Promise<Progetto[]>
static async duplicaProgetto(id_progetto: string, nuovoNome: string)
static async eliminaProgetto(id_progetto: string): Promise<{success: boolean, error?: string}>
```

#### Selezioni
```typescript
static async salvaSelezioni(id_progetto: string, voci: VoceSelezione[])
```

#### Prezzi Custom Globali
```typescript
static async caricaTuttiPrezziCustom(): Promise<PrezzoCustom[]>
static async salvaPrezzoCustomGlobale(id_sottocategoria: string, economy?, standard?, premium?)
static async eliminaPrezzoCustomGlobale(id_sottocategoria: string)
```

#### Admin Categorie
```typescript
static async creaNuovaCategoria(data: {codice, nome, descrizione, ordine})
static async modificaCategoria(id: string, data: {nome, descrizione})
static async eliminaCategoria(id: string)
static async toggleCategoria(id: string)
```

#### Admin Sottocategorie
```typescript
static async creaNuovaSottocategoria(data: {id_categoria, codice, nome, unita_misura, prezzi, ...})
static async modificaSottocategoria(id: string, data: {...})
static async eliminaSottocategoria(id: string)
static async toggleSottocategoria(id: string)
```

### Formule Calcolo (PRD)

```typescript
// 1. Somma lavori base
lavori_base = Σ(quantità × prezzo_unitario_finale)

// 2. Applica coefficiente accesso (se sottocategoria.applica_f_accesso)
if (piano > 0 && !ha_ascensore) {
  coeff_accesso = 1 + (0.03 × piano)  // +3% per piano
}
lavori_base_con_accesso = lavori_base × coeff_accesso

// 3. Calcola spese
oneri_sicurezza = lavori_base_con_accesso × perc_oneri_sicurezza
spese_generali = lavori_base_con_accesso × perc_spese_generali
utile_impresa = lavori_base_con_accesso × perc_utile_impresa
pratiche_tecniche = importo_fisso
contingenze = (lavori + oneri + spese + utile + pratiche) × perc_contingenze

// 4. Imponibile e IVA
imponibile = lavori + oneri + spese + utile + pratiche + contingenze
iva = imponibile × perc_iva
totale = imponibile + iva
```

### Priorità Prezzi (4 livelli)

```typescript
if (voce.usa_prezzo_a_corpo) {
  prezzo_finale = voce.prezzo_a_corpo  // Livello 1 (max priorità)
} else if (voce.prezzo_unitario_custom) {
  prezzo_finale = voce.prezzo_unitario_custom × quantità  // Livello 2
} else if (prezzoCustomGlobale[livello]) {
  prezzo_finale = prezzoCustomGlobale[livello] × quantità  // Livello 3
} else {
  prezzo_finale = sottocategoria[`prezzo_${livello}`] × quantità  // Livello 4 (base)
}
```

---

## 🎨 Frontend: app/page.tsx

### State Management (React Hooks)

```typescript
// Catalog
const [catalogo, setCatalogo] = useState<CategoriaConSottocategorie[]>([])
const [loadingCatalogo, setLoadingCatalogo] = useState(true)

// Project input
const [nomeProgetto, setNomeProgetto] = useState('')
const [mq, setMq] = useState(90)
const [piano, setPiano] = useState(4)
const [ascensore, setAscensore] = useState(false)
const [livelloFiniture, setLivelloFiniture] = useState<'economy' | 'standard' | 'premium'>('standard')

// Percentuali editabili
const [percOneriSicurezza, setPercOneriSicurezza] = useState(2)
const [percSpeseGenerali, setPercSpeseGenerali] = useState(10)
const [percUtileImpresa, setPercUtileImpresa] = useState(10)
const [importoPraticheTecniche, setImportoPraticheTecniche] = useState(3200)
const [percContingenze, setPercContingenze] = useState(7)
const [percIVA, setPercIVA] = useState(10)

// Selezioni
const [vociSelezionate, setVociSelezionate] = useState<VoceSelezione[]>([])

// Calcolo
const [risultato, setRisultato] = useState<CalcoloManualResult | null>(null)
const [calculating, setCalculating] = useState(false)
const [showDettaglio, setShowDettaglio] = useState(false)

// Progetti salvati
const [progettoSalvato, setProgettoSalvato] = useState<Progetto | null>(null)
const [progettiSalvati, setProgettiSalvati] = useState<Progetto[]>([])
const [loadingProgetti, setLoadingProgetti] = useState(false)
const [showProgettiList, setShowProgettiList] = useState(true)
```

### Funzioni Principali

```typescript
// Caricamento dati
caricaCatalogo(): void
caricaListaProgetti(): void

// Gestione selezioni
selezionaSottocategoria(sottocat): void
rimuoviSelezione(id): void
aggiornaQuantita(id, quantita): void
aggiornaPrezzoCustom(id, prezzo): void
togglePrezzoACorpo(id, usaACorpo): void
aggiornaPrezzoACorpo(id, prezzo): void

// Gestione progetti
calcolaPreventivo(): void  // Calcola + Salva + Versioning
caricaProgetto(progetto): void
duplicaProgetto(progetto): void
eliminaProgetto(progetto): void
nuovoProgetto(): void  // Reset form
```

### Sistema Versioning

Quando si salva un progetto:

1. **Nome nuovo** → Crea progetto con quel nome
2. **Nome esistente** → Crea automaticamente versione:
   - `Appartamento Via Roma` → `Appartamento Via Roma v2`
   - `Appartamento Via Roma v2` → `Appartamento Via Roma v3`
3. **Alert informativo** quando viene creata nuova versione
4. **Badge "Versione"** arancione nella lista progetti
5. **Campo `duplicato_da`** traccia l'origine: "Aggiornamento di: Nome Originale"

**Vantaggi:**
- ✅ Storico completo modifiche
- ✅ Zero rischio sovrascrittura
- ✅ Data creazione sempre aggiornata
- ✅ Confronto versioni possibile

---

## 🚀 Deployment su Vercel con Infomaniak

### Setup Consigliato: **Opzione 1 - Sottodomini**

Per gestire più app sullo stesso dominio Infomaniak, usa sottodomini separati:

```
https://preventivi.tuodominio.ch    → Questo progetto
https://gestionale.tuodominio.ch    → Altra app futura
https://crm.tuodominio.ch           → Altra app futura
https://www.tuodominio.ch           → Sito principale
```

### Procedura Deploy

#### 1. Push su GitHub
```bash
git push origin main
```

#### 2. Deploy su Vercel
1. Vai su [vercel.com](https://vercel.com)
2. Login con GitHub
3. Import repository `preventivi-ristrutturazioni-app`
4. Framework: **Next.js** (auto-detect)
5. **Environment Variables** (IMPORTANTE):
   ```
   NEXT_PUBLIC_SUPABASE_URL = [da .env.local]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [da .env.local]
   ```
6. Deploy → URL temporaneo: `preventivi-ristrutturazioni-app.vercel.app`

#### 3. Configura Supabase
1. Dashboard Supabase → Authentication → URL Configuration
2. Aggiungi Redirect URL:
   ```
   https://preventivi-ristrutturazioni-app.vercel.app/*
   ```

#### 4. Test su URL Vercel
Verifica che l'app funzioni correttamente prima di collegare dominio custom.

#### 5. Collega Dominio Custom

**Su Vercel:**
1. Project Settings → Domains → Add Domain
2. Inserisci: `preventivi.tuodominio.ch`
3. Vercel ti darà istruzioni DNS

**Su Infomaniak (Zona DNS):**

Aggiungi questi record:

```
Tipo: CNAME
Nome: preventivi
Valore: cname.vercel-dns.com
TTL: 3600
```

**Per dominio principale (senza sottodominio):**
```
Tipo: A
Nome: @
Valore: 76.76.21.21
TTL: 3600
```

**Per www:**
```
Tipo: CNAME
Nome: www
Valore: cname.vercel-dns.com
TTL: 3600
```

#### 6. Verifica DNS su Vercel
- Click "Verify" su Vercel
- Attendi 5-60 minuti per propagazione DNS
- SSL automatico attivato da Vercel

#### 7. Aggiorna Supabase con Dominio Custom
Dashboard Supabase → Authentication → URL Configuration:
```
https://preventivi.tuodominio.ch/*
https://www.tuodominio.ch/*
```

### Vantaggi Sottodomini
- ✅ Ogni app completamente indipendente
- ✅ Deploy separati (non si influenzano)
- ✅ Facile aggiungere nuove app in futuro
- ✅ Performance migliori

---

## 🚧 TODO: Refactoring Architettura (Sessione Futura)

### Obiettivo: Struttura 2 Pagine

**Motivazione:** Separare dashboard (lista progetti) da editor (crea/modifica preventivo).

### Struttura Proposta

```
app/
├── page.tsx                    # Dashboard - Lista progetti
├── preventivo/
│   ├── nuovo/
│   │   └── page.tsx           # Crea nuovo preventivo
│   └── [id]/
│       └── page.tsx           # Visualizza E modifica preventivo
```

### Workflow Utente

**Dashboard (`/`):**
- Lista tutti i progetti salvati
- Bottoni: `+ Nuovo`, `Visualizza`, `Duplica`, `Elimina`

**Preventivo Nuovo (`/preventivo/nuovo`):**
- Form completo per nuovo preventivo
- Al salvataggio → redirect a `/preventivo/[id]?mode=view`

**Preventivo Esistente (`/preventivo/[id]`):**

2 modalità:

**1. Modalità Vista (default):**
- Read-only
- Bottoni: `Modifica`, `PDF`, `Stampa`, `Duplica`, `Elimina`

**2. Modalità Modifica (dopo click "Modifica"):**
- Form editabile
- Al salvataggio: **chiedi utente**
  - Opzione A: `Sovrascrivi questo progetto` (elimina vecchio, salva come stesso nome)
  - Opzione B: `Crea nuova versione` (mantiene vecchio, crea v2/v3/etc)

### Tasks da Fare

1. [x] Creare struttura cartelle `app/preventivo`
2. [ ] Trasformare `app/page.tsx` in dashboard lista progetti
3. [ ] Creare `app/preventivo/nuovo/page.tsx`
4. [ ] Creare `app/preventivo/[id]/page.tsx` con logica view/edit
5. [ ] Implementare dialog "Sovrascrivi vs Nuova versione"
6. [ ] Aggiungere bottoni PDF e Stampa (placeholder)
7. [ ] Testare flusso completo

---

## 📝 Note Importanti

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

**⚠️ NON committare .env.local su GitHub!**

### Row Level Security (RLS)

Attualmente **RLS è disabilitato** su tutte le tabelle per semplicità MVP.

Per produzione con autenticazione:
```sql
ALTER TABLE ristrutturazioni_progetti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
ON ristrutturazioni_progetti FOR SELECT
USING (auth.uid() = user_id);
```

### TypeScript Types

Tutti i tipi sono definiti in `lib/supabase.ts`:
- `Progetto`
- `Computo`
- `Categoria`
- `Sottocategoria`
- `SelezioneProgetto`
- `PrezzoCustom`

### Commit Convention

Usa conventional commits:
```
feat: nuova funzionalità
fix: bug fix
refactor: refactoring
docs: documentazione
chore: manutenzione
```

---

## 🐛 Known Issues / Limitazioni

1. **No autenticazione utente** - MVP single-tenant
2. **No export PDF/Excel** - Placeholder per versione futura
3. **No stampa diretta** - Da implementare
4. **No multilingua** - Solo italiano
5. **No responsive mobile** - Ottimizzato per desktop
6. **Prezzario base limitato** - ~40 voci, serve import completo

---

## 📚 Risorse Utili

### Documentazione
- [Next.js 15](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel](https://vercel.com/docs)

### Repository
- GitHub: [da specificare]
- Vercel: [da specificare]
- Supabase: [project-id].supabase.co

---

## 🎯 Quick Start per Nuova Chat

1. Leggi questo file per context completo
2. Controlla `CHANGELOG.md` per storico dettagliato
3. Esplora `lib/pricing-engine-manual.ts` per logica backend
4. Vedi `app/page.tsx` per UI principale
5. Migrations in `supabase/migrations/` per schema DB

**Comando dev:**
```bash
cd "c:\Development\GEKO\App preventivo Ristrutturazioni\preventivi-ristrutturazioni-app"
npm run dev
```

**URL locale:**
http://localhost:3000

---

**Versione documento:** 2025-11-28
**Stato progetto:** MVP 100% completo, pronto per deploy
**Prossimo step:** Deploy Vercel + Refactoring 2-page structure
