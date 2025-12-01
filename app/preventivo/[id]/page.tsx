'use client'

/**
 * Preventivatore Ristrutturazioni - Vista/Modifica Preventivo
 *
 * Pagina per visualizzare e modificare un preventivo esistente
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Progetto } from '@/lib/supabase'
import { PricingEngineManual, type VoceDettaglio, type CalcoloManualResult } from '@/lib/pricing-engine-manual'
import Link from 'next/link'

interface CategoriaConSottocategorie {
  id: string
  codice: string
  nome: string
  descrizione?: string
  ordine: number
  sottocategorie: Array<{
    id: string
    codice: string
    nome: string
    unita_misura: string
    prezzo_economy?: number
    prezzo_standard?: number
    prezzo_premium?: number
    applica_f_accesso: boolean
    ordine: number
  }>
}

interface VoceSelezione extends VoceDettaglio {
  sottocategoria?: any
}

export default function VisualizzaPreventivo({ params }: { params: { id: string } }) {
  const router = useRouter()

  // View/Edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [progetto, setProgetto] = useState<Progetto | null>(null)

  // Form state
  const [nomeProgetto, setNomeProgetto] = useState('')
  const [mq, setMq] = useState(90)
  const [piano, setPiano] = useState(4)
  const [ascensore, setAscensore] = useState(false)
  const [livelloFiniture, setLivelloFiniture] = useState<'economy' | 'standard' | 'premium'>('standard')

  // Percentuali economiche editabili
  const [percOneriSicurezza, setPercOneriSicurezza] = useState(2)
  const [percSpeseGenerali, setPercSpeseGenerali] = useState(10)
  const [percUtileImpresa, setPercUtileImpresa] = useState(10)
  const [importoPraticheTecniche, setImportoPraticheTecniche] = useState(3200)
  const [percContingenze, setPercContingenze] = useState(7)
  const [percIVA, setPercIVA] = useState(10)

  // Catalog state
  const [catalogo, setCatalogo] = useState<CategoriaConSottocategorie[]>([])
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)

  // Selection state
  const [vociSelezionate, setVociSelezionate] = useState<VoceSelezione[]>([])
  const [categoriaEspansa, setCategoriaEspansa] = useState<string | null>(null)

  // Calculation state
  const [risultato, setRisultato] = useState<CalcoloManualResult | null>(null)
  const [calculating, setCalculating] = useState(false)

  // Load project on mount
  useEffect(() => {
    if (params.id) {
      caricaProgettoCompleto()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const caricaProgettoCompleto = async () => {
    setLoading(true)
    try {
      // Load project details
      const { data: progettoData, error: progettoError } = await supabase
        .from('ristrutturazioni_progetti')
        .select('*')
        .eq('id', params.id)
        .single()

      if (progettoError) throw progettoError
      if (!progettoData) throw new Error('Progetto non trovato')

      setProgetto(progettoData)
      setNomeProgetto(progettoData.nome)
      setMq(progettoData.mq_totali)
      setPiano(progettoData.piano || 0)
      setAscensore(progettoData.ha_ascensore)
      setLivelloFiniture(progettoData.livello_finiture)

      // Load percentages
      setPercOneriSicurezza((progettoData.perc_oneri_sicurezza || 0.02) * 100)
      setPercSpeseGenerali((progettoData.perc_spese_generali || 0.10) * 100)
      setPercUtileImpresa((progettoData.perc_utile_impresa || 0.10) * 100)
      setImportoPraticheTecniche(progettoData.pratiche_tecniche_importo || 3200)
      setPercContingenze((progettoData.perc_contingenze || 0.07) * 100)
      setPercIVA((progettoData.perc_iva || 0.10) * 100)

      // Load selections
      const { data: selezioni, error: selezioniError } = await supabase
        .from('ristrutturazioni_selezioni_progetto')
        .select(`
          *,
          sottocategoria:ristrutturazioni_sottocategorie(*)
        `)
        .eq('id_progetto', params.id)

      if (selezioniError) throw selezioniError

      const vociCaricate: VoceSelezione[] = selezioni.map((sel: any) => ({
        id_sottocategoria: sel.id_sottocategoria,
        quantita: sel.quantita,
        prezzo_unitario_custom: sel.prezzo_unitario_custom,
        prezzo_a_corpo: sel.prezzo_a_corpo,
        usa_prezzo_a_corpo: sel.usa_prezzo_a_corpo,
        sottocategoria: sel.sottocategoria
      }))

      setVociSelezionate(vociCaricate)

      // Load calculation result
      try {
        const risultatoCalcolo = await PricingEngineManual.calcolaPreventivoDaSelezioni(progettoData)
        setRisultato(risultatoCalcolo)
      } catch (calcError: any) {
        console.error('Errore calcolo preventivo:', calcError)
        // Non bloccare il caricamento se il calcolo fallisce
        setRisultato(null)
      }

    } catch (error: any) {
      console.error('Errore caricamento progetto:', error)
      alert('Errore nel caricamento del progetto: ' + error.message)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const caricaCatalogo = async () => {
    setLoadingCatalogo(true)
    try {
      const catalogoData = await PricingEngineManual.caricaCatalogo()
      setCatalogo(catalogoData as any)
    } catch (error: any) {
      console.error('Errore caricamento catalogo:', error)
      alert('Errore: ' + error.message)
    } finally {
      setLoadingCatalogo(false)
    }
  }

  const abilitaModifica = () => {
    setIsEditMode(true)
    caricaCatalogo()
  }

  const annullaModifica = () => {
    setIsEditMode(false)
    caricaProgettoCompleto()
  }

  const toggleCategoria = (codiceCategoria: string) => {
    if (categoriaEspansa === codiceCategoria) {
      setCategoriaEspansa(null)
    } else {
      setCategoriaEspansa(codiceCategoria)
    }
  }

  const aggiungiVoce = (categoria: CategoriaConSottocategorie, sottocategoria: any) => {
    const giaPresente = vociSelezionate.find(v => v.id_sottocategoria === sottocategoria.id)
    if (giaPresente) {
      alert('Questa voce è già stata aggiunta')
      return
    }

    const nuovaVoce: VoceSelezione = {
      id_sottocategoria: sottocategoria.id,
      quantita: 1,
      sottocategoria: sottocategoria
    }

    setVociSelezionate([...vociSelezionate, nuovaVoce])
  }

  const rimuoviVoce = (id_sottocategoria: string) => {
    setVociSelezionate(vociSelezionate.filter(v => v.id_sottocategoria !== id_sottocategoria))
  }

  const aggiornaQuantita = (id_sottocategoria: string, nuovaQuantita: number) => {
    setVociSelezionate(vociSelezionate.map(v =>
      v.id_sottocategoria === id_sottocategoria
        ? { ...v, quantita: nuovaQuantita }
        : v
    ))
  }

  const aggiornaPrezzoCustom = (id_sottocategoria: string, nuovoPrezzo: number | undefined) => {
    setVociSelezionate(vociSelezionate.map(v =>
      v.id_sottocategoria === id_sottocategoria
        ? { ...v, prezzo_unitario_custom: nuovoPrezzo }
        : v
    ))
  }

  const togglePrezzoACorpo = (id_sottocategoria: string, usaACorpo: boolean) => {
    setVociSelezionate(vociSelezionate.map(v =>
      v.id_sottocategoria === id_sottocategoria
        ? { ...v, usa_prezzo_a_corpo: usaACorpo, prezzo_a_corpo: usaACorpo ? (v.prezzo_a_corpo || 0) : undefined }
        : v
    ))
  }

  const aggiornaPrezzoACorpo = (id_sottocategoria: string, nuovoPrezzo: number) => {
    setVociSelezionate(vociSelezionate.map(v =>
      v.id_sottocategoria === id_sottocategoria
        ? { ...v, prezzo_a_corpo: nuovoPrezzo }
        : v
    ))
  }

  const salvaModifiche = async (creaNuovaVersione: boolean) => {
    if (!nomeProgetto.trim()) {
      alert('Inserisci un nome per il progetto')
      return
    }

    if (vociSelezionate.length === 0) {
      alert('Seleziona almeno una lavorazione')
      return
    }

    setCalculating(true)
    try {
      if (creaNuovaVersione) {
        // Crea nuova versione
        const { data: versioni, error: versionError } = await supabase
          .from('ristrutturazioni_progetti')
          .select('nome')
          .or(`nome.eq.${nomeProgetto.trim()},nome.like.${nomeProgetto.trim()} v%`)

        if (versionError) throw versionError

        let maxVersion = 1
        if (versioni) {
          versioni.forEach(p => {
            const match = p.nome.match(/v(\d+)$/)
            if (match) {
              const version = parseInt(match[1])
              if (version > maxVersion) {
                maxVersion = version
              }
            }
          })
        }

        const nomeFinale = `${nomeProgetto.trim()} v${maxVersion + 1}`

        const progettoData: Partial<Progetto> = {
          nome: nomeFinale,
          mq_totali: mq,
          numero_bagni: 1,
          numero_cucine: 1,
          piano: piano,
          ha_ascensore: ascensore,
          livello_finiture: livelloFiniture,
          workflow_mode: 'manual',
          stato: 'calcolato',
          perc_oneri_sicurezza: percOneriSicurezza / 100,
          perc_spese_generali: percSpeseGenerali / 100,
          perc_utile_impresa: percUtileImpresa / 100,
          pratiche_tecniche_importo: importoPraticheTecniche,
          perc_contingenze: percContingenze / 100,
          perc_iva: percIVA / 100,
          progetto_originale_id: progetto?.id,
          duplicato_da: `Aggiornamento di: ${progetto?.nome}`
        }

        const { data: nuovoProgetto, error } = await supabase
          .from('ristrutturazioni_progetti')
          .insert(progettoData)
          .select()
          .single()

        if (error) throw error

        // Salva selezioni
        await PricingEngineManual.salvaSelezioni(nuovoProgetto.id, vociSelezionate)

        // Calcola preventivo
        const risultatoCalcolo = await PricingEngineManual.calcolaPreventivoDaSelezioni(nuovoProgetto)

        // Salva computo
        await supabase.from('ristrutturazioni_computi').insert({
          progetto_id: nuovoProgetto.id,
          lavori_base: risultatoCalcolo.lavori_base,
          oneri_sicurezza: risultatoCalcolo.oneri_sicurezza,
          spese_generali: risultatoCalcolo.spese_generali,
          utile_impresa: risultatoCalcolo.utile_impresa,
          pratiche_tecniche: risultatoCalcolo.pratiche_tecniche,
          contingenze: risultatoCalcolo.contingenze,
          imponibile: risultatoCalcolo.imponibile,
          iva: risultatoCalcolo.iva,
          totale: risultatoCalcolo.totale,
          breakdown_categorie: risultatoCalcolo.breakdown_categorie,
          coeff_accesso: risultatoCalcolo.coeff_accesso,
          coeff_complessita: risultatoCalcolo.coeff_complessita,
          versione: 1
        })

        alert(`Nuova versione creata: "${nomeFinale}"`)
        router.push(`/preventivo/${nuovoProgetto.id}`)

      } else {
        // Sovrascrivi progetto esistente
        const progettoData: Partial<Progetto> = {
          nome: nomeProgetto.trim(),
          mq_totali: mq,
          piano: piano,
          ha_ascensore: ascensore,
          livello_finiture: livelloFiniture,
          stato: 'calcolato',
          perc_oneri_sicurezza: percOneriSicurezza / 100,
          perc_spese_generali: percSpeseGenerali / 100,
          perc_utile_impresa: percUtileImpresa / 100,
          pratiche_tecniche_importo: importoPraticheTecniche,
          perc_contingenze: percContingenze / 100,
          perc_iva: percIVA / 100
        }

        const { error: updateError } = await supabase
          .from('ristrutturazioni_progetti')
          .update(progettoData)
          .eq('id', params.id)

        if (updateError) throw updateError

        // Delete old selections
        await supabase
          .from('ristrutturazioni_selezioni_progetto')
          .delete()
          .eq('id_progetto', params.id)

        // Save new selections
        await PricingEngineManual.salvaSelezioni(params.id, vociSelezionate)

        // Recalculate
        const risultatoCalcolo = await PricingEngineManual.calcolaPreventivoDaSelezioni({
          ...progetto!,
          ...progettoData
        } as Progetto)

        // Delete old computo
        await supabase
          .from('ristrutturazioni_computi')
          .delete()
          .eq('progetto_id', params.id)

        // Save new computo
        await supabase.from('ristrutturazioni_computi').insert({
          progetto_id: params.id,
          lavori_base: risultatoCalcolo.lavori_base,
          oneri_sicurezza: risultatoCalcolo.oneri_sicurezza,
          spese_generali: risultatoCalcolo.spese_generali,
          utile_impresa: risultatoCalcolo.utile_impresa,
          pratiche_tecniche: risultatoCalcolo.pratiche_tecniche,
          contingenze: risultatoCalcolo.contingenze,
          imponibile: risultatoCalcolo.imponibile,
          iva: risultatoCalcolo.iva,
          totale: risultatoCalcolo.totale,
          breakdown_categorie: risultatoCalcolo.breakdown_categorie,
          coeff_accesso: risultatoCalcolo.coeff_accesso,
          coeff_complessita: risultatoCalcolo.coeff_complessita,
          versione: 1
        })

        alert('Progetto aggiornato con successo!')
        setIsEditMode(false)
        caricaProgettoCompleto()
      }

    } catch (error: any) {
      console.error('Errore salvataggio:', error)
      alert('Errore nel salvataggio: ' + error.message)
    } finally {
      setCalculating(false)
    }
  }

  const mostraDialogSalva = () => {
    const scelta = window.confirm(
      'Come vuoi salvare le modifiche?\n\n' +
      'OK = Sovrascrivi questo progetto (le modifiche sostituiranno la versione corrente)\n' +
      'Annulla = Crea nuova versione (mantiene questo progetto e crea una copia con le modifiche)'
    )

    if (scelta) {
      salvaModifiche(false) // Sovrascrivi
    } else {
      salvaModifiche(true) // Nuova versione
    }
  }

  const eliminaProgetto = async () => {
    if (!confirm(`Sei sicuro di voler eliminare il progetto "${progetto?.nome}"?\n\nQuesta operazione è irreversibile.`)) {
      return
    }

    try {
      const result = await PricingEngineManual.eliminaProgetto(params.id)

      if (!result.success) {
        throw new Error(result.error || 'Errore sconosciuto')
      }

      alert('Progetto eliminato con successo!')
      router.push('/')

    } catch (error: any) {
      console.error('Errore eliminazione:', error)
      alert('Errore nell\'eliminazione: ' + error.message)
    }
  }

  const duplicaProgetto = async () => {
    const nuovoNome = prompt('Nome per il nuovo progetto:', progetto?.nome + ' (copia)')
    if (!nuovoNome) return

    try {
      const { progettoId } = await PricingEngineManual.duplicaProgetto(params.id, nuovoNome)
      alert('Progetto duplicato con successo!')
      router.push(`/preventivo/${progettoId}`)
    } catch (error: any) {
      console.error('Errore duplicazione:', error)
      alert('Errore nella duplicazione: ' + error.message)
    }
  }

  const getPrezzoPerLivello = (sottocategoria: any) => {
    switch (livelloFiniture) {
      case 'economy':
        return sottocategoria.prezzo_economy || sottocategoria.prezzo_standard || 0
      case 'premium':
        return sottocategoria.prezzo_premium || sottocategoria.prezzo_standard || 0
      default:
        return sottocategoria.prezzo_standard || 0
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento progetto...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!progetto) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-red-600 text-xl">Progetto non trovato</p>
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // READ-ONLY VIEW
  if (!isEditMode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Link
                  href="/"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-3 text-sm font-medium"
                >
                  ← Torna alla Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {progetto.nome}
                </h1>
                <p className="text-gray-600">
                  Creato il {new Date(progetto.created_at).toLocaleDateString('it-IT')} • {progetto.mq_totali}mq • {progetto.livello_finiture}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={abilitaModifica}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                >
                  Modifica
                </button>
                <button
                  onClick={duplicaProgetto}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                >
                  Duplica
                </button>
                <button
                  onClick={eliminaProgetto}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Project Details */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Dati Progetto</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Superficie</label>
                    <p className="text-lg text-gray-800">{progetto.mq_totali} mq</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Piano</label>
                    <p className="text-lg text-gray-800">Piano {progetto.piano}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ascensore</label>
                    <p className="text-lg text-gray-800">{progetto.ha_ascensore ? 'Sì' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Livello Finiture</label>
                    <p className="text-lg text-gray-800 capitalize">{progetto.livello_finiture}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Parametri Economici</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Oneri Sicurezza</span>
                    <span className="font-medium">{percOneriSicurezza}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spese Generali</span>
                    <span className="font-medium">{percSpeseGenerali}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utile Impresa</span>
                    <span className="font-medium">{percUtileImpresa}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contingenze</span>
                    <span className="font-medium">{percContingenze}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA</span>
                    <span className="font-medium">{percIVA}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pratiche Tecniche</span>
                    <span className="font-medium">€{importoPraticheTecniche.toLocaleString('it-IT')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Lavorazioni Selezionate ({vociSelezionate.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3">Codice</th>
                        <th className="text-left p-3">Descrizione</th>
                        <th className="text-center p-3">Quantità</th>
                        <th className="text-center p-3">U.M.</th>
                        <th className="text-right p-3">Prezzo Unit.</th>
                        <th className="text-right p-3">Subtotale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vociSelezionate.map((voce) => {
                        const dettaglioVoce = risultato?.dettaglio_voci.find(d => d.id_sottocategoria === voce.id_sottocategoria)
                        const usaACorpo = voce.usa_prezzo_a_corpo || false
                        const prezzoUnitario = voce.prezzo_unitario_custom || dettaglioVoce?.prezzo_unitario_base || 0
                        const subtotale = usaACorpo ? (voce.prezzo_a_corpo || 0) : (prezzoUnitario * voce.quantita)

                        return (
                          <tr key={voce.id_sottocategoria} className="border-t border-gray-200">
                            <td className="p-3 font-mono text-xs">{voce.sottocategoria?.codice}</td>
                            <td className="p-3">{voce.sottocategoria?.nome}</td>
                            <td className="p-3 text-center">
                              {usaACorpo ? '—' : voce.quantita}
                            </td>
                            <td className="p-3 text-center">
                              {usaACorpo ? 'a corpo' : voce.sottocategoria?.unita_misura}
                            </td>
                            <td className="p-3 text-right">
                              {usaACorpo ? '—' : `€${prezzoUnitario.toFixed(2)}`}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              €{subtotale.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* Results Section */}
          {risultato && (
            <div className="mt-6 space-y-6">

              {/* Summary */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Riepilogo Economico</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Lavori Base (L)</span>
                      <span className="font-semibold">€{risultato.lavori_base.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Oneri Sicurezza ({percOneriSicurezza}%)</span>
                      <span className="font-semibold">€{risultato.oneri_sicurezza.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Spese Generali ({percSpeseGenerali}%)</span>
                      <span className="font-semibold">€{risultato.spese_generali.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Utile Impresa ({percUtileImpresa}%)</span>
                      <span className="font-semibold">€{risultato.utile_impresa.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Pratiche Tecniche</span>
                      <span className="font-semibold">€{risultato.pratiche_tecniche.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Contingenze ({percContingenze}%)</span>
                      <span className="font-semibold">€{risultato.contingenze.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Imponibile</span>
                      <span className="font-semibold">€{risultato.imponibile.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">IVA Agevolata ({percIVA}%)</span>
                      <span className="font-semibold">€{risultato.iva.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">TOTALE PREVENTIVO</span>
                    <span className="text-3xl font-bold">
                      €{risultato.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm mt-2 opacity-90">
                    Coefficiente accesso: {risultato.coeff_accesso.toFixed(3)} |
                    Complessità: {risultato.coeff_complessita.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Breakdown per Categorie</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(risultato.breakdown_categorie).map(([categoria, importo]) => (
                    <div key={categoria} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">{categoria}</h3>
                      <p className="text-xl font-bold text-indigo-600">
                        €{(importo as number).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    )
  }

  // EDIT MODE
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  ← Dashboard
                </Link>
                <span className="text-gray-400">|</span>
                <button
                  onClick={annullaModifica}
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Annulla Modifiche
                </button>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Modifica: {progetto.nome}
              </h1>
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-2">
                <p className="text-sm text-orange-800">
                  Modalità modifica attiva. Al salvataggio potrai scegliere se sovrascrivere o creare una nuova versione.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Project Info */}
          <div className="lg:col-span-1 space-y-6">

            {/* Project Form */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Dati Progetto</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Progetto *
                  </label>
                  <input
                    type="text"
                    value={nomeProgetto}
                    onChange={(e) => setNomeProgetto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="Es: Appartamento Via Roma 42"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Superficie (mq)
                  </label>
                  <input
                    type="number"
                    value={mq}
                    onChange={(e) => setMq(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo per riferimento, non influisce sul calcolo</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Piano</label>
                    <input
                      type="number"
                      value={piano}
                      onChange={(e) => setPiano(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ascensore</label>
                    <select
                      value={ascensore ? 'si' : 'no'}
                      onChange={(e) => setAscensore(e.target.value === 'si')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="si">Sì</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                {!ascensore && piano >= 3 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      Piano {piano} senza ascensore: verrà applicata maggiorazione +6% su lavorazioni con movimentazione materiali
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Livello Finiture
                  </label>
                  <select
                    value={livelloFiniture}
                    onChange={(e) => setLivelloFiniture(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="economy">Economy</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                {/* Percentuali Economiche */}
                <details className="mt-4" open>
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Percentuali Economiche (click per modificare)
                  </summary>
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Oneri Sicurezza (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={percOneriSicurezza}
                          onChange={(e) => setPercOneriSicurezza(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Spese Generali (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={percSpeseGenerali}
                          onChange={(e) => setPercSpeseGenerali(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Utile Impresa (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={percUtileImpresa}
                          onChange={(e) => setPercUtileImpresa(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Contingenze (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={percContingenze}
                          onChange={(e) => setPercContingenze(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          IVA Agevolata (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={percIVA}
                          onChange={(e) => setPercIVA(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Pratiche Tecniche (€)
                        </label>
                        <input
                          type="number"
                          step="100"
                          value={importoPraticheTecniche}
                          onChange={(e) => setImportoPraticheTecniche(Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Valori di default: Oneri 2%, Spese 10%, Utile 10%, Contingenze 7%, IVA 10%, Pratiche €3200
                    </p>
                  </div>
                </details>
              </div>
            </div>

            {/* Selected Items Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Lavorazioni Selezionate ({vociSelezionate.length})
              </h2>

              {vociSelezionate.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuna lavorazione selezionata</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {vociSelezionate.map((voce) => (
                    <div key={voce.id_sottocategoria} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="flex-1 truncate">{voce.sottocategoria?.nome}</span>
                      <button
                        onClick={() => rimuoviVoce(voce.id_sottocategoria)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={mostraDialogSalva}
                disabled={calculating || vociSelezionate.length === 0}
                className="w-full mt-4 bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {calculating ? 'Salvataggio in corso...' : 'Salva Modifiche'}
              </button>
            </div>

          </div>

          {/* Middle Column: Catalog */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Catalogo Lavorazioni - Prezzario Piemonte 2025
              </h2>

              {loadingCatalogo ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Caricamento catalogo...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {catalogo.map((categoria) => (
                    <div key={categoria.id} className="border border-gray-200 rounded-lg overflow-hidden">

                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategoria(categoria.codice)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{categoria.nome}</h3>
                          <p className="text-xs text-gray-500 mt-1">{categoria.descrizione}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {categoriaEspansa === categoria.codice ? '▼' : '▶'}
                        </div>
                      </button>

                      {/* Subcategories */}
                      {categoriaEspansa === categoria.codice && (
                        <div className="border-t border-gray-200">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="text-left p-2">Codice</th>
                                  <th className="text-left p-2">Descrizione</th>
                                  <th className="text-center p-2">U.M.</th>
                                  <th className="text-right p-2">Prezzo</th>
                                  <th className="text-center p-2">Azione</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoria.sottocategorie.map((sottocat) => (
                                  <tr key={sottocat.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="p-2 font-mono text-xs">{sottocat.codice}</td>
                                    <td className="p-2">{sottocat.nome}</td>
                                    <td className="p-2 text-center">{sottocat.unita_misura}</td>
                                    <td className="p-2 text-right font-semibold">
                                      €{getPrezzoPerLivello(sottocat).toFixed(2)}
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => aggiungiVoce(categoria, sottocat)}
                                        className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
                                      >
                                        Aggiungi
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Quantities Editor */}
        {vociSelezionate.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Modifica Quantità e Prezzi
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3">Codice</th>
                    <th className="text-left p-3">Descrizione</th>
                    <th className="text-center p-3">A Corpo</th>
                    <th className="text-center p-3">Quantità</th>
                    <th className="text-center p-3">U.M.</th>
                    <th className="text-right p-3">Prezzo Unit.</th>
                    <th className="text-right p-3">Prezzo Custom</th>
                    <th className="text-right p-3">Subtotale</th>
                  </tr>
                </thead>
                <tbody>
                  {vociSelezionate.map((voce) => {
                    const usaACorpo = voce.usa_prezzo_a_corpo || false
                    const prezzoBase = getPrezzoPerLivello(voce.sottocategoria)
                    const prezzoUnitario = voce.prezzo_unitario_custom || prezzoBase
                    const subtotale = usaACorpo ? (voce.prezzo_a_corpo || 0) : (prezzoUnitario * voce.quantita)

                    return (
                      <tr key={voce.id_sottocategoria} className="border-t border-gray-200">
                        <td className="p-3 font-mono text-xs">{voce.sottocategoria?.codice}</td>
                        <td className="p-3">{voce.sottocategoria?.nome}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={usaACorpo}
                            onChange={(e) => togglePrezzoACorpo(voce.id_sottocategoria, e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                            title="Prezzo totale a corpo (ignora quantità)"
                          />
                        </td>
                        <td className="p-3">
                          {usaACorpo ? (
                            <span className="text-gray-400 text-center block">—</span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={voce.quantita}
                              onChange={(e) => aggiornaQuantita(voce.id_sottocategoria, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {usaACorpo ? 'a corpo' : voce.sottocategoria?.unita_misura}
                        </td>
                        <td className="p-3 text-right">
                          {usaACorpo ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            `€${prezzoBase.toFixed(2)}`
                          )}
                        </td>
                        <td className="p-3">
                          {usaACorpo ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={voce.prezzo_a_corpo || ''}
                              onChange={(e) => aggiornaPrezzoACorpo(voce.id_sottocategoria, Number(e.target.value))}
                              placeholder="Prezzo totale"
                              className="w-24 px-2 py-1 border border-indigo-300 bg-indigo-50 rounded text-right font-semibold"
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={voce.prezzo_unitario_custom || ''}
                              onChange={(e) => aggiornaPrezzoCustom(voce.id_sottocategoria, e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="Opzionale"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                            />
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {usaACorpo ? (
                            <span className="text-indigo-600">€{subtotale.toFixed(2)}</span>
                          ) : (
                            `€${subtotale.toFixed(2)}`
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
