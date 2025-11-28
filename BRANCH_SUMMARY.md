# Branch: feature/modular-workflow-manual-quantities

## Summary

Questa branch introduce il **workflow manuale** per la selezione delle lavorazioni, sostituendo il sistema automatico basato su ricette e auto-scaling.

## What Changed

### ✅ Database
- **3 nuove tabelle**: `ristrutturazioni_categorie`, `ristrutturazioni_sottocategorie`, `ristrutturazioni_selezioni_progetto`
- **14 categorie** di lavorazione (Demolizioni, Murature, Impianti, ecc.)
- **~150 sottocategorie** con prezzi Piemonte 2025 (economy/standard/premium)
- **Coefficiente f_accesso** mantenuto: +6% per piano ≥3 senza ascensore

### ✅ Backend
- **Nuovo pricing engine**: `lib/pricing-engine-manual.ts`
- **Metodi principali**:
  - `calcolaPreventivoDaSelezioni()` - Da DB
  - `calcolaPreventivoDaVoci()` - Preview real-time
  - `salvaSelezioni()` - Persist to DB
  - `caricaCatalogo()` - Load full catalog
- **TypeScript types** aggiornati in `lib/supabase.ts`

### ✅ Frontend
- **Nuova UI**: `app/page-manual.tsx`
- **Features**:
  - Catalogo navigabile per categorie
  - Selezione manuale sottocategorie
  - Input quantità per ogni voce
  - Override prezzi custom
  - Ricalcolo real-time
  - Warning piano senza ascensore
  - Riepilogo economico completo
  - Breakdown per categorie

## Files Changed/Created

```
preventivi-ristrutturazioni-app/
├── supabase/migrations/
│   └── 003_migrate_to_manual_workflow.sql      ← NEW: Migration SQL
├── lib/
│   ├── supabase.ts                             ← MODIFIED: Added new types
│   └── pricing-engine-manual.ts                ← NEW: Manual workflow engine
├── app/
│   └── page-manual.tsx                         ← NEW: Manual UI
├── MIGRATION_MANUAL_WORKFLOW.md                ← NEW: Complete documentation
└── BRANCH_SUMMARY.md                           ← NEW: This file
```

## How to Deploy

### 1. Execute Database Migration

```bash
# Go to Supabase Dashboard
# https://supabase.com/dashboard/project/sngyhrzlblokthugamib/editor

# SQL Editor → New Query → Copy/paste content from:
supabase/migrations/003_migrate_to_manual_workflow.sql

# Click "Run" (Ctrl+Enter)
```

**Expected output:**
```
Migration 003 completata con successo!
- 14 categorie di lavorazione
- ~150 sottocategorie con prezzi Piemonte 2025
- Nuove tabelle per workflow manuale
```

### 2. Switch to New UI

**Option A: Replace current page (recommended for production)**
```bash
cd preventivi-ristrutturazioni-app

# Backup old page
mv app/page.tsx app/page-auto-backup.tsx

# Activate new page
mv app/page-manual.tsx app/page.tsx

# Restart dev server
npm run dev
```

**Option B: Keep both (for testing)**
```bash
# Create new route
mkdir -p app/manual
cp app/page-manual.tsx app/manual/page.tsx

# Access at:
# http://localhost:3000 → Old workflow
# http://localhost:3000/manual → New workflow
```

### 3. Test

Open http://localhost:3000 and verify:
- ✅ Catalog loads (14 categories)
- ✅ Can expand/collapse categories
- ✅ Can add subcategories
- ✅ Can set quantities
- ✅ Calculate preventivo works
- ✅ f_accesso coefficient applies when piano ≥3 && !ascensore
- ✅ Breakdown by categories displays
- ✅ Can recalculate after editing

## Key Features

### Manual Selection Workflow
1. User selects categories → subcategories
2. User inputs quantities manually
3. System calculates based on selections
4. User can override prices
5. Real-time recalculation

### Pricing Formula
```
prezzo_base = sottocategoria.prezzo_[economy|standard|premium]
prezzo_custom = selezione.prezzo_unitario_custom || prezzo_base

if (sottocategoria.applica_f_accesso && !ascensore && piano >= 3):
  prezzo_finale = prezzo_custom × 1.06
else:
  prezzo_finale = prezzo_custom

subtotale = quantita × prezzo_finale
```

### Economic Formulas (unchanged)
```
L = Σ subtotale_voci
O_sic = L × 0.02
S = L × 0.10
U = (L + S) × 0.10
P_tec = €3200
A = (L + S + U) × 0.07
I = L + O_sic + S + U + P_tec + A
IVA = I × 0.10
T = I + IVA
```

## Prezzario Sample

### Demolizioni
- Demolizione pavimenti: €15-22/mq
- Smaltimento inerti: €35-45/t

### Impianti
- Quadro elettrico: €450-950/cad
- Punto luce: €45-75/cad
- Impianto bagno completo: €2800-4800/cad

### Pavimenti
- Gres 60x60: €45-75/mq
- Parquet: €55-95/mq

### Pratiche
- CILA: €800-1800/cad
- Direzione lavori: €2000-5500/cad
- APE: €250-500/cad

**Full catalog:** ~150 items across 14 categories

## Documentation

📚 **Complete guide:** [MIGRATION_MANUAL_WORKFLOW.md](./MIGRATION_MANUAL_WORKFLOW.md)

Contents:
- Database schema details
- Migration steps
- Code architecture
- Testing checklist
- Troubleshooting
- Rollback plan
- Next steps roadmap

## Merge Checklist

Before merging to `main`:

- [ ] Database migration executed successfully on Supabase
- [ ] All tests passed (catalog loading, calculation, persistence)
- [ ] Documentation reviewed
- [ ] README.md updated with new workflow info
- [ ] Old workflow preserved or removed (decide)
- [ ] Team review completed
- [ ] Verified on staging environment (if applicable)

## Branch Info

- **Created:** 2025-11-28
- **Base:** `main`
- **Type:** Feature
- **Status:** Ready for testing
- **Migration risk:** Low (adds new tables, doesn't modify existing data)

## Rollback

If needed, see [MIGRATION_MANUAL_WORKFLOW.md](./MIGRATION_MANUAL_WORKFLOW.md#rollback-plan)

Quick rollback:
```bash
# Frontend only
mv app/page.tsx app/page-manual-backup.tsx
mv app/page-auto-backup.tsx app/page.tsx
```

## Next Steps After Merge

1. **PDF Export**: Implement PDF generation with jsPDF
2. **Excel Export**: Implement Excel export with ExcelJS
3. **Project Management**: List, load, duplicate projects
4. **Templates**: Predefined "Bagno standard", "Cucina completa", etc.
5. **Search**: Add search bar for catalog
6. **Filters**: Category filters in catalog view
7. **Multi-user**: Authentication and project ownership

## Contact

**Questions?** Check [MIGRATION_MANUAL_WORKFLOW.md](./MIGRATION_MANUAL_WORKFLOW.md) or contact repo maintainer.

---

**Made with ❤️ in Piemonte**
