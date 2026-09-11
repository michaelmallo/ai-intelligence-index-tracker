import { mkdir, writeFile } from 'node:fs/promises'

const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY
const apiUrl = 'https://artificialanalysis.ai/api/v2/language/models'
const outputPath = 'public/models.json'
const countryNames = {
  ca: 'Canada', cn: 'China', de: 'Germany', fr: 'France', gb: 'United Kingdom',
  il: 'Israel', jp: 'Japan', kr: 'South Korea', us: 'United States',
}

if (!apiKey) throw new Error('ARTIFICIAL_ANALYSIS_API_KEY is required')

function normalizeModel(model) {
  const countryCode = typeof model.model_creator?.country === 'string' ? model.model_creator.country.toLowerCase() : ''
  return {
    vendor: model.model_creator.name,
    name: model.name,
    score: model.evaluations.artificial_analysis_intelligence_index,
    releaseDate: model.release_date,
    openness: model.licensing.is_open_weights ? 'Open weights' : 'Closed',
    country: countryNames[countryCode] ?? (countryCode ? countryCode.toUpperCase() : 'Unknown'),
  }
}

function isUsableModel(model) {
  return typeof model?.name === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(model.release_date) &&
    typeof model.model_creator?.name === 'string' &&
    typeof model.model_creator?.country === 'string' &&
    typeof model.evaluations?.artificial_analysis_intelligence_index === 'number' &&
    typeof model.licensing?.is_open_weights === 'boolean'
}

const models = []
let page = 1
let totalPages = 1
let indexVersion = null

while (page <= totalPages) {
  const response = await fetch(`${apiUrl}?page=${page}`, {
    headers: { accept: 'application/json', 'x-api-key': apiKey },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Artificial Analysis API returned ${response.status} on page ${page}`)

  const payload = await response.json()
  if (!Array.isArray(payload.data)) throw new Error(`Invalid Artificial Analysis response on page ${page}`)
  if (typeof payload.intelligence_index_version === 'number') indexVersion = payload.intelligence_index_version

  models.push(...payload.data.filter(isUsableModel).map(normalizeModel))
  totalPages = payload.pagination?.total_pages ?? (payload.pagination?.has_more ? page + 1 : page)
  page += 1
}

await mkdir('public', { recursive: true })
await writeFile(outputPath, `${JSON.stringify({ models, indexVersion, retrievedAt: new Date().toISOString() }, null, 2)}\n`)
console.log(`Wrote ${models.length} models from ${totalPages} API page(s) to ${outputPath}`)
