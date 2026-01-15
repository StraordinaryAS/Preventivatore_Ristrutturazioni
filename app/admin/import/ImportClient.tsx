'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ImportResult {
  success: boolean
  message: string
  stats?: {
    categorie: number
    sottocategorie: number
    errori: number
  }
  errors?: string[]
}

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/template_import_lavorazioni.csv'
    link.download = 'template_import_lavorazioni.csv'
    link.click()
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/import-lavorazioni', {
        method: 'POST',
        body: formData,
      })

      const data: ImportResult = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Errore durante l\'import: ' + (error as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/prezzario"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Torna al Prezzario
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Importa Lavorazioni da CSV
          </h1>
          <p className="text-gray-600">
            Carica un file CSV per importare o aggiornare categorie e sottocategorie
          </p>
        </div>

        {/* Istruzioni */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Istruzioni</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Scarica il template CSV cliccando sul pulsante qui sotto</li>
            <li>Compila il file con le tue lavorazioni personalizzate</li>
            <li>Salva il file in formato CSV (separatore: virgola)</li>
            <li>Carica il file usando il form sottostante</li>
          </ol>

          <div className="mt-6">
            <button
              onClick={handleDownloadTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              📥 Scarica Template CSV
            </button>
          </div>
        </div>

        {/* Struttura File */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Struttura del File CSV</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Colonna</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Descrizione</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Esempio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">categoria_codice</td>
                  <td className="px-4 py-2">Codice categoria (es. 01, 02)</td>
                  <td className="px-4 py-2 text-gray-600">01</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">categoria_nome</td>
                  <td className="px-4 py-2">Nome categoria</td>
                  <td className="px-4 py-2 text-gray-600">DEMOLIZIONI</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">sottocategoria_codice</td>
                  <td className="px-4 py-2">Codice sottocategoria</td>
                  <td className="px-4 py-2 text-gray-600">01.01</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">sottocategoria_nome</td>
                  <td className="px-4 py-2">Descrizione lavorazione</td>
                  <td className="px-4 py-2 text-gray-600">Demolizione pavimenti</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">unita_misura</td>
                  <td className="px-4 py-2">Unità di misura</td>
                  <td className="px-4 py-2 text-gray-600">mq, ml, pz, cad</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">prezzo_economy</td>
                  <td className="px-4 py-2">Prezzo livello Economy</td>
                  <td className="px-4 py-2 text-gray-600">15.00</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">prezzo_standard</td>
                  <td className="px-4 py-2">Prezzo livello Standard</td>
                  <td className="px-4 py-2 text-gray-600">18.00</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">prezzo_premium</td>
                  <td className="px-4 py-2">Prezzo livello Premium</td>
                  <td className="px-4 py-2 text-gray-600">22.00</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">note</td>
                  <td className="px-4 py-2">Note aggiuntive (opzionale)</td>
                  <td className="px-4 py-2 text-gray-600">Include smaltimento</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">applica_fattore_accesso</td>
                  <td className="px-4 py-2">Applica fattore accesso (SI/NO)</td>
                  <td className="px-4 py-2 text-gray-600">SI</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Carica File CSV</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona file CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {file && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>File selezionato:</strong> {file.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Dimensione: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
                disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg
                font-medium transition-colors"
            >
              {loading ? '⏳ Importazione in corso...' : '🚀 Avvia Importazione'}
            </button>
          </div>
        </div>

        {/* Risultato */}
        {result && (
          <div
            className={`rounded-lg p-6 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <h2 className="text-lg font-semibold mb-4">
              {result.success ? '✅ Importazione Completata' : '❌ Errore Importazione'}
            </h2>

            <p className={`mb-4 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </p>

            {result.stats && (
              <div className="bg-white rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <strong>Categorie importate:</strong> {result.stats.categorie}
                </p>
                <p className="text-sm">
                  <strong>Sottocategorie importate:</strong> {result.stats.sottocategorie}
                </p>
                {result.stats.errori > 0 && (
                  <p className="text-sm text-orange-600">
                    <strong>Righe con errori:</strong> {result.stats.errori}
                  </p>
                )}
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-800 mb-2">Errori dettagliati:</p>
                <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.success && (
              <div className="mt-6">
                <Link
                  href="/admin/prezzario"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Visualizza Prezzario Aggiornato
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
