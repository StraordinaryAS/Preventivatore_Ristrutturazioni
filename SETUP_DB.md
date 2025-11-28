# Setup Database - Istruzioni

## Passo 1: Accedi a Supabase Tenant Demo

Vai su: https://supabase.com/dashboard/project/sngyhrzlblokthugamib/editor

**IMPORTANTE**: Usa il progetto **GEKO Tenant Demo** (NON Master DB).
Le tabelle `ristrutturazioni_*` saranno create accanto alle 6 tabelle Business Tracking esistenti, ma completamente separate grazie al prefisso.

## Passo 2: Esegui Setup Completo (METODO VELOCE)

1. Clicca su **SQL Editor** nel menu laterale
2. Clicca su **New Query**
3. Apri il file `EXECUTE_THIS_ON_SUPABASE.sql` da questo progetto
4. Copia **TUTTO** il contenuto del file (schema + seed data insieme)
5. Incollalo nell'editor SQL di Supabase
6. Clicca sul pulsante **Run** (o premi Ctrl+Enter)
7. Verifica che appaia "Success" in basso e il messaggio "Setup completato!"

Questo esegue in una volta:
- Creazione 5 tabelle con prefisso `ristrutturazioni_*`
- Insert ~40 voci prezzario
- Insert 1 ricetta base
- Insert ~10 coefficienti

## Passo 4: Verifica Tabelle Create

1. Vai su **Table Editor** nel menu laterale
2. Dovresti vedere le nuove tabelle con prefisso `ristrutturazioni_`:
   - ristrutturazioni_progetti
   - ristrutturazioni_computi
   - ristrutturazioni_prezzario (con ~40 voci)
   - ristrutturazioni_ricette (con 1 ricetta base)
   - ristrutturazioni_coefficienti (con ~10 coefficienti)

## Passo 5: Avvia l'App

Torna al terminale ed esegui:

```bash
npm run dev
```

Apri http://localhost:3000 e prova a generare un preventivo! 🚀

## Troubleshooting

### Errore "relation already exists"
Se hai già eseguito le migration, le tabelle esistono già. Puoi:
- Ignorare l'errore (le tabelle sono già create)
- Oppure cancellare le tabelle e ricrearle

### Errore "permission denied"
Assicurati di essere loggato su Supabase con l'account corretto.

### Errore nell'app "fetch failed"
Verifica che le credenziali in `.env.local` siano corrette e che il DB sia accessibile.
