'use client'

/**
 * Pagina Admin - Gestione Prezzario
 *
 * CRUD completo per categorie e sottocategorie del prezzario
 */

import { useState, useEffect } from 'react'
import { PricingEngineManual } from '@/lib/pricing-engine-manual'
import Link from 'next/link'

interface Categoria {
  id: string
  codice: string
  nome: string
  descrizione?: string
  ordine: number
  attiva: boolean
  sottocategorie: Sottocategoria[]
}

interface Sottocategoria {
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
}

export default function AdminPrezzarioPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaEspansa, setCategoriaEspansa] = useState<string | null>(null)

  // Modali
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [showModalSottocategoria, setShowModalSottocategoria] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [editingSottocategoria, setEditingSottocategoria] = useState<Sottocategoria | null>(null)
  const [categoriaTargetSottocategoria, setCategoriaTargetSottocategoria] = useState<string | null>(null)

  // Form categoria
  const [formCat, setFormCat] = useState({ codice: '', nome: '', descrizione: '' })

  // Form sottocategoria
  const [formSottocat, setFormSottocat] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    unita_misura: 'mq',
    prezzo_economy: '',
    prezzo_standard: '',
    prezzo_premium: '',
    note: '',
    applica_f_accesso: false
  })

  useEffect(() => {
    caricaDati()
  }, [])

  const caricaDati = async () => {
    setLoading(true)
    try {
      const catalogo = await PricingEngineManual.caricaCatalogo()
      setCategorie(catalogo as any)
    } catch (error: any) {
      console.error('Errore caricamento:', error)
      alert('Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // === CATEGORIE ===

  const apriModalNuovaCategoria = () => {
    setEditingCategoria(null)
    setFormCat({ codice: '', nome: '', descrizione: '' })
    setShowModalCategoria(true)
  }

  const apriModalModificaCategoria = (cat: Categoria) => {
    setEditingCategoria(cat)
    setFormCat({ codice: cat.codice, nome: cat.nome, descrizione: cat.descrizione || '' })
    setShowModalCategoria(true)
  }

  const salvaCategoria = async () => {
    try {
      if (editingCategoria) {
        // Modifica esistente
        await PricingEngineManual.modificaCategoria(
          editingCategoria.id,
          formCat.nome,
          formCat.descrizione || undefined,
          undefined
        )
        alert('Categoria modificata con successo!')
      } else {
        // Crea nuova
        await PricingEngineManual.creaNuovaCategoria(
          formCat.codice,
          formCat.nome,
          formCat.descrizione || undefined
        )
        alert('Categoria creata con successo!')
      }
      setShowModalCategoria(false)
      await caricaDati()
    } catch (error: any) {
      console.error('Errore salvataggio categoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  const eliminaCategoria = async (id: string, force = false) => {
    const categoria = categorie.find(c => c.id === id)
    if (!categoria) return

    const hasSottocategorie = categoria.sottocategorie.length > 0

    if (hasSottocategorie && !force) {
      const conferma = confirm(
        `Questa categoria ha ${categoria.sottocategorie.length} sottocategorie.\n\n` +
        'ATTENZIONE: L\'eliminazione forzata cancellerà anche tutte le sottocategorie!\n\n' +
        'Vuoi procedere?'
      )
      if (!conferma) return
      force = true
    }

    try {
      await PricingEngineManual.eliminaCategoria(id, force)
      alert('Categoria eliminata con successo!')
      await caricaDati()
    } catch (error: any) {
      console.error('Errore eliminazione categoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  const toggleCategoria = async (id: string, attiva: boolean) => {
    try {
      await PricingEngineManual.toggleCategoria(id, attiva)
      await caricaDati()
    } catch (error: any) {
      console.error('Errore toggle categoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  // === SOTTOCATEGORIE ===

  const apriModalNuovaSottocategoria = (idCategoria: string) => {
    setEditingSottocategoria(null)
    setCategoriaTargetSottocategoria(idCategoria)
    setFormSottocat({
      codice: '',
      nome: '',
      descrizione: '',
      unita_misura: 'mq',
      prezzo_economy: '',
      prezzo_standard: '',
      prezzo_premium: '',
      note: '',
      applica_f_accesso: false
    })
    setShowModalSottocategoria(true)
  }

  const apriModalModificaSottocategoria = (sottocat: Sottocategoria) => {
    setEditingSottocategoria(sottocat)
    setCategoriaTargetSottocategoria(sottocat.id_categoria)
    setFormSottocat({
      codice: sottocat.codice,
      nome: sottocat.nome,
      descrizione: sottocat.descrizione || '',
      unita_misura: sottocat.unita_misura,
      prezzo_economy: sottocat.prezzo_economy?.toString() || '',
      prezzo_standard: sottocat.prezzo_standard?.toString() || '',
      prezzo_premium: sottocat.prezzo_premium?.toString() || '',
      note: sottocat.note || '',
      applica_f_accesso: sottocat.applica_f_accesso
    })
    setShowModalSottocategoria(true)
  }

  const salvaSottocategoria = async () => {
    try {
      if (editingSottocategoria) {
        // Modifica esistente
        await PricingEngineManual.modificaSottocategoria(editingSottocategoria.id, {
          nome: formSottocat.nome,
          descrizione: formSottocat.descrizione || undefined,
          unita_misura: formSottocat.unita_misura,
          prezzo_economy: formSottocat.prezzo_economy ? Number(formSottocat.prezzo_economy) : undefined,
          prezzo_standard: formSottocat.prezzo_standard ? Number(formSottocat.prezzo_standard) : undefined,
          prezzo_premium: formSottocat.prezzo_premium ? Number(formSottocat.prezzo_premium) : undefined,
          applica_f_accesso: formSottocat.applica_f_accesso
        })
        alert('Sottocategoria modificata con successo!')
      } else {
        // Crea nuova
        if (!categoriaTargetSottocategoria) {
          alert('Errore: categoria non selezionata')
          return
        }
        await PricingEngineManual.creaNuovaSottocategoria(
          categoriaTargetSottocategoria,
          formSottocat.codice,
          formSottocat.nome,
          formSottocat.unita_misura,
          Number(formSottocat.prezzo_standard),
          formSottocat.prezzo_economy ? Number(formSottocat.prezzo_economy) : undefined,
          formSottocat.prezzo_premium ? Number(formSottocat.prezzo_premium) : undefined,
          formSottocat.descrizione || undefined,
          formSottocat.applica_f_accesso
        )
        alert('Sottocategoria creata con successo!')
      }
      setShowModalSottocategoria(false)
      await caricaDati()
    } catch (error: any) {
      console.error('Errore salvataggio sottocategoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  const eliminaSottocategoria = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sottocategoria?')) return

    try {
      await PricingEngineManual.eliminaSottocategoria(id)
      alert('Sottocategoria eliminata con successo!')
      await caricaDati()
    } catch (error: any) {
      console.error('Errore eliminazione sottocategoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  const toggleSottocategoria = async (id: string, attiva: boolean) => {
    try {
      await PricingEngineManual.toggleSottocategoria(id, attiva)
      await caricaDati()
    } catch (error: any) {
      console.error('Errore toggle sottocategoria:', error)
      alert('Errore: ' + error.message)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Gestione Prezzario - Admin
              </h1>
              <p className="text-gray-600">
                Crea, modifica ed elimina categorie e sottocategorie del prezzario
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/prezzi"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Prezzi Custom
              </Link>
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                ← Home
              </Link>
            </div>
          </div>
        </div>

        {/* Azioni Principali */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Categorie ({categorie.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={caricaDati}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Caricamento...' : '🔄 Ricarica'}
              </button>
              <button
                onClick={apriModalNuovaCategoria}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Nuova Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Lista Categorie */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento prezzario...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categorie.map((cat) => (
              <div
                key={cat.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${!cat.attiva ? 'opacity-60' : ''}`}
              >
                {/* Header Categoria */}
                <div className="bg-gray-50 p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {cat.nome}
                        {!cat.attiva && <span className="text-sm text-red-600 ml-2">(Disattivata)</span>}
                      </h3>
                      <span className="text-sm text-gray-500 font-mono">{cat.codice}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {cat.sottocategorie.length} sottocategorie
                      </span>
                    </div>
                    {cat.descrizione && (
                      <p className="text-sm text-gray-600 mt-1">{cat.descrizione}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={cat.attiva}
                        onChange={(e) => toggleCategoria(cat.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      Attiva
                    </label>
                    <button
                      onClick={() => apriModalNuovaSottocategoria(cat.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      + Sottocategoria
                    </button>
                    <button
                      onClick={() => apriModalModificaCategoria(cat)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => eliminaCategoria(cat.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Elimina
                    </button>
                    <button
                      onClick={() => setCategoriaEspansa(categoriaEspansa === cat.id ? null : cat.id)}
                      className="text-gray-600 px-2"
                    >
                      {categoriaEspansa === cat.id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Sottocategorie */}
                {categoriaEspansa === cat.id && (
                  <div className="p-4">
                    {cat.sottocategorie.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Nessuna sottocategoria. Clicca "+ Sottocategoria" per aggiungerne una.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-2">Codice</th>
                              <th className="text-left p-2">Nome</th>
                              <th className="text-center p-2">U.M.</th>
                              <th className="text-right p-2">Economy</th>
                              <th className="text-right p-2">Standard</th>
                              <th className="text-right p-2">Premium</th>
                              <th className="text-center p-2">F.Accesso</th>
                              <th className="text-center p-2">Attiva</th>
                              <th className="text-center p-2">Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cat.sottocategorie.map((sottocat) => (
                              <tr
                                key={sottocat.id}
                                className={`border-t border-gray-200 ${!sottocat.attiva ? 'opacity-50' : ''}`}
                              >
                                <td className="p-2 font-mono text-xs">{sottocat.codice}</td>
                                <td className="p-2">{sottocat.nome}</td>
                                <td className="p-2 text-center">{sottocat.unita_misura}</td>
                                <td className="p-2 text-right">
                                  €{(sottocat.prezzo_economy || 0).toFixed(2)}
                                </td>
                                <td className="p-2 text-right">
                                  €{(sottocat.prezzo_standard || 0).toFixed(2)}
                                </td>
                                <td className="p-2 text-right">
                                  €{(sottocat.prezzo_premium || 0).toFixed(2)}
                                </td>
                                <td className="p-2 text-center">
                                  {sottocat.applica_f_accesso ? '✓' : '—'}
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={sottocat.attiva}
                                    onChange={(e) => toggleSottocategoria(sottocat.id, e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => apriModalModificaSottocategoria(sottocat)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                    >
                                      Modifica
                                    </button>
                                    <button
                                      onClick={() => eliminaSottocategoria(sottocat.id)}
                                      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                    >
                                      Elimina
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Categoria */}
        {showModalCategoria && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingCategoria ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h2>

              <div className="space-y-4">
                {!editingCategoria && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Codice *</label>
                    <input
                      type="text"
                      value={formCat.codice}
                      onChange={(e) => setFormCat({ ...formCat, codice: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="es: DEMOL"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formCat.nome}
                    onChange={(e) => setFormCat({ ...formCat, nome: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es: Demolizioni"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descrizione</label>
                  <textarea
                    value={formCat.descrizione}
                    onChange={(e) => setFormCat({ ...formCat, descrizione: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={salvaCategoria}
                  disabled={!formCat.nome || (!editingCategoria && !formCat.codice)}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {editingCategoria ? 'Salva Modifiche' : 'Crea Categoria'}
                </button>
                <button
                  onClick={() => setShowModalCategoria(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sottocategoria */}
        {showModalSottocategoria && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
              <h2 className="text-xl font-bold mb-4">
                {editingSottocategoria ? 'Modifica Sottocategoria' : 'Nuova Sottocategoria'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {!editingSottocategoria && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Codice *</label>
                    <input
                      type="text"
                      value={formSottocat.codice}
                      onChange={(e) => setFormSottocat({ ...formSottocat, codice: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="es: DEMOL_001"
                    />
                  </div>
                )}

                <div className={!editingSottocategoria ? '' : 'col-span-2'}>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formSottocat.nome}
                    onChange={(e) => setFormSottocat({ ...formSottocat, nome: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es: Demolizione tramezzi"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrizione</label>
                  <textarea
                    value={formSottocat.descrizione}
                    onChange={(e) => setFormSottocat({ ...formSottocat, descrizione: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unità Misura *</label>
                  <input
                    type="text"
                    value={formSottocat.unita_misura}
                    onChange={(e) => setFormSottocat({ ...formSottocat, unita_misura: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es: mq, ml, pz, cad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Prezzo Economy (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSottocat.prezzo_economy}
                    onChange={(e) => setFormSottocat({ ...formSottocat, prezzo_economy: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Prezzo Standard (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSottocat.prezzo_standard}
                    onChange={(e) => setFormSottocat({ ...formSottocat, prezzo_standard: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Prezzo Premium (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSottocat.prezzo_premium}
                    onChange={(e) => setFormSottocat({ ...formSottocat, prezzo_premium: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Note</label>
                  <textarea
                    value={formSottocat.note}
                    onChange={(e) => setFormSottocat({ ...formSottocat, note: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formSottocat.applica_f_accesso}
                      onChange={(e) => setFormSottocat({ ...formSottocat, applica_f_accesso: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">
                      Applica coefficiente accesso (+6% per piano alto senza ascensore)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={salvaSottocategoria}
                  disabled={
                    !formSottocat.nome ||
                    !formSottocat.unita_misura ||
                    !formSottocat.prezzo_standard ||
                    (!editingSottocategoria && !formSottocat.codice)
                  }
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {editingSottocategoria ? 'Salva Modifiche' : 'Crea Sottocategoria'}
                </button>
                <button
                  onClick={() => setShowModalSottocategoria(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
