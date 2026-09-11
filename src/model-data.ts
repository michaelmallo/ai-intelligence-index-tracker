export type Model = {
  vendor: string
  name: string
  score: number
  releaseDate: string
}

export type FrontierPoint = Model & { date: string }

export function calculateFrontier(models: Model[]): FrontierPoint[] {
  let highest = -Infinity

  return [...models]
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .filter((model) => {
      if (model.score <= highest) return false
      highest = model.score
      return true
    })
    .map((model) => ({ ...model, date: formatDate(model.releaseDate) }))
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function filterModels(models: Model[], vendor: string): Model[] {
  return models.filter((model) => vendor === 'All' || model.vendor === vendor)
}
