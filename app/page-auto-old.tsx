'use client'

import { useState } from 'react'
import { supabase, type Progetto } from '@/lib/supabase'
import { PricingEngine, type CalcoloResult } from '@/lib/pricing-engine'

interface VoceEditabile {
  codice: string
  descrizione: string
  categoria: string
  quantita: number
  prezzo_unitario: number
  subtotale: number
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [computo, setComputo] = useState<CalcoloResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [vociEditabili, setVociEditabili] = useState<VoceEditabile[]>([])
  const [showDettaglio, setShowDettaglio] = useState(false)

  const [formData, setFormData] = useState({
    nome: 'Preventivo Ristrutturazione',
    mq_totali: 90,
    numero_bagni: 1,
    numero_cucine: 1,
    piano: 1,
    ha_ascensore: true,
    livello_finiture: 'standard' as 'economy' | 'standard' | 'premium'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setComputo(null)
    setShowDettaglio(false)

    try {
      // 1. Crea progetto in DB
      const { data: progetto, error: progettoError } = await supabase
        .from('ristrutturazioni_progetti')
        .insert({
          nome: formData.nome,
          mq_totali: formData.mq_totali,
          numero_bagni: formData.numero_bagni,
          numero_cucine: formData.numero_cucine,
          piano: formData.piano,
          ha_ascensore: formData.ha_ascensore,
          livello_finiture: formData.livello_finiture,
          stato: 'calcolato'
        })
        .select()
        .single()

      if (progettoError) throw progettoError

      // 2. Calcola preventivo
      const risultato = await PricingEngine.calcolaPreventivo(progetto as Progetto)

      // 3. Salva computo in DB
      const { error: computoError } = await supabase
        .from('ristrutturazioni_computi')
        .insert({
          progetto_id: progetto.id,
          lavori_base: risultato.lavori_base,
          oneri_sicurezza: risultato.oneri_sicurezza,
          spese_generali: risultato.spese_generali,
          utile_impresa: risultato.utile_impresa,
          pratiche_tecniche: risultato.pratiche_tecniche,
          contingenze: risultato.contingenze,
          imponibile: risultato.imponibile,
          iva: risultato.iva,
          totale: risultato.totale,
          breakdown_categorie: risultato.breakdown_categorie,
          coeff_accesso: risultato.coeff_accesso,
          coeff_complessita: risultato.coeff_complessita
        })

      if (computoError) throw computoError

      // 4. Mostra risultato
      setComputo(risultato)
      setVociEditabili(risultato.dettaglio_voci.map(v => ({ ...v })))
      setShowDettaglio(false)

    } catch (err: any) {
      setError(err.message || 'Errore nel calcolo del preventivo')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrezzoChange = (index: number, nuovoPrezzo: number) => {
    const nuoveVoci = [...vociEditabili]
    nuoveVoci[index].prezzo_unitario = nuovoPrezzo
    nuoveVoci[index].subtotale = nuoveVoci[index].quantita * nuovoPrezzo
    setVociEditabili(nuoveVoci)
  }

  const ricalcolaTotale = () => {
    if (!computo) return

    // Ricalcola lavori base
    const nuovoLavoriBase = vociEditabili.reduce((sum, v) => sum + v.subtotale, 0)

    // Ricalcola breakdown
    const nuovoBreakdown: Record<string, number> = {}
    for (const voce of vociEditabili) {
      if (!nuovoBreakdown[voce.categoria]) {
        nuovoBreakdown[voce.categoria] = 0
      }
      nuovoBreakdown[voce.categoria] += voce.subtotale
    }

    // Applica formule economiche
    const oneri_sicurezza = nuovoLavoriBase * 0.02
    const spese_generali = nuovoLavoriBase * 0.10
    const utile_impresa = (nuovoLavoriBase + spese_generali) * 0.10
    const pratiche_tecniche = 3200
    const contingenze = (nuovoLavoriBase + spese_generali + utile_impresa) * 0.07

    const imponibile = nuovoLavoriBase + oneri_sicurezza + spese_generali + utile_impresa + pratiche_tecniche + contingenze
    const iva = imponibile * 0.10
    const totale = imponibile + iva

    // Aggiorna computo
    setComputo({
      ...computo,
      lavori_base: Math.round(nuovoLavoriBase * 100) / 100,
      oneri_sicurezza: Math.round(oneri_sicurezza * 100) / 100,
      spese_generali: Math.round(spese_generali * 100) / 100,
      utile_impresa: Math.round(utile_impresa * 100) / 100,
      pratiche_tecniche,
      contingenze: Math.round(contingenze * 100) / 100,
      imponibile: Math.round(imponibile * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      totale: Math.round(totale * 100) / 100,
      breakdown_categorie: nuovoBreakdown,
      dettaglio_voci: vociEditabili
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Preventivatore Ristrutturazioni
          </h1>
          <p className="text-gray-600">
            Genera preventivo con dettaglio voci modificabile
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome progetto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome progetto
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* MQ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Superficie totale (mq)
              </label>
              <input
                type="number"
                value={formData.mq_totali}
                onChange={(e) => setFormData({ ...formData, mq_totali: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="30"
                max="300"
                required
              />
            </div>

            {/* Bagni e cucine */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero bagni
                </label>
                <input
                  type="number"
                  value={formData.numero_bagni}
                  onChange={(e) => setFormData({ ...formData, numero_bagni: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero cucine
                </label>
                <input
                  type="number"
                  value={formData.numero_cucine}
                  onChange={(e) => setFormData({ ...formData, numero_cucine: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="2"
                  required
                />
              </div>
            </div>

            {/* Piano e ascensore */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Piano
                </label>
                <input
                  type="number"
                  value={formData.piano}
                  onChange={(e) => setFormData({ ...formData, piano: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ascensore
                </label>
                <select
                  value={formData.ha_ascensore ? 'si' : 'no'}
                  onChange={(e) => setFormData({ ...formData, ha_ascensore: e.target.value === 'si' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="si">Sì</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Livello finiture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Livello finiture
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['economy', 'standard', 'premium'] as const).map((livello) => (
                  <button
                    key={livello}
                    type="button"
                    onClick={() => setFormData({ ...formData, livello_finiture: livello })}
                    className={`px-4 py-3 rounded-md border-2 transition-all ${
                      formData.livello_finiture === livello
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium capitalize">{livello}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {livello === 'economy' && 'Base'}
                      {livello === 'standard' && 'Medio'}
                      {livello === 'premium' && 'Alto'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Calcolo in corso...' : 'Genera Preventivo'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {computo && (
          <div className="space-y-6">
            {/* Totale principale */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Totale preventivo (IVA inclusa)</div>
                <div className="text-4xl font-bold text-blue-700">
                  {formatCurrency(computo.totale)}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Lavori base: {formatCurrency(computo.lavori_base)} • Coefficiente accesso: {computo.coeff_accesso.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Toggle Dettaglio Voci */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <button
                onClick={() => setShowDettaglio(!showDettaglio)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900">
                  📋 Dettaglio Voci Lavorazioni ({vociEditabili.length} voci)
                </span>
                <span className="text-2xl">{showDettaglio ? '▼' : '▶'}</span>
              </button>

              {showDettaglio && (
                <div className="mt-6 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Modifica i prezzi</strong> nelle celle "Prezzo €/um" e clicca "Ricalcola Totale" per aggiornare il preventivo
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Codice</th>
                          <th className="px-3 py-2 text-left font-semibold">Descrizione</th>
                          <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                          <th className="px-3 py-2 text-right font-semibold">Quantità</th>
                          <th className="px-3 py-2 text-right font-semibold">Prezzo €/um</th>
                          <th className="px-3 py-2 text-right font-semibold">Subtotale €</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {vociEditabili.map((voce, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs">{voce.codice}</td>
                            <td className="px-3 py-2">{voce.descrizione}</td>
                            <td className="px-3 py-2 capitalize text-gray-600">{voce.categoria}</td>
                            <td className="px-3 py-2 text-right font-medium">{voce.quantita.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={voce.prezzo_unitario}
                                onChange={(e) => handlePrezzoChange(index, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCurrency(voce.subtotale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right font-bold">TOTALE LAVORI BASE</td>
                          <td className="px-3 py-2 text-right font-bold text-lg">
                            {formatCurrency(vociEditabili.reduce((sum, v) => sum + v.subtotale, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <button
                    onClick={ricalcolaTotale}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 font-medium transition-colors"
                  >
                    🔄 Ricalcola Totale con Prezzi Modificati
                  </button>
                </div>
              )}
            </div>

            {/* Riepilogo economico */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Riepilogo Economico</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Lavori base (L)</span>
                  <span className="font-medium">{formatCurrency(computo.lavori_base)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Oneri sicurezza (2%)</span>
                  <span className="font-medium">{formatCurrency(computo.oneri_sicurezza)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Spese generali (10%)</span>
                  <span className="font-medium">{formatCurrency(computo.spese_generali)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Utile impresa (10%)</span>
                  <span className="font-medium">{formatCurrency(computo.utile_impresa)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Pratiche tecniche (CILA + DL + APE)</span>
                  <span className="font-medium">{formatCurrency(computo.pratiche_tecniche)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">Contingenze (7%)</span>
                  <span className="font-medium">{formatCurrency(computo.contingenze)}</span>
                </div>
                <div className="flex justify-between py-2 border-b font-semibold">
                  <span className="text-gray-900">Imponibile (I)</span>
                  <span>{formatCurrency(computo.imponibile)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">IVA agevolata (10%)</span>
                  <span className="font-medium">{formatCurrency(computo.iva)}</span>
                </div>
                <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-md">
                  <span className="text-lg font-bold text-gray-900">TOTALE</span>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(computo.totale)}</span>
                </div>
              </div>
            </div>

            {/* Breakdown categorie */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Breakdown per Categorie</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(computo.breakdown_categorie)
                  .sort((a, b) => b[1] - a[1])
                  .map(([categoria, importo]) => (
                    <div key={categoria} className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm text-gray-600 capitalize">{categoria}</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(importo)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
