/**
 * Pricing Engine - Manual Workflow
 *
 * Calcola i preventivi basandosi su selezioni manuali delle lavorazioni
 * invece che su ricette auto-scaling.
 */

import {
  supabase,
  type Progetto,
  type SelezioneProgetto,
  type Sottocategoria,
  type Coefficiente,
  type SelezioneProgettoWithDetails,
  type PrezzoCustom
} from './supabase'

export interface CalcoloManualResult {
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
    id_sottocategoria: string
    codice: string
    descrizione: string
    quantita: number
    prezzo_unitario: number
    prezzo_unitario_base: number
    subtotale: number
    categoria: string
    unita_misura: string
    applica_f_accesso: boolean
  }>
}

export interface VoceDettaglio {
  id_sottocategoria: string
  quantita: number
  prezzo_unitario_custom?: number
  prezzo_a_corpo?: number
  usa_prezzo_a_corpo?: boolean
}

export class PricingEngineManual {

  /**
   * Calcola il preventivo basandosi sulle selezioni manuali salvate
   */
  static async calcolaPreventivoDaSelezioni(progetto: Progetto): Promise<CalcoloManualResult> {
    // 1. Carica selezioni progetto con sottocategorie
    const { data: selezioni, error: selezioniError } = await supabase
      .from('ristrutturazioni_selezioni_progetto')
      .select(`
        *,
        sottocategoria:ristrutturazioni_sottocategorie (
          *,
          categoria:ristrutturazioni_categorie (*)
        )
      `)
      .eq('id_progetto', progetto.id)

    if (selezioniError) {
      throw new Error(`Errore caricamento selezioni: ${selezioniError.message}`)
    }

    if (!selezioni || selezioni.length === 0) {
      throw new Error('Nessuna lavorazione selezionata per questo progetto')
    }

    // 2. Carica coefficienti
    const { data: coefficienti, error: coeffError } = await supabase
      .from('ristrutturazioni_coefficienti')
      .select('*')
      .eq('attivo', true)

    if (coeffError) {
      throw new Error(`Errore caricamento coefficienti: ${coeffError.message}`)
    }

    // 3. Carica prezzi custom globali
    const idsSottocategorie = selezioni.map(s => s.id_sottocategoria)
    const prezziCustomGlobali = await this.caricaPrezziCustom(idsSottocategorie)

    // 4. Calcola coefficienti applicabili
    const coeff_accesso = this.calcolaCoeffAccesso(progetto, coefficienti || [])
    const coeff_complessita = 1.000 // Standard per MVP

    // 5. Calcola voci con prezzi
    const dettaglio_voci = this.calcolaVociDaSelezioni(
      progetto,
      selezioni as any,
      coeff_accesso,
      coeff_complessita,
      prezziCustomGlobali
    )

    // 6. Calcola totale lavori base (L)
    const lavori_base = dettaglio_voci.reduce((sum, v) => sum + v.subtotale, 0)

    // 7. Calcola breakdown per categorie
    const breakdown_categorie = this.calcolaBreakdown(dettaglio_voci)

    // 8. Applica formule economiche (usa percentuali dal progetto se presenti)
    const coeffPercentuali = this.getCoefficientiPercentuali(progetto, coefficienti || [])

    const oneri_sicurezza = lavori_base * coeffPercentuali.oneri_sicurezza
    const spese_generali = lavori_base * coeffPercentuali.spese_generali
    const utile_impresa = (lavori_base + spese_generali) * coeffPercentuali.utile_impresa
    const pratiche_tecniche = coeffPercentuali.pratiche_tecniche
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
   * Calcola preventivo da array di voci (senza salvare in DB)
   * Utile per preview real-time mentre l'utente seleziona
   */
  static async calcolaPreventivoDaVoci(
    progetto: Progetto,
    voci: VoceDettaglio[]
  ): Promise<CalcoloManualResult> {

    // 1. Carica sottocategorie
    const idsSottocategorie = voci.map(v => v.id_sottocategoria)
    const { data: sottocategorie, error: sottocatError } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .select(`
        *,
        categoria:ristrutturazioni_categorie (*)
      `)
      .in('id', idsSottocategorie)

    if (sottocatError) {
      throw new Error(`Errore caricamento sottocategorie: ${sottocatError.message}`)
    }

    // 2. Carica coefficienti
    const { data: coefficienti, error: coeffError } = await supabase
      .from('ristrutturazioni_coefficienti')
      .select('*')
      .eq('attivo', true)

    if (coeffError) {
      throw new Error(`Errore caricamento coefficienti: ${coeffError.message}`)
    }

    // 3. Carica prezzi custom globali
    const prezziCustomGlobali = await this.caricaPrezziCustom(idsSottocategorie)

    // 4. Calcola coefficienti applicabili
    const coeff_accesso = this.calcolaCoeffAccesso(progetto, coefficienti || [])
    const coeff_complessita = 1.000

    // 5. Costruisci selezioni fittizie
    const selezioniFittizie = voci.map(v => {
      const sottocategoria = (sottocategorie || []).find(s => s.id === v.id_sottocategoria)
      return {
        id: 'temp-' + v.id_sottocategoria,
        id_progetto: progetto.id,
        id_sottocategoria: v.id_sottocategoria,
        quantita: v.quantita,
        prezzo_unitario_custom: v.prezzo_unitario_custom,
        prezzo_a_corpo: v.prezzo_a_corpo,
        usa_prezzo_a_corpo: v.usa_prezzo_a_corpo || false,
        sottocategoria: sottocategoria,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // 6. Calcola voci con prezzi
    const dettaglio_voci = this.calcolaVociDaSelezioni(
      progetto,
      selezioniFittizie as any,
      coeff_accesso,
      coeff_complessita,
      prezziCustomGlobali
    )

    // 6. Calcola totale lavori base (L)
    const lavori_base = dettaglio_voci.reduce((sum, v) => sum + v.subtotale, 0)

    // 7. Calcola breakdown per categorie
    const breakdown_categorie = this.calcolaBreakdown(dettaglio_voci)

    // 8. Applica formule economiche (usa percentuali dal progetto se presenti)
    const coeffPercentuali = this.getCoefficientiPercentuali(progetto, coefficienti || [])

    const oneri_sicurezza = lavori_base * coeffPercentuali.oneri_sicurezza
    const spese_generali = lavori_base * coeffPercentuali.spese_generali
    const utile_impresa = (lavori_base + spese_generali) * coeffPercentuali.utile_impresa
    const pratiche_tecniche = coeffPercentuali.pratiche_tecniche
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
   * Carica i prezzi custom globali
   */
  private static async caricaPrezziCustom(idsSottocategorie: string[]): Promise<Map<string, PrezzoCustom>> {
    const { data, error } = await supabase
      .from('ristrutturazioni_prezzi_custom')
      .select('*')
      .in('id_sottocategoria', idsSottocategorie)

    if (error) {
      console.error('Errore caricamento prezzi custom:', error)
      return new Map()
    }

    const map = new Map<string, PrezzoCustom>()
    for (const prezzo of data || []) {
      map.set(prezzo.id_sottocategoria, prezzo)
    }
    return map
  }

  /**
   * Calcola il coefficiente di accesso
   * Applica maggiorazione +6% per piano >= 3 senza ascensore
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
   * Calcola le voci dalle selezioni utente
   */
  private static calcolaVociDaSelezioni(
    progetto: Progetto,
    selezioni: Array<{
      id: string
      id_sottocategoria: string
      quantita: number
      prezzo_unitario_custom?: number
      prezzo_a_corpo?: number
      usa_prezzo_a_corpo?: boolean
      sottocategoria?: any
    }>,
    coeff_accesso: number,
    coeff_complessita: number,
    prezziCustomGlobali?: Map<string, PrezzoCustom>
  ): CalcoloManualResult['dettaglio_voci'] {

    const dettaglio: CalcoloManualResult['dettaglio_voci'] = []

    for (const selezione of selezioni) {
      const sottocategoria = selezione.sottocategoria
      if (!sottocategoria) continue

      // Se usa prezzo a corpo, calcola direttamente
      if (selezione.usa_prezzo_a_corpo && selezione.prezzo_a_corpo) {
        dettaglio.push({
          id_sottocategoria: selezione.id_sottocategoria,
          codice: sottocategoria.codice,
          descrizione: sottocategoria.nome + ' (a corpo)',
          quantita: 1,
          prezzo_unitario: Math.round(selezione.prezzo_a_corpo * 100) / 100,
          prezzo_unitario_base: 0,
          subtotale: Math.round(selezione.prezzo_a_corpo * 100) / 100,
          categoria: sottocategoria.categoria?.nome || 'Altro',
          unita_misura: 'a corpo',
          applica_f_accesso: false
        })
        continue
      }

      // Determina prezzo base per livello finiture dal prezzario
      let prezzo_base_prezzario: number
      switch (progetto.livello_finiture) {
        case 'economy':
          prezzo_base_prezzario = sottocategoria.prezzo_economy || sottocategoria.prezzo_standard || 0
          break
        case 'premium':
          prezzo_base_prezzario = sottocategoria.prezzo_premium || sottocategoria.prezzo_standard || 0
          break
        default:
          prezzo_base_prezzario = sottocategoria.prezzo_standard || 0
      }

      // Priorità: Prezzo custom globale > Prezzo unitario custom progetto > Prezzario base
      let prezzo_senza_coefficienti = prezzo_base_prezzario

      // Check prezzo custom globale
      const prezzoCustomGlobale = prezziCustomGlobali?.get(selezione.id_sottocategoria)
      if (prezzoCustomGlobale) {
        switch (progetto.livello_finiture) {
          case 'economy':
            prezzo_senza_coefficienti = prezzoCustomGlobale.prezzo_economy_custom || prezzo_base_prezzario
            break
          case 'premium':
            prezzo_senza_coefficienti = prezzoCustomGlobale.prezzo_premium_custom || prezzo_base_prezzario
            break
          default:
            prezzo_senza_coefficienti = prezzoCustomGlobale.prezzo_standard_custom || prezzo_base_prezzario
        }
      }

      // Override con prezzo custom del progetto se fornito
      if (selezione.prezzo_unitario_custom) {
        prezzo_senza_coefficienti = selezione.prezzo_unitario_custom
      }

      // Applica coefficienti solo se la voce ha applica_f_accesso = true
      let prezzo_finale = prezzo_senza_coefficienti
      if (sottocategoria.applica_f_accesso) {
        prezzo_finale = prezzo_senza_coefficienti * coeff_accesso
      }
      prezzo_finale = prezzo_finale * coeff_complessita

      const subtotale = selezione.quantita * prezzo_finale

      dettaglio.push({
        id_sottocategoria: selezione.id_sottocategoria,
        codice: sottocategoria.codice,
        descrizione: sottocategoria.nome,
        quantita: Math.round(selezione.quantita * 100) / 100,
        prezzo_unitario: Math.round(prezzo_finale * 100) / 100,
        prezzo_unitario_base: Math.round(prezzo_base_prezzario * 100) / 100,
        subtotale: Math.round(subtotale * 100) / 100,
        categoria: sottocategoria.categoria?.nome || 'Altro',
        unita_misura: sottocategoria.unita_misura,
        applica_f_accesso: sottocategoria.applica_f_accesso
      })
    }

    return dettaglio
  }

  /**
   * Calcola breakdown per categorie
   */
  private static calcolaBreakdown(dettaglio_voci: CalcoloManualResult['dettaglio_voci']): Record<string, number> {
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
   * Priorità: valori da progetto > valori da DB > default hardcoded
   */
  private static getCoefficientiPercentuali(progetto: Progetto, coefficienti: Coefficiente[]) {
    const percentuali = coefficienti.filter(c => c.tipo === 'percentuale')

    return {
      spese_generali: progetto.perc_spese_generali ?? percentuali.find(c => c.nome === 'spese_generali')?.valore ?? 0.10,
      utile_impresa: progetto.perc_utile_impresa ?? percentuali.find(c => c.nome === 'utile_impresa')?.valore ?? 0.10,
      oneri_sicurezza: progetto.perc_oneri_sicurezza ?? percentuali.find(c => c.nome === 'oneri_sicurezza')?.valore ?? 0.02,
      contingenze: progetto.perc_contingenze ?? percentuali.find(c => c.nome === 'contingenze')?.valore ?? 0.07,
      iva_agevolata: progetto.perc_iva ?? percentuali.find(c => c.nome === 'iva_agevolata')?.valore ?? 0.10,
      pratiche_tecniche: progetto.pratiche_tecniche_importo ?? 3200
    }
  }

  /**
   * Salva selezioni progetto nel database
   */
  static async salvaSelezioni(
    id_progetto: string,
    voci: VoceDettaglio[]
  ): Promise<{ success: boolean; error?: string }> {

    // 1. Elimina selezioni esistenti
    const { error: deleteError } = await supabase
      .from('ristrutturazioni_selezioni_progetto')
      .delete()
      .eq('id_progetto', id_progetto)

    if (deleteError) {
      return { success: false, error: `Errore eliminazione selezioni: ${deleteError.message}` }
    }

    // 2. Inserisci nuove selezioni
    const selezioni = voci.map(v => ({
      id_progetto: id_progetto,
      id_sottocategoria: v.id_sottocategoria,
      quantita: v.quantita,
      prezzo_unitario_custom: v.prezzo_unitario_custom || null,
      prezzo_a_corpo: v.prezzo_a_corpo || null,
      usa_prezzo_a_corpo: v.usa_prezzo_a_corpo || false
    }))

    const { error: insertError } = await supabase
      .from('ristrutturazioni_selezioni_progetto')
      .insert(selezioni)

    if (insertError) {
      return { success: false, error: `Errore salvataggio selezioni: ${insertError.message}` }
    }

    return { success: true }
  }

  /**
   * Carica categorie con sottocategorie
   */
  static async caricaCatalogo() {
    const { data: categorie, error: catError } = await supabase
      .from('ristrutturazioni_categorie')
      .select(`
        *,
        sottocategorie:ristrutturazioni_sottocategorie (*)
      `)
      .eq('attiva', true)
      .order('ordine')

    if (catError) {
      throw new Error(`Errore caricamento catalogo: ${catError.message}`)
    }

    // Ordina sottocategorie per ogni categoria
    const catalogoOrdinato = (categorie || []).map(cat => ({
      ...cat,
      sottocategorie: (cat.sottocategorie || []).sort((a: any, b: any) => a.ordine - b.ordine)
    }))

    return catalogoOrdinato
  }

  /**
   * Duplica un progetto esistente
   */
  static async duplicaProgetto(
    id_progetto_originale: string,
    nuovo_nome?: string
  ): Promise<{ success: boolean; nuovo_progetto_id?: string; error?: string }> {

    // 1. Carica progetto originale
    const { data: progetto, error: progettoError } = await supabase
      .from('ristrutturazioni_progetti')
      .select('*')
      .eq('id', id_progetto_originale)
      .single()

    if (progettoError || !progetto) {
      return { success: false, error: `Errore caricamento progetto: ${progettoError?.message}` }
    }

    // 2. Crea nuovo progetto
    const { id, created_at, updated_at, ...progettoData } = progetto
    const nuovoProgetto = {
      ...progettoData,
      nome: nuovo_nome || `${progetto.nome} (copia)`,
      stato: 'bozza' as const,
      progetto_originale_id: id_progetto_originale,
      duplicato_da: progetto.nome
    }

    const { data: nuovoProgettoData, error: nuovoProgettoError } = await supabase
      .from('ristrutturazioni_progetti')
      .insert(nuovoProgetto)
      .select()
      .single()

    if (nuovoProgettoError || !nuovoProgettoData) {
      return { success: false, error: `Errore creazione progetto: ${nuovoProgettoError?.message}` }
    }

    // 3. Carica selezioni originali
    const { data: selezioni, error: selezioniError } = await supabase
      .from('ristrutturazioni_selezioni_progetto')
      .select('*')
      .eq('id_progetto', id_progetto_originale)

    if (selezioniError) {
      return { success: false, error: `Errore caricamento selezioni: ${selezioniError.message}` }
    }

    // 4. Duplica selezioni se esistono
    if (selezioni && selezioni.length > 0) {
      const nuoveSelezioni = selezioni.map(s => {
        const { id, id_progetto, created_at, updated_at, ...selezioneData } = s
        return {
          ...selezioneData,
          id_progetto: nuovoProgettoData.id
        }
      })

      const { error: selezioniInsertError } = await supabase
        .from('ristrutturazioni_selezioni_progetto')
        .insert(nuoveSelezioni)

      if (selezioniInsertError) {
        return { success: false, error: `Errore duplicazione selezioni: ${selezioniInsertError.message}` }
      }
    }

    return { success: true, nuovo_progetto_id: nuovoProgettoData.id }
  }

  /**
   * Carica lista progetti
   */
  static async caricaProgetti(limit?: number) {
    let query = supabase
      .from('ristrutturazioni_progetti')
      .select('*')
      .order('updated_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Errore caricamento progetti: ${error.message}`)
    }

    return data || []
  }

  /**
   * Elimina un progetto e tutte le sue dipendenze
   */
  static async eliminaProgetto(id_progetto: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Elimina selezioni associate
      const { error: errSelezioni } = await supabase
        .from('ristrutturazioni_selezioni_progetto')
        .delete()
        .eq('id_progetto', id_progetto)

      if (errSelezioni) throw errSelezioni

      // 2. Elimina computi associati
      const { error: errComputi } = await supabase
        .from('ristrutturazioni_computi')
        .delete()
        .eq('progetto_id', id_progetto)

      if (errComputi) throw errComputi

      // 3. Elimina il progetto
      const { error: errProgetto } = await supabase
        .from('ristrutturazioni_progetti')
        .delete()
        .eq('id', id_progetto)

      if (errProgetto) throw errProgetto

      return { success: true }
    } catch (error: any) {
      console.error('Errore eliminazione progetto:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Salva o aggiorna prezzo custom globale
   */
  static async salvaPrezzoCustomGlobale(
    id_sottocategoria: string,
    prezzo_economy_custom?: number,
    prezzo_standard_custom?: number,
    prezzo_premium_custom?: number,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {

    // Check se esiste già
    const { data: existing } = await supabase
      .from('ristrutturazioni_prezzi_custom')
      .select('id')
      .eq('id_sottocategoria', id_sottocategoria)
      .single()

    const prezzoData = {
      id_sottocategoria,
      prezzo_economy_custom: prezzo_economy_custom || null,
      prezzo_standard_custom: prezzo_standard_custom || null,
      prezzo_premium_custom: prezzo_premium_custom || null,
      note: note || null
    }

    if (existing) {
      // Update
      const { error } = await supabase
        .from('ristrutturazioni_prezzi_custom')
        .update(prezzoData)
        .eq('id', existing.id)

      if (error) {
        return { success: false, error: `Errore aggiornamento prezzo: ${error.message}` }
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('ristrutturazioni_prezzi_custom')
        .insert(prezzoData)

      if (error) {
        return { success: false, error: `Errore inserimento prezzo: ${error.message}` }
      }
    }

    return { success: true }
  }

  /**
   * Carica tutti i prezzi custom globali
   */
  static async caricaTuttiPrezziCustom(): Promise<PrezzoCustom[]> {
    const { data, error } = await supabase
      .from('ristrutturazioni_prezzi_custom')
      .select('*')

    if (error) {
      console.error('Errore caricamento prezzi custom:', error)
      return []
    }

    return data || []
  }

  /**
   * Elimina prezzo custom globale (ritorna al prezzario base)
   */
  static async eliminaPrezzoCustomGlobale(
    id_sottocategoria: string
  ): Promise<{ success: boolean; error?: string }> {

    const { error } = await supabase
      .from('ristrutturazioni_prezzi_custom')
      .delete()
      .eq('id_sottocategoria', id_sottocategoria)

    if (error) {
      return { success: false, error: `Errore eliminazione prezzo: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Crea nuova categoria personalizzata
   */
  static async creaNuovaCategoria(
    codice: string,
    nome: string,
    descrizione?: string
  ): Promise<{ success: boolean; categoria_id?: string; error?: string }> {

    // Trova l'ordine massimo esistente
    const { data: maxOrdine } = await supabase
      .from('ristrutturazioni_categorie')
      .select('ordine')
      .order('ordine', { ascending: false })
      .limit(1)
      .single()

    const nuovoOrdine = (maxOrdine?.ordine || 0) + 1

    const { data, error } = await supabase
      .from('ristrutturazioni_categorie')
      .insert({
        codice,
        nome,
        descrizione,
        ordine: nuovoOrdine,
        attiva: true
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: `Errore creazione categoria: ${error.message}` }
    }

    return { success: true, categoria_id: data.id }
  }

  /**
   * Crea nuova sottocategoria personalizzata
   */
  static async creaNuovaSottocategoria(
    id_categoria: string,
    codice: string,
    nome: string,
    unita_misura: string,
    prezzo_standard: number,
    prezzo_economy?: number,
    prezzo_premium?: number,
    descrizione?: string,
    applica_f_accesso: boolean = false
  ): Promise<{ success: boolean; sottocategoria_id?: string; error?: string }> {

    // Trova l'ordine massimo esistente per questa categoria
    const { data: maxOrdine } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .select('ordine')
      .eq('id_categoria', id_categoria)
      .order('ordine', { ascending: false })
      .limit(1)
      .single()

    const nuovoOrdine = (maxOrdine?.ordine || 0) + 1

    const { data, error } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .insert({
        id_categoria,
        codice,
        nome,
        descrizione,
        unita_misura,
        prezzo_economy,
        prezzo_standard,
        prezzo_premium,
        ordine: nuovoOrdine,
        attiva: true,
        applica_f_accesso
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: `Errore creazione sottocategoria: ${error.message}` }
    }

    return { success: true, sottocategoria_id: data.id }
  }

  /**
   * Modifica categoria esistente
   */
  static async modificaCategoria(
    id_categoria: string,
    nome: string,
    descrizione?: string,
    attiva?: boolean
  ): Promise<{ success: boolean; error?: string }> {

    const updateData: any = { nome }
    if (descrizione !== undefined) updateData.descrizione = descrizione
    if (attiva !== undefined) updateData.attiva = attiva

    const { error } = await supabase
      .from('ristrutturazioni_categorie')
      .update(updateData)
      .eq('id', id_categoria)

    if (error) {
      return { success: false, error: `Errore modifica categoria: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Modifica sottocategoria esistente
   */
  static async modificaSottocategoria(
    id_sottocategoria: string,
    updates: {
      nome?: string
      descrizione?: string
      unita_misura?: string
      prezzo_economy?: number
      prezzo_standard?: number
      prezzo_premium?: number
      applica_f_accesso?: boolean
      attiva?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> {

    const { error } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .update(updates)
      .eq('id', id_sottocategoria)

    if (error) {
      return { success: false, error: `Errore modifica sottocategoria: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Elimina categoria (solo se non ha sottocategorie o se force=true)
   */
  static async eliminaCategoria(
    id_categoria: string,
    force: boolean = false
  ): Promise<{ success: boolean; error?: string }> {

    // Check sottocategorie
    const { data: sottocategorie } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .select('id')
      .eq('id_categoria', id_categoria)

    if (sottocategorie && sottocategorie.length > 0 && !force) {
      return {
        success: false,
        error: `La categoria contiene ${sottocategorie.length} sottocategorie. Usa force=true per eliminare tutto.`
      }
    }

    const { error } = await supabase
      .from('ristrutturazioni_categorie')
      .delete()
      .eq('id', id_categoria)

    if (error) {
      return { success: false, error: `Errore eliminazione categoria: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Elimina sottocategoria
   */
  static async eliminaSottocategoria(
    id_sottocategoria: string
  ): Promise<{ success: boolean; error?: string }> {

    const { error } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .delete()
      .eq('id', id_sottocategoria)

    if (error) {
      return { success: false, error: `Errore eliminazione sottocategoria: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Disattiva/attiva categoria (soft delete)
   */
  static async toggleCategoria(
    id_categoria: string,
    attiva: boolean
  ): Promise<{ success: boolean; error?: string }> {

    const { error } = await supabase
      .from('ristrutturazioni_categorie')
      .update({ attiva })
      .eq('id', id_categoria)

    if (error) {
      return { success: false, error: `Errore toggle categoria: ${error.message}` }
    }

    return { success: true }
  }

  /**
   * Disattiva/attiva sottocategoria (soft delete)
   */
  static async toggleSottocategoria(
    id_sottocategoria: string,
    attiva: boolean
  ): Promise<{ success: boolean; error?: string }> {

    const { error } = await supabase
      .from('ristrutturazioni_sottocategorie')
      .update({ attiva })
      .eq('id', id_sottocategoria)

    if (error) {
      return { success: false, error: `Errore toggle sottocategoria: ${error.message}` }
    }

    return { success: true }
  }
}
