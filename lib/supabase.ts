import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Progetto {
  id: string
  created_at: string
  updated_at: string
  nome: string
  descrizione?: string
  mq_totali: number
  numero_bagni: number
  numero_cucine: number
  piano?: number
  ha_ascensore: boolean
  livello_finiture: 'economy' | 'standard' | 'premium'
  stato: 'bozza' | 'calcolato' | 'approvato'
  workflow_mode: 'auto' | 'manual'
  // Percentuali editabili
  perc_oneri_sicurezza?: number // Default 0.02 (2%)
  perc_spese_generali?: number // Default 0.10 (10%)
  perc_utile_impresa?: number // Default 0.10 (10%)
  pratiche_tecniche_importo?: number // Default 3200
  perc_contingenze?: number // Default 0.07 (7%)
  perc_iva?: number // Default 0.10 (10%)
  // Duplicazione
  progetto_originale_id?: string
  duplicato_da?: string
  metadata?: any
}

export interface Computo {
  id: string
  progetto_id: string
  created_at: string
  lavori_base: number
  oneri_sicurezza: number
  spese_generali: number
  utile_impresa: number
  pratiche_tecniche: number
  contingenze: number
  imponibile: number
  iva: number
  totale: number
  breakdown_categorie: Record<string, number>
  coeff_accesso: number
  coeff_complessita: number
  pdf_url?: string
  excel_url?: string
  versione: number
  note?: string
}

export interface VocePrezzario {
  id: string
  codice: string
  categoria: string
  sottocategoria?: string
  descrizione: string
  prezzo_economy?: number
  prezzo_standard: number
  prezzo_premium?: number
  unita_misura: string
  anno_prezzario: number
  fonte: string
  attivo: boolean
}

export interface Ricetta {
  id: string
  nome_intervento: string
  categoria: string
  descrizione?: string
  voci_prezzario: Array<{
    codice: string
    quantita_base: number
    moltiplicatore: string | number
  }>
  formula_quantita?: string
  attivo: boolean
}

export interface Coefficiente {
  id: string
  tipo: string
  nome: string
  descrizione?: string
  valore: number
  condizioni?: any
  attivo: boolean
}

// New types for manual workflow
export interface Categoria {
  id: string
  codice: string
  nome: string
  descrizione?: string
  ordine: number
  attiva: boolean
  created_at: string
  updated_at: string
}

export interface Sottocategoria {
  id: string
  id_categoria: string
  codice: string
  nome: string
  descrizione?: string
  unita_misura: string
  prezzo_economy?: number
  prezzo_standard?: number
  prezzo_premium?: number
  note?: string
  ordine: number
  attiva: boolean
  applica_f_accesso: boolean
  created_at: string
  updated_at: string
}

export interface SelezioneProgetto {
  id: string
  id_progetto: string
  id_sottocategoria: string
  quantita: number
  prezzo_unitario_custom?: number
  prezzo_a_corpo?: number
  usa_prezzo_a_corpo: boolean
  note?: string
  created_at: string
  updated_at: string
}

// Extended types with joins
export interface SottocategoriaWithCategoria extends Sottocategoria {
  categoria?: Categoria
}

export interface SelezioneProgettoWithDetails extends SelezioneProgetto {
  sottocategoria?: SottocategoriaWithCategoria
}

// New: Prezzi Custom Globali
export interface PrezzoCustom {
  id: string
  id_sottocategoria: string
  prezzo_economy_custom?: number
  prezzo_standard_custom?: number
  prezzo_premium_custom?: number
  note?: string
  created_at: string
  updated_at: string
}
