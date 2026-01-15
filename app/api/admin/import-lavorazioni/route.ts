import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

interface CSVRow {
  categoria_codice: string
  categoria_nome: string
  sottocategoria_codice: string
  sottocategoria_nome: string
  unita_misura: string
  prezzo_economy: string
  prezzo_standard: string
  prezzo_premium: string
  note: string
  ordine_categoria: string
  ordine_sottocategoria: string
  applica_fattore_accesso: string
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    if (values.length !== headers.length) {
      console.warn(`Riga ${i + 1} ha un numero di colonne diverso dall'header, skip`)
      continue
    }

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    rows.push(row as CSVRow)
  }

  return rows
}

function parsePrice(value: string): number | null {
  if (!value || value === '') return null
  const cleaned = value.replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Nessun file caricato' },
        { status: 400 }
      )
    }

    // Read file content
    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Il file CSV è vuoto o non valido' },
        { status: 400 }
      )
    }

    // Process categories and subcategories
    const categoriesMap = new Map<string, any>()
    const subcategories: any[] = []
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because of header and 0-index

      try {
        // Validate required fields
        if (!row.categoria_codice || !row.categoria_nome) {
          errors.push(`Riga ${rowNum}: categoria_codice e categoria_nome sono obbligatori`)
          continue
        }

        if (!row.sottocategoria_codice || !row.sottocategoria_nome || !row.unita_misura) {
          errors.push(`Riga ${rowNum}: sottocategoria_codice, sottocategoria_nome e unita_misura sono obbligatori`)
          continue
        }

        // Build category
        if (!categoriesMap.has(row.categoria_codice)) {
          categoriesMap.set(row.categoria_codice, {
            codice: row.categoria_codice,
            nome: row.categoria_nome,
            ordine: parseInt(row.ordine_categoria) || parseInt(row.categoria_codice.split('.')[0]) || 1,
            attiva: true,
          })
        }

        // Build subcategory
        const prezzoEconomy = parsePrice(row.prezzo_economy)
        const prezzoStandard = parsePrice(row.prezzo_standard)
        const prezzoPremium = parsePrice(row.prezzo_premium)

        if (prezzoStandard === null) {
          errors.push(`Riga ${rowNum}: prezzo_standard è obbligatorio`)
          continue
        }

        subcategories.push({
          id_categoria_codice: row.categoria_codice, // Temporary, will be replaced with UUID
          codice: row.sottocategoria_codice,
          nome: row.sottocategoria_nome,
          unita_misura: row.unita_misura,
          prezzo_economy: prezzoEconomy,
          prezzo_standard: prezzoStandard,
          prezzo_premium: prezzoPremium,
          note: row.note || null,
          ordine: parseInt(row.ordine_sottocategoria) || 1,
          attiva: true,
          applica_f_accesso: row.applica_fattore_accesso?.toUpperCase() === 'SI',
        })
      } catch (error) {
        errors.push(`Riga ${rowNum}: ${(error as Error).message}`)
      }
    }

    // Insert categories
    const categories = Array.from(categoriesMap.values())
    const categoriesInserted: any[] = []

    for (const category of categories) {
      // Check if category exists
      const { data: existing } = await supabase
        .from('ristrutturazioni_categorie')
        .select('*')
        .eq('codice', category.codice)
        .single()

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('ristrutturazioni_categorie')
          .update({
            nome: category.nome,
            ordine: category.ordine,
          })
          .eq('codice', category.codice)
          .select()
          .single()

        if (error) {
          errors.push(`Errore aggiornamento categoria ${category.codice}: ${error.message}`)
        } else {
          categoriesInserted.push(updated)
        }
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from('ristrutturazioni_categorie')
          .insert(category)
          .select()
          .single()

        if (error) {
          errors.push(`Errore inserimento categoria ${category.codice}: ${error.message}`)
        } else {
          categoriesInserted.push(inserted)
        }
      }
    }

    // Create map codice -> id
    const categoriesIdMap = new Map<string, string>()
    categoriesInserted.forEach(cat => {
      categoriesIdMap.set(cat.codice, cat.id)
    })

    // Insert subcategories
    let subcategoriesInserted = 0

    for (const subcat of subcategories) {
      const categoryId = categoriesIdMap.get(subcat.id_categoria_codice)
      if (!categoryId) {
        errors.push(`Sottocategoria ${subcat.codice}: categoria ${subcat.id_categoria_codice} non trovata`)
        continue
      }

      const subcatData = {
        id_categoria: categoryId,
        codice: subcat.codice,
        nome: subcat.nome,
        unita_misura: subcat.unita_misura,
        prezzo_economy: subcat.prezzo_economy,
        prezzo_standard: subcat.prezzo_standard,
        prezzo_premium: subcat.prezzo_premium,
        note: subcat.note,
        ordine: subcat.ordine,
        attiva: subcat.attiva,
        applica_f_accesso: subcat.applica_f_accesso,
      }

      // Check if subcategory exists
      const { data: existing } = await supabase
        .from('ristrutturazioni_sottocategorie')
        .select('*')
        .eq('codice', subcat.codice)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('ristrutturazioni_sottocategorie')
          .update(subcatData)
          .eq('codice', subcat.codice)

        if (error) {
          errors.push(`Errore aggiornamento sottocategoria ${subcat.codice}: ${error.message}`)
        } else {
          subcategoriesInserted++
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('ristrutturazioni_sottocategorie')
          .insert(subcatData)

        if (error) {
          errors.push(`Errore inserimento sottocategoria ${subcat.codice}: ${error.message}`)
        } else {
          subcategoriesInserted++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importazione completata con successo!`,
      stats: {
        categorie: categoriesInserted.length,
        sottocategorie: subcategoriesInserted,
        errori: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Errore import:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Errore durante l\'importazione: ' + (error as Error).message,
      },
      { status: 500 }
    )
  }
}
