export type Model = {
  vendor: string
  name: string
  score: number
  releaseDate: string
}

export type VendorOrder = 'A-Z' | 'Z-A' | 'Current Best Index (decreasing)' | 'Current Best Index (increasing)'

export type FrontierPoint = Model & { date: string; dateValue: number }

export function calculateFrontier(models: Model[]): FrontierPoint[] {
  let highest = -Infinity

  return [...models]
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .filter((model) => {
      if (model.score <= highest) return false
      highest = model.score
      return true
    })
    .map((model) => ({ ...model, date: formatDate(model.releaseDate), dateValue: dateValue(model.releaseDate) }))
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function dateValue(date: string): number {
  return new Date(`${date}T12:00:00`).getTime()
}

export function filterModels(models: Model[], vendor: string): Model[] {
  return models.filter((model) => vendor === 'All' || model.vendor === vendor)
}

export function sortVendors(models: Model[], order: VendorOrder): string[] {
  const bestScores = new Map<string, number>()
  for (const model of models) bestScores.set(model.vendor, Math.max(bestScores.get(model.vendor) ?? -Infinity, model.score))

  return [...bestScores.keys()].sort((left, right) => {
    if (order === 'A-Z' || order === 'Z-A') {
      const comparison = left.localeCompare(right)
      return order === 'A-Z' ? comparison : -comparison
    }

    const scoreComparison = bestScores.get(left)! - bestScores.get(right)!
    if (scoreComparison !== 0) return order === 'Current Best Index (decreasing)' ? -scoreComparison : scoreComparison
    return left.localeCompare(right)
  })
}
