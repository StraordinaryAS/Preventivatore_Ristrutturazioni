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
