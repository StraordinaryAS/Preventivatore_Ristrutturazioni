import { supabase, type Progetto, type VocePrezzario, type Ricetta, type Coefficiente } from './supabase'

export interface CalcoloResult {
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
  dettaglio_voci: Array<{
    codice: string
    descrizione: string
    quantita: number
    prezzo_unitario: number
    subtotale: number
    categoria: string
  }>
}

export class PricingEngine {

  /**
   * Calcola il preventivo completo per un progetto
   */
  static async calcolaPreventivo(progetto: Progetto): Promise<CalcoloResult> {
    // 1. Carica ricetta base
    const { data: ricetta, error: ricettaError } = await supabase
      .from('ristrutturazioni_ricette')
      .select('*')
      .eq('nome_intervento', 'ristrutturazione_totale_90mq')
      .single()

    if (ricettaError || !ricetta) {
      throw new Error('Ricetta non trovata')
    }

    // 2. Carica prezzario
    const { data: prezzario, error: prezzarioError } = await supabase
      .from('ristrutturazioni_prezzario')
      .select('*')
      .eq('attivo', true)

    if (prezzarioError || !prezzario) {
      throw new Error('Prezzario non trovato')
    }

    // 3. Carica coefficienti
    const { data: coefficienti, error: coeffError } = await supabase
      .from('ristrutturazioni_coefficienti')
      .select('*')
      .eq('attivo', true)

    if (coeffError || !coefficienti) {
      throw new Error('Coefficienti non trovati')
    }

    // 4. Calcola coefficienti applicabili
    const coeff_accesso = this.calcolaCoeffAccesso(progetto, coefficienti)
    const coeff_complessita = 1.000 // Standard per MVP

    // 5. Calcola voci con quantità
    const dettaglio_voci = this.calcolaVoci(progetto, ricetta, prezzario, coeff_accesso, coeff_complessita)

    // 6. Calcola totale lavori base (L)
    const lavori_base = dettaglio_voci.reduce((sum, v) => sum + v.subtotale, 0)

    // 7. Calcola breakdown per categorie
    const breakdown_categorie = this.calcolaBreakdown(dettaglio_voci)

    // 8. Applica formule economiche
    const coeffPercentuali = this.getCoefficientiPercentuali(coefficienti)

    const oneri_sicurezza = lavori_base * coeffPercentuali.oneri_sicurezza
    const spese_generali = lavori_base * coeffPercentuali.spese_generali
    const utile_impresa = (lavori_base + spese_generali) * coeffPercentuali.utile_impresa
    const pratiche_tecniche = 3200 // Fisso per MVP (CILA + DL + APE)
    const contingenze = (lavori_base + spese_generali + utile_impresa) * coeffPercentuali.contingenze

    const imponibile = lavori_base + oneri_sicurezza + spese_generali + utile_impresa + pratiche_tecniche + contingenze
    const iva = imponibile * coeffPercentuali.iva_agevolata
    const totale = imponibile + iva

    return {
      lavori_base: Math.round(lavori_base * 100) / 100,
      oneri_sicurezza: Math.round(oneri_sicurezza * 100) / 100,
      spese_generali: Math.round(spese_generali * 100) / 100,
      utile_impresa: Math.round(utile_impresa * 100) / 100,
      pratiche_tecniche,
      contingenze: Math.round(contingenze * 100) / 100,
      imponibile: Math.round(imponibile * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      totale: Math.round(totale * 100) / 100,
      breakdown_categorie,
      coeff_accesso,
      coeff_complessita,
      dettaglio_voci
    }
  }

  /**
   * Calcola il coefficiente di accesso
   */
  private static calcolaCoeffAccesso(progetto: Progetto, coefficienti: Coefficiente[]): number {
    const coeffAccesso = coefficienti.filter(c => c.tipo === 'accesso')

    // Verifica se piano senza ascensore >= 3
    if (!progetto.ha_ascensore && progetto.piano && progetto.piano >= 3) {
      const coeff = coeffAccesso.find(c => c.nome === 'piano_no_ascensore')
      return coeff?.valore || 1.060
    }

    return 1.000
  }

  /**
   * Calcola le voci con quantità scalate
   */
  private static calcolaVoci(
    progetto: Progetto,
    ricetta: Ricetta,
    prezzario: VocePrezzario[],
    coeff_accesso: number,
    coeff_complessita: number
  ) {
    const dettaglio: CalcoloResult['dettaglio_voci'] = []
    const scaleFactor = progetto.mq_totali / 90 // Scala da 90mq base

    for (const voce_ricetta of ricetta.voci_prezzario) {
      const voce_prezzario = prezzario.find(p => p.codice === voce_ricetta.codice)
      if (!voce_prezzario) continue

      // Calcola quantità
      let quantita = voce_ricetta.quantita_base

      // Scala per mq se necessario
      if (typeof voce_ricetta.moltiplicatore === 'number') {
        quantita = quantita * voce_ricetta.moltiplicatore * scaleFactor
      } else if (voce_ricetta.moltiplicatore === 'numero_bagni') {
        quantita = quantita * progetto.numero_bagni
      } else if (voce_ricetta.moltiplicatore === 'numero_cucine') {
        quantita = quantita * progetto.numero_cucine
      } else {
        quantita = quantita * scaleFactor
      }

      // Seleziona prezzo per livello finiture
      let prezzo_unitario: number
      switch (progetto.livello_finiture) {
        case 'economy':
          prezzo_unitario = voce_prezzario.prezzo_economy || voce_prezzario.prezzo_standard
          break
        case 'premium':
          prezzo_unitario = voce_prezzario.prezzo_premium || voce_prezzario.prezzo_standard
          break
        default:
          prezzo_unitario = voce_prezzario.prezzo_standard
      }

      // Applica coefficienti
      const prezzo_finale = prezzo_unitario * coeff_accesso * coeff_complessita
      const subtotale = quantita * prezzo_finale

      dettaglio.push({
        codice: voce_prezzario.codice,
        descrizione: voce_prezzario.descrizione,
        quantita: Math.round(quantita * 100) / 100,
        prezzo_unitario: Math.round(prezzo_finale * 100) / 100,
        subtotale: Math.round(subtotale * 100) / 100,
        categoria: voce_prezzario.categoria
      })
    }

    return dettaglio
  }

  /**
   * Calcola breakdown per categorie
   */
  private static calcolaBreakdown(dettaglio_voci: CalcoloResult['dettaglio_voci']): Record<string, number> {
    const breakdown: Record<string, number> = {}

    for (const voce of dettaglio_voci) {
      if (!breakdown[voce.categoria]) {
        breakdown[voce.categoria] = 0
      }
      breakdown[voce.categoria] += voce.subtotale
    }

    // Arrotonda
    for (const key in breakdown) {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100
    }

    return breakdown
  }

  /**
   * Estrae coefficienti percentuali
   */
  private static getCoefficientiPercentuali(coefficienti: Coefficiente[]) {
    const percentuali = coefficienti.filter(c => c.tipo === 'percentuale')

    return {
      spese_generali: percentuali.find(c => c.nome === 'spese_generali')?.valore || 0.10,
      utile_impresa: percentuali.find(c => c.nome === 'utile_impresa')?.valore || 0.10,
      oneri_sicurezza: percentuali.find(c => c.nome === 'oneri_sicurezza')?.valore || 0.02,
      contingenze: percentuali.find(c => c.nome === 'contingenze')?.valore || 0.07,
      iva_agevolata: percentuali.find(c => c.nome === 'iva_agevolata')?.valore || 0.10
    }
  }
}
