import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportToCSV() {
  console.log('Fetching data from Supabase...')

  // Fetch all categories with their subcategories
  const { data: categorie, error } = await supabase
    .from('ristrutturazioni_categorie')
    .select(`
      *,
      ristrutturazioni_sottocategorie (*)
    `)
    .order('ordine', { ascending: true })

  if (error) {
    console.error('Error fetching data:', error)
    return
  }

  if (!categorie || categorie.length === 0) {
    console.log('No data found!')
    return
  }

  console.log(`Found ${categorie.length} categories`)

  // Build CSV
  const header = 'categoria_codice,categoria_nome,sottocategoria_codice,sottocategoria_nome,unita_misura,prezzo_economy,prezzo_standard,prezzo_premium,note,ordine_categoria,ordine_sottocategoria,applica_fattore_accesso\n'
  let csvContent = header

  for (const cat of categorie) {
    const sottocategorie = (cat as any).ristrutturazioni_sottocategorie || []

    // Sort subcategories by ordine
    sottocategorie.sort((a: any, b: any) => a.ordine - b.ordine)

    for (const sub of sottocategorie) {
      if (!sub.attiva) continue // Skip inactive

      const row = [
        cat.codice,
        cat.nome,
        sub.codice,
        sub.nome,
        sub.unita_misura,
        '0', // prezzo_economy
        '0', // prezzo_standard
        '0', // prezzo_premium
        sub.note || '',
        cat.ordine.toString(),
        sub.ordine.toString(),
        sub.applica_f_accesso ? 'SI' : 'NO'
      ]

      // Escape commas in fields
      const escapedRow = row.map(field => {
        if (field.includes(',') || field.includes('"')) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      })

      csvContent += escapedRow.join(',') + '\n'
    }
  }

  // Write to file
  const outputPath = './public/template_import_lavorazioni.csv'
  fs.writeFileSync(outputPath, csvContent, 'utf-8')

  console.log(`✅ CSV exported successfully to ${outputPath}`)
  console.log(`Total rows: ${csvContent.split('\n').length - 2}`) // -2 for header and last empty line
}

exportToCSV()
