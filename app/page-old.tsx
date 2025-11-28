'use client'

import { useState } from 'react'
import { supabase, type Progetto } from '@/lib/supabase'
import { PricingEngine, type CalcoloResult } from '@/lib/pricing-engine'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [computo, setComputo] = useState<CalcoloResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    } catch (err: any) {
      setError(err.message || 'Errore nel calcolo del preventivo')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Preventivatore Ristrutturazioni
          </h1>
          <p className="text-gray-600">
            Genera un preventivo veloce per ristrutturazione appartamento in Piemonte
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
              <p className="text-sm text-gray-500 mt-1">
                Il preventivo è scalato da un appartamento tipo di 90mq
              </p>
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
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Risultato Preventivo</h2>

            {/* Totale principale */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Totale preventivo (IVA inclusa)</div>
              <div className="text-4xl font-bold text-blue-700">
                {formatCurrency(computo.totale)}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Coefficiente accesso: {computo.coeff_accesso.toFixed(3)}
                {computo.coeff_accesso > 1 && ' (maggiorazione per piano senza ascensore)'}
              </div>
            </div>

            {/* Riepilogo economico */}
            <div>
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
            <div>
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

            {/* Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Note importanti:</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Preventivo indicativo basato su prezzario Piemonte 2024</li>
                <li>IVA agevolata 10% (verificare requisiti con commercialista)</li>
                <li>Pratiche tecniche: CILA, Direzione Lavori, APE</li>
                <li>I prezzi possono variare in base alle effettive condizioni del cantiere</li>
              </ul>
            </div>

            {/* Future: PDF export */}
            <div className="text-center">
              <button
                className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                disabled
              >
                Esporta PDF (Coming soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
