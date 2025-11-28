'use client'

/**
 * Pagina Gestione Prezzi Custom Globali
 *
 * Permette di impostare prezzi personalizzati che sovrascrivono il prezzario base
 * I prezzi custom vengono memorizzati e applicati automaticamente a tutti i nuovi preventivi
 */

import { useState, useEffect } from 'react'
import { PricingEngineManual, type PrezzoCustom } from '@/lib/pricing-engine-manual'
import Link from 'next/link'

interface SottocategoriaConPrezzi {
  id: string
  codice: string
  nome: string
  unita_misura: string
  prezzo_economy?: number
  prezzo_standard?: number
  prezzo_premium?: number
  categoria: {
    id: string
    nome: string
    codice: string
  }
  prezzo_custom?: PrezzoCustom
}

export default function PrezziPage() {
  const [sottocategorie, setSottocategorie] = useState<SottocategoriaConPrezzi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all')
  const [filtroConPrezzoCustom, setFiltroConPrezzoCustom] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    caricaDati()
  }, [])

  const caricaDati = async () => {
    setLoading(true)
    try {
      // Carica catalogo completo
      const catalogo = await PricingEngineManual.caricaCatalogo()

      // Carica prezzi custom
      const prezziCustom = await PricingEngineManual.caricaTuttiPrezziCustom()
      const prezziCustomMap = new Map(prezziCustom.map(p => [p.id_sottocategoria, p]))

      // Combina dati
      const tutteLeVoci: SottocategoriaConPrezzi[] = []
      for (const cat of catalogo) {
        for (const sottocat of cat.sottocategorie) {
          tutteLeVoci.push({
            ...sottocat,
            categoria: {
              id: cat.id,
              nome: cat.nome,
              codice: cat.codice
            },
            prezzo_custom: prezziCustomMap.get(sottocat.id)
          })
        }
      }

      setSottocategorie(tutteLeVoci)
    } catch (error: any) {
      console.error('Errore caricamento dati:', error)
      alert('Errore nel caricamento: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const salvaPrezzoCustom = async (
    id_sottocategoria: string,
    economy?: number,
    standard?: number,
    premium?: number
  ) => {
    setSaving(id_sottocategoria)
    try {
      await PricingEngineManual.salvaPrezzoCustomGlobale(
        id_sottocategoria,
        economy,
        standard,
        premium
      )

      // Ricarica dati
      await caricaDati()
      alert('Prezzo custom salvato con successo!')
    } catch (error: any) {
      console.error('Errore salvataggio:', error)
      alert('Errore nel salvataggio: ' + error.message)
    } finally {
      setSaving(null)
    }
  }

  const eliminaPrezzoCustom = async (id_sottocategoria: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo prezzo custom e tornare al prezzario base?')) {
      return
    }

    setSaving(id_sottocategoria)
    try {
      await PricingEngineManual.eliminaPrezzoCustomGlobale(id_sottocategoria)

      // Ricarica dati
      await caricaDati()
      alert('Prezzo custom eliminato. Ripristinato prezzario base.')
    } catch (error: any) {
      console.error('Errore eliminazione:', error)
      alert('Errore nell\'eliminazione: ' + error.message)
    } finally {
      setSaving(null)
    }
  }

  const aggiornaPrezzoLocale = (id: string, livello: 'economy' | 'standard' | 'premium', valore: number | undefined) => {
    setSottocategorie(sottocategorie.map(s => {
      if (s.id !== id) return s

      const nuovoCustom = s.prezzo_custom || {
        id: '',
        id_sottocategoria: s.id,
        created_at: '',
        updated_at: ''
      }

      return {
        ...s,
        prezzo_custom: {
          ...nuovoCustom,
          [`prezzo_${livello}_custom`]: valore
        }
      }
    }))
  }

  // Filtra sottocategorie
  const vociFilltrate = sottocategorie.filter(s => {
    // Filtro categoria
    if (filtroCategoria !== 'all' && s.categoria.codice !== filtroCategoria) {
      return false
    }

    // Filtro solo con prezzo custom
    if (filtroConPrezzoCustom && !s.prezzo_custom) {
      return false
    }

    // Filtro ricerca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        s.nome.toLowerCase().includes(term) ||
        s.codice.toLowerCase().includes(term) ||
        s.categoria.nome.toLowerCase().includes(term)
      )
    }

    return true
  })

  // Estrai categorie uniche
  const categorie = Array.from(new Set(sottocategorie.map(s => s.categoria.codice)))
    .map(codice => sottocategorie.find(s => s.categoria.codice === codice)!.categoria)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Gestione Prezzi Custom Globali
              </h1>
              <p className="text-gray-600">
                Personalizza i prezzi del prezzario base. I prezzi custom vengono applicati automaticamente a tutti i nuovi preventivi.
              </p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              ← Torna ai Preventivi
            </Link>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              ⚠️ Priorità: Prezzo a corpo &gt; Prezzo custom progetto &gt; Prezzo custom globale &gt; Prezzario base
            </span>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Filtri</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Tutte le categorie</option>
                {categorie.map(cat => (
                  <option key={cat.codice} value={cat.codice}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ricerca
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per nome o codice..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mostra solo
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={filtroConPrezzoCustom}
                  onChange={(e) => setFiltroConPrezzoCustom(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Voci con prezzo custom</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabella Prezzi */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Prezzario ({vociFilltrate.length} voci)
            </h2>
            <button
              onClick={caricaDati}
              disabled={loading}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Caricamento...' : '🔄 Ricarica'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Caricamento prezzario...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Codice</th>
                    <th className="text-left p-3">Descrizione</th>
                    <th className="text-center p-3">U.M.</th>
                    <th className="text-right p-3">Economy Base</th>
                    <th className="text-right p-3">Economy Custom</th>
                    <th className="text-right p-3">Standard Base</th>
                    <th className="text-right p-3">Standard Custom</th>
                    <th className="text-right p-3">Premium Base</th>
                    <th className="text-right p-3">Premium Custom</th>
                    <th className="text-center p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {vociFilltrate.map((voce) => (
                    <tr
                      key={voce.id}
                      className={`border-t border-gray-200 ${voce.prezzo_custom ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="p-3 text-xs text-gray-600">{voce.categoria.nome}</td>
                      <td className="p-3 font-mono text-xs">{voce.codice}</td>
                      <td className="p-3">{voce.nome}</td>
                      <td className="p-3 text-center">{voce.unita_misura}</td>

                      {/* Economy */}
                      <td className="p-3 text-right text-gray-500">
                        €{(voce.prezzo_economy || voce.prezzo_standard || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={voce.prezzo_custom?.prezzo_economy_custom || ''}
                          onChange={(e) => aggiornaPrezzoLocale(voce.id, 'economy', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="—"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                        />
                      </td>

                      {/* Standard */}
                      <td className="p-3 text-right text-gray-500">
                        €{(voce.prezzo_standard || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={voce.prezzo_custom?.prezzo_standard_custom || ''}
                          onChange={(e) => aggiornaPrezzoLocale(voce.id, 'standard', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="—"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                        />
                      </td>

                      {/* Premium */}
                      <td className="p-3 text-right text-gray-500">
                        €{(voce.prezzo_premium || voce.prezzo_standard || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={voce.prezzo_custom?.prezzo_premium_custom || ''}
                          onChange={(e) => aggiornaPrezzoLocale(voce.id, 'premium', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="—"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                        />
                      </td>

                      {/* Azioni */}
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => salvaPrezzoCustom(
                              voce.id,
                              voce.prezzo_custom?.prezzo_economy_custom,
                              voce.prezzo_custom?.prezzo_standard_custom,
                              voce.prezzo_custom?.prezzo_premium_custom
                            )}
                            disabled={saving === voce.id}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {saving === voce.id ? '...' : 'Salva'}
                          </button>
                          {voce.prezzo_custom && (
                            <button
                              onClick={() => eliminaPrezzoCustom(voce.id)}
                              disabled={saving === voce.id}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:bg-gray-400"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {vociFilltrate.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Nessuna voce trovata con i filtri selezionati
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Come funziona</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• I prezzi custom globali vengono applicati automaticamente a tutti i nuovi preventivi</li>
            <li>• Puoi personalizzare uno, due o tutti e tre i livelli (economy, standard, premium)</li>
            <li>• Le voci con prezzo custom sono evidenziate in giallo</li>
            <li>• Usa "Reset" per eliminare il prezzo custom e tornare al prezzario base</li>
            <li>• I prezzi custom di progetto hanno comunque priorità sui prezzi custom globali</li>
          </ul>
        </div>

      </div>
    </main>
  )
}
