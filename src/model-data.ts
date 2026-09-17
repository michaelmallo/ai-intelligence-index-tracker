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

export function formatDate(date: string | number): string {
  const d = typeof date === 'number' ? new Date(date) : new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(d)
}

export function generateSemesterTicks(startDate: string, endDate: string): number[] {
  const startVal = dateValue(startDate)
  const endVal = dateValue(endDate)
  if (Number.isNaN(startVal) || Number.isNaN(endVal) || startVal > endVal) return []

  const startYear = new Date(`${startDate}T12:00:00`).getFullYear()
  const endYear = new Date(`${endDate}T12:00:00`).getFullYear()
  const ticks: number[] = []

  for (let year = startYear; year <= endYear; year++) {
    for (const semesterStart of [`${year}-01-01`, `${year}-07-01`]) {
      const val = dateValue(semesterStart)
      if (val >= startVal && val <= endVal) {
        ticks.push(val)
      }
    }
  }

  return ticks
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

export type FrontierChartPoint = {
  x: number
  frontier: number
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildFrontierChartData(
  frontier: FrontierPoint[],
  endDate: string = getTodayDateString(),
): FrontierChartPoint[] {
  if (frontier.length === 0) return []

  const points: FrontierChartPoint[] = frontier.map((point) => ({
    x: point.dateValue,
    frontier: point.score,
  }))

  const lastPoint = frontier[frontier.length - 1]
  const endValue = dateValue(endDate)

  if (endValue > lastPoint.dateValue) {
    points.push({
      x: endValue,
      frontier: lastPoint.score,
    })
  }

  return points
}

export function addOneYear(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`)
  date.setFullYear(date.getFullYear() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type ExponentialRegressionModel = {
  predict: (dateVal: number) => number
  a: number
  b: number
}

const MS_PER_DAY = 86_400_000

export function fitExponentialRegression(frontier: FrontierPoint[]): ExponentialRegressionModel | null {
  const validPoints = frontier.filter((p) => p.score > 0)
  if (validPoints.length < 2) return null

  const x0 = validPoints[0].dateValue
  const pts = validPoints.map((p) => ({
    t: (p.dateValue - x0) / MS_PER_DAY,
    lnY: Math.log(p.score),
  }))

  const n = pts.length
  const meanT = pts.reduce((sum, p) => sum + p.t, 0) / n
  const meanLnY = pts.reduce((sum, p) => sum + p.lnY, 0) / n

  let num = 0
  let den = 0
  for (const p of pts) {
    const dt = p.t - meanT
    num += dt * (p.lnY - meanLnY)
    den += dt * dt
  }

  if (den === 0) return null

  const b = num / den
  const alpha = meanLnY - b * meanT
  const a = Math.exp(alpha)

  return {
    a,
    b,
    predict: (dateVal: number) => {
      const t = (dateVal - x0) / MS_PER_DAY
      return Math.exp(alpha + b * t)
    },
  }
}

export type RegressionChartPoint = {
  x: number
  regression: number
}

export function generateRegressionPoints(
  frontier: FrontierPoint[],
  startDate: string,
  endDate: string,
  numPoints: number = 80,
): RegressionChartPoint[] {
  const model = fitExponentialRegression(frontier)
  if (!model) return []

  const startVal = dateValue(startDate)
  const endVal = dateValue(endDate)
  if (startVal >= endVal) return []

  const points: RegressionChartPoint[] = []
  const step = (endVal - startVal) / (numPoints - 1)

  for (let i = 0; i < numPoints; i++) {
    const x = Math.round(startVal + i * step)
    const val = model.predict(x)
    points.push({
      x,
      regression: Math.round(val * 100) / 100,
    })
  }

  return points
}
