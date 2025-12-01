'use client'

/**
 * Dashboard - Lista Progetti
 *
 * Visualizza tutti i progetti salvati con opzioni:
 * - Visualizza dettaglio
 * - Duplica progetto
 * - Elimina progetto
 * - Crea nuovo preventivo
 */

import { useState, useEffect } from 'react'
import { PricingEngineManual } from '@/lib/pricing-engine-manual'
import { type Progetto } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [progetti, setProgetti] = useState<Progetto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    caricaProgetti()
  }, [])

  const caricaProgetti = async () => {
    setLoading(true)
    try {
      const listaProgetti = await PricingEngineManual.caricaProgetti(50)
      setProgetti(listaProgetti)
    } catch (error: any) {
      console.error('Errore caricamento progetti:', error)
      alert('Errore caricamento progetti: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const duplicaProgetto = async (progetto: Progetto) => {
    const nuovoNome = prompt('Nome per il progetto duplicato:', `${progetto.nome} (copia)`)
    if (!nuovoNome) return

    try {
      await PricingEngineManual.duplicaProgetto(progetto.id, nuovoNome)
      alert('Progetto duplicato con successo!')
      await caricaProgetti() // Ricarica lista
    } catch (error: any) {
      console.error('Errore duplicazione progetto:', error)
      alert('Errore duplicazione: ' + error.message)
    }
  }

  const eliminaProgetto = async (progetto: Progetto) => {
    if (!confirm(`Sei sicuro di voler eliminare il progetto "${progetto.nome}"?\n\nQuesta azione è irreversibile.`)) {
      return
    }

    try {
      const result = await PricingEngineManual.eliminaProgetto(progetto.id)
      if (result.success) {
        alert('Progetto eliminato con successo!')
        await caricaProgetti() // Ricarica lista
      } else {
        alert('Errore eliminazione: ' + (result.error || 'Errore sconosciuto'))
      }
    } catch (error: any) {
      console.error('Errore eliminazione progetto:', error)
      alert('Errore eliminazione: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Preventivatore Ristrutturazioni
          </h1>
          <p className="text-gray-600">
            Gestisci i tuoi preventivi di ristrutturazione edilizia
          </p>
        </div>

        {/* Links Navigazione */}
        <div className="mb-6 flex gap-4">
          <Link
            href="/prezzi"
            className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            💰 Prezzi Custom
          </Link>
          <Link
            href="/admin/prezzario"
            className="px-4 py-2 bg-white text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors font-medium"
          >
            ⚙️ Admin Prezzario
          </Link>
        </div>

        {/* Bottone Nuovo Preventivo */}
        <div className="mb-8">
          <Link
            href="/preventivo/nuovo"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            ➕ Nuovo Preventivo
          </Link>
        </div>

        {/* Lista Progetti */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            I Miei Progetti
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Caricamento progetti...</p>
            </div>
          ) : progetti.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                Nessun progetto salvato
              </p>
              <Link
                href="/preventivo/nuovo"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crea il tuo primo preventivo
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {progetti.map((progetto) => {
                const dataCreazione = new Date(progetto.created_at).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })

                const isVersione = progetto.nome.match(/v\d+$/)

                return (
                  <div
                    key={progetto.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {progetto.nome}
                          </h3>
                          {isVersione && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                              Versione
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Creato: {dataCreazione}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">MQ:</span>
                        <span className="ml-2 font-medium">{progetto.mq_totali}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Piano:</span>
                        <span className="ml-2 font-medium">{progetto.piano}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ascensore:</span>
                        <span className="ml-2 font-medium">{progetto.ha_ascensore ? 'Sì' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Finiture:</span>
                        <span className="ml-2 font-medium capitalize">{progetto.livello_finiture}</span>
                      </div>
                    </div>

                    {progetto.duplicato_da && (
                      <div className="mb-4 text-sm text-gray-600 italic">
                        {progetto.duplicato_da}
                      </div>
                    )}

                    {/* Bottoni Azione */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/preventivo/${progetto.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        👁️ Visualizza
                      </Link>
                      <button
                        onClick={() => duplicaProgetto(progetto)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        📋 Duplica
                      </button>
                      <button
                        onClick={() => eliminaProgetto(progetto)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
