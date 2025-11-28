'use client'

/**
 * Preventivatore Ristrutturazioni - Manual Workflow
 *
 * Nuovo flusso: selezione manuale categorie → sottocategorie → quantità
 * Invece di auto-scaling da mq e numero bagni
 */

import { useState, useEffect } from 'react'
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

export default function Home() {
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
  const [showDettaglio, setShowDettaglio] = useState(false)

  // Project state
  const [progettoSalvato, setProgettoSalvato] = useState<Progetto | null>(null)
  const [progettiSalvati, setProgettiSalvati] = useState<Progetto[]>([])
  const [loadingProgetti, setLoadingProgetti] = useState(false)
  const [showProgettiList, setShowProgettiList] = useState(false)

  // Load catalog on mount
  useEffect(() => {
    caricaCatalogo()
    caricaListaProgetti()
  }, [])

  const caricaListaProgetti = async () => {
    setLoadingProgetti(true)
    try {
      const progetti = await PricingEngineManual.caricaProgetti(20)
      setProgettiSalvati(progetti)
    } catch (error: any) {
      console.error('Errore caricamento progetti:', error)
    } finally {
      setLoadingProgetti(false)
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

  const toggleCategoria = (codiceCategoria: string) => {
    if (categoriaEspansa === codiceCategoria) {
      setCategoriaEspansa(null)
    } else {
      setCategoriaEspansa(codiceCategoria)
    }
  }

  const aggiungiVoce = (categoria: CategoriaConSottocategorie, sottocategoria: any) => {
    // Verifica se già presente
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

  const caricaProgetto = async (progetto: Progetto) => {
    try {
      // Load project details
      setNomeProgetto(progetto.nome)
      setMq(progetto.mq_totali)
      setPiano(progetto.piano || 0)
      setAscensore(progetto.ha_ascensore)
      setLivelloFiniture(progetto.livello_finiture)

      // Load percentages
      setPercOneriSicurezza((progetto.perc_oneri_sicurezza || 0.02) * 100)
      setPercSpeseGenerali((progetto.perc_spese_generali || 0.10) * 100)
      setPercUtileImpresa((progetto.perc_utile_impresa || 0.10) * 100)
      setImportoPraticheTecniche(progetto.pratiche_tecniche_importo || 3200)
      setPercContingenze((progetto.perc_contingenze || 0.07) * 100)
      setPercIVA((progetto.perc_iva || 0.10) * 100)

      // Load selections
      const { data: selezioni, error } = await supabase
        .from('ristrutturazioni_selezioni_progetto')
        .select(`
          *,
          sottocategoria:ristrutturazioni_sottocategorie(*)
        `)
        .eq('id_progetto', progetto.id)

      if (error) throw error

      const vociCaricate: VoceSelezione[] = selezioni.map((sel: any) => ({
        id_sottocategoria: sel.id_sottocategoria,
        quantita: sel.quantita,
        prezzo_unitario_custom: sel.prezzo_unitario_custom,
        prezzo_a_corpo: sel.prezzo_a_corpo,
        usa_prezzo_a_corpo: sel.usa_prezzo_a_corpo,
        sottocategoria: sel.sottocategoria
      }))

      setVociSelezionate(vociCaricate)
      setProgettoSalvato(progetto)
      setShowProgettiList(false)

      alert(`Progetto "${progetto.nome}" caricato con successo!`)
    } catch (error: any) {
      console.error('Errore caricamento progetto:', error)
      alert('Errore nel caricamento: ' + error.message)
    }
  }

  const duplicaProgetto = async (progetto: Progetto) => {
    try {
      const nuovoNome = prompt('Nome per il nuovo progetto:', progetto.nome + ' (copia)')
      if (!nuovoNome) return

      const { progettoId } = await PricingEngineManual.duplicaProgetto(progetto.id, nuovoNome)

      alert(`Progetto duplicato con successo! ID: ${progettoId}`)

      // Reload projects list
      await caricaListaProgetti()
    } catch (error: any) {
      console.error('Errore duplicazione progetto:', error)
      alert('Errore nella duplicazione: ' + error.message)
    }
  }

  const nuovoProgetto = () => {
    setNomeProgetto('')
    setMq(90)
    setPiano(4)
    setAscensore(false)
    setLivelloFiniture('standard')
    setPercOneriSicurezza(2)
    setPercSpeseGenerali(10)
    setPercUtileImpresa(10)
    setImportoPraticheTecniche(3200)
    setPercContingenze(7)
    setPercIVA(10)
    setVociSelezionate([])
    setRisultato(null)
    setProgettoSalvato(null)
  }

  const calcolaPreventivo = async () => {
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
      // 1. Verifica se esiste già un progetto con questo nome (escludendo quello attualmente caricato)
      const { data: progettiEsistenti, error: checkError } = await supabase
        .from('ristrutturazioni_progetti')
        .select('nome')
        .ilike('nome', nomeProgetto.trim())

      if (checkError) throw checkError

      let nomeFinale = nomeProgetto.trim()

      // Se c'è già un progetto con questo nome e non stiamo modificando quello stesso
      if (progettiEsistenti && progettiEsistenti.length > 0) {
        // Se stiamo modificando un progetto caricato con lo stesso nome, crea una nuova versione
        if (!progettoSalvato || progettoSalvato.nome !== nomeProgetto.trim()) {
          // Conta quante versioni esistono già
          const { data: versioni, error: versionError } = await supabase
            .from('ristrutturazioni_progetti')
            .select('nome')
            .or(`nome.eq.${nomeFinale},nome.like.${nomeFinale} v%`)

          if (versionError) throw versionError

          // Trova il numero di versione più alto
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

          // Crea nome con versione incrementata
          nomeFinale = `${nomeFinale} v${maxVersion + 1}`
        }
      }

      // 2. Crea sempre un NUOVO progetto (non aggiornare mai uno esistente)
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
        // Percentuali editabili
        perc_oneri_sicurezza: percOneriSicurezza / 100,
        perc_spese_generali: percSpeseGenerali / 100,
        perc_utile_impresa: percUtileImpresa / 100,
        pratiche_tecniche_importo: importoPraticheTecniche,
        perc_contingenze: percContingenze / 100,
        perc_iva: percIVA / 100,
        // Se stiamo salvando una modifica, traccia l'originale
        progetto_originale_id: progettoSalvato?.id,
        duplicato_da: progettoSalvato ? `Aggiornamento di: ${progettoSalvato.nome}` : undefined
      }

      const { data: progetto, error } = await supabase
        .from('ristrutturazioni_progetti')
        .insert(progettoData)
        .select()
        .single()

      if (error) throw error

      // Notifica se è stata creata una nuova versione
      if (nomeFinale !== nomeProgetto.trim()) {
        alert(`⚠️ Esisteva già un progetto con nome "${nomeProgetto.trim()}".\nCreata nuova versione: "${nomeFinale}"`)
      }

      setProgettoSalvato(progetto)
      setNomeProgetto(nomeFinale) // Aggiorna il nome nel form con la versione

      // 2. Salva selezioni
      const salvaResult = await PricingEngineManual.salvaSelezioni(
        progetto.id,
        vociSelezionate
      )

      if (!salvaResult.success) {
        throw new Error(salvaResult.error)
      }

      // 3. Calcola preventivo
      const risultatoCalcolo = await PricingEngineManual.calcolaPreventivoDaSelezioni(progetto)
      setRisultato(risultatoCalcolo)

      // 4. Salva computo
      await supabase.from('ristrutturazioni_computi').insert({
        progetto_id: progetto.id,
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

    } catch (error: any) {
      console.error('Errore calcolo:', error)
      alert('Errore nel calcolo: ' + error.message)
    } finally {
      setCalculating(false)
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Preventivatore Ristrutturazioni - Workflow Manuale
              </h1>
              <p className="text-gray-600 mb-3">
                Seleziona le lavorazioni necessarie, definisci le quantità e genera il preventivo dettagliato
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/prezzi"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
              >
                💰 Prezzi Custom
              </Link>
              <Link
                href="/admin/prezzario"
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 text-sm"
              >
                ⚙️ Admin Prezzario
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✓ Salva e carica progetti
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              ✓ Duplica preventivi
            </span>
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
              ✓ Prezzo a corpo
            </span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              ✓ Percentuali economiche editabili
            </span>
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
                      ⚠️ Piano {piano} senza ascensore: verrà applicata maggiorazione +6% su lavorazioni con movimentazione materiali
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
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    ⚙️ Percentuali Economiche (click per modificare)
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
                      💡 Valori di default: Oneri 2%, Spese 10%, Utile 10%, Contingenze 7%, IVA 10%, Pratiche €3200
                    </p>
                  </div>
                </details>
              </div>
            </div>

            {/* Saved Projects List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  I Miei Progetti ({progettiSalvati.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={nuovoProgetto}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    + Nuovo
                  </button>
                  <button
                    onClick={() => setShowProgettiList(!showProgettiList)}
                    className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                  >
                    {showProgettiList ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>
              </div>

              {progettoSalvato && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✓ Progetto attivo: <strong>{progettoSalvato.nome}</strong>
                  </p>
                </div>
              )}

              {showProgettiList && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loadingProgetti ? (
                    <p className="text-gray-500 text-sm">Caricamento...</p>
                  ) : progettiSalvati.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nessun progetto salvato</p>
                  ) : (
                    progettiSalvati.map((prog) => (
                      <div
                        key={prog.id}
                        className="p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-800">{prog.nome}</h3>
                              {prog.nome.match(/v\d+$/) && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                  Versione
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(prog.created_at).toLocaleDateString('it-IT')} • {prog.mq_totali}mq • {prog.livello_finiture}
                            </p>
                            {prog.duplicato_da && (
                              <p className="text-xs text-blue-600 mt-1">
                                🔗 {prog.duplicato_da}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => caricaProgetto(prog)}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              title="Carica progetto"
                            >
                              Carica
                            </button>
                            <button
                              onClick={() => duplicaProgetto(prog)}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                              title="Duplica progetto"
                            >
                              Duplica
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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
                onClick={calcolaPreventivo}
                disabled={calculating || vociSelezionate.length === 0}
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {calculating ? 'Calcolo in corso...' : 'Calcola Preventivo'}
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

        {/* Results Section */}
        {risultato && (
          <div className="mt-6 space-y-6">

            {/* Quantities Editor */}
            <div className="bg-white rounded-lg shadow-lg p-6">
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
                      const dettaglioVoce = risultato.dettaglio_voci.find(d => d.id_sottocategoria === voce.id_sottocategoria)
                      const usaACorpo = voce.usa_prezzo_a_corpo || false
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
                              `€${dettaglioVoce?.prezzo_unitario_base.toFixed(2) || '0.00'}`
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
                              <span className="text-indigo-600">€{(voce.prezzo_a_corpo || 0).toFixed(2)}</span>
                            ) : (
                              `€${((voce.prezzo_unitario_custom || dettaglioVoce?.prezzo_unitario_base || 0) * voce.quantita).toFixed(2)}`
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={calcolaPreventivo}
                  disabled={calculating}
                  className="bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  Ricalcola Preventivo
                </button>
              </div>
            </div>

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
