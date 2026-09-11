import { mkdir, writeFile } from 'node:fs/promises'

const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY
const apiUrl = 'https://artificialanalysis.ai/api/v2/language/models/free'
const outputPath = 'public/models.json'

if (!apiKey) throw new Error('ARTIFICIAL_ANALYSIS_API_KEY is required')

function normalizeModel(model) {
  return {
    vendor: model.model_creator.name,
    name: model.name,
    score: model.evaluations.artificial_analysis_intelligence_index,
    releaseDate: model.release_date,
  }
}

function isUsableModel(model) {
  return typeof model?.name === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(model.release_date) &&
    typeof model.model_creator?.name === 'string' &&
    typeof model.evaluations?.artificial_analysis_intelligence_index === 'number'
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
  if (!response.ok) {
    let detail = ''
    try {
      const errorPayload = await response.json()
      detail = typeof errorPayload.error === 'string' ? `: ${errorPayload.error}` : ''
    } catch {
      detail = ''
    }
    if (response.status === 401) throw new Error(`Artificial Analysis rejected the API key with HTTP 401${detail}. Check the ARTIFICIAL_ANALYSIS_API_KEY GitHub secret.`)
    if (response.status === 403) throw new Error(`Artificial Analysis denied access with HTTP 403${detail}. Check that the API key is active.`)
    throw new Error(`Artificial Analysis API returned ${response.status} on page ${page}${detail}`)
  }

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
