import { describe, expect, it } from 'vitest'
import {
  addOneYear,
  buildFrontierChartData,
  calculateFrontier,
  dateValue,
  filterModels,
  fitExponentialRegression,
  generateRegressionPoints,
  getTodayDateString,
  sortVendors,
  type Model,
} from './model-data'

const models: Model[] = [
  { vendor: 'A', name: 'first', score: 50, releaseDate: '2024-01-01' },
  { vendor: 'B', name: 'same score', score: 50, releaseDate: '2024-02-01' },
  { vendor: 'A', name: 'new high', score: 70, releaseDate: '2024-03-01' },
  { vendor: 'B', name: 'lower later', score: 60, releaseDate: '2024-04-01' },
]

describe('filterModels', () => {
  it('filters by vendor', () => {
    expect(filterModels(models, 'B').map((model) => model.name)).toEqual(['same score', 'lower later'])
    expect(filterModels(models, 'A').map((model) => model.name)).toEqual(['first', 'new high'])
  })
})

describe('calculateFrontier', () => {
  it('keeps only strictly increasing intelligence scores in release order', () => {
    expect(calculateFrontier(models).map((model) => model.name)).toEqual(['first', 'new high'])
  })

  it('starts each filtered frontier at its first score', () => {
    expect(calculateFrontier(models.filter((model) => model.vendor === 'B')).map((model) => model.name)).toEqual(['same score', 'lower later'])
  })
})

describe('buildFrontierChartData', () => {
  it('returns empty array when frontier is empty', () => {
    expect(buildFrontierChartData([])).toEqual([])
  })

  it('extends the highest score horizontally to the specified end date', () => {
    const frontier = calculateFrontier(models)
    const result = buildFrontierChartData(frontier, '2024-12-01')
    expect(result).toEqual([
      { x: dateValue('2024-01-01'), frontier: 50 },
      { x: dateValue('2024-03-01'), frontier: 70 },
      { x: dateValue('2024-12-01'), frontier: 70 },
    ])
  })

  it('does not add redundant point if end date is equal to or before the last frontier point', () => {
    const frontier = calculateFrontier(models)
    const result = buildFrontierChartData(frontier, '2024-03-01')
    expect(result).toEqual([
      { x: dateValue('2024-01-01'), frontier: 50 },
      { x: dateValue('2024-03-01'), frontier: 70 },
    ])
  })

  it('defaults to extending to today if no end date is passed', () => {
    const frontier = calculateFrontier(models)
    const result = buildFrontierChartData(frontier)
    const today = getTodayDateString()
    expect(result.at(-1)).toEqual({
      x: dateValue(today),
      frontier: 70,
    })
  })
})

describe('dateValue', () => {
  it('converts release dates into sortable timestamps', () => {
    expect(dateValue('2024-01-01')).toBeLessThan(dateValue('2024-02-01'))
  })
})

describe('sortVendors', () => {
  it('sorts vendors alphabetically in both directions', () => {
    expect(sortVendors(models, 'A-Z')).toEqual(['A', 'B'])
    expect(sortVendors(models, 'Z-A')).toEqual(['B', 'A'])
  })

  it('sorts vendors by their current best index', () => {
    expect(sortVendors(models, 'Current Best Index (decreasing)')).toEqual(['A', 'B'])
    expect(sortVendors(models, 'Current Best Index (increasing)')).toEqual(['B', 'A'])
  })
})

describe('addOneYear', () => {
  it('adds one year to standard date', () => {
    expect(addOneYear('2024-05-13')).toBe('2025-05-13')
    expect(addOneYear('2026-09-17')).toBe('2027-09-17')
  })

  it('handles leap year rollover gracefully', () => {
    expect(addOneYear('2024-02-29')).toBe('2025-03-01')
  })
})

describe('fitExponentialRegression', () => {
  it('returns null when frontier has fewer than 2 points', () => {
    expect(fitExponentialRegression([])).toBeNull()
    expect(fitExponentialRegression(calculateFrontier([{ vendor: 'A', name: 'only', score: 50, releaseDate: '2024-01-01' }]))).toBeNull()
  })

  it('returns null when all points have identical dates', () => {
    const points = [
      { vendor: 'A', name: 'p1', score: 50, releaseDate: '2024-01-01', date: 'Jan 2024', dateValue: dateValue('2024-01-01') },
      { vendor: 'B', name: 'p2', score: 60, releaseDate: '2024-01-01', date: 'Jan 2024', dateValue: dateValue('2024-01-01') },
    ]
    expect(fitExponentialRegression(points)).toBeNull()
  })

  it('fits exponential curve to strictly increasing points', () => {
    const frontier = calculateFrontier(models)
    const model = fitExponentialRegression(frontier)
    expect(model).not.toBeNull()
    if (!model) return

    // Frontier has (2024-01-01, 50) and (2024-03-01, 70)
    const predStart = model.predict(dateValue('2024-01-01'))
    const predEnd = model.predict(dateValue('2024-03-01'))
    const predFuture = model.predict(dateValue('2024-05-01'))

    // In a 2-point fit, it should pass exactly through the 2 points
    expect(Math.round(predStart)).toBe(50)
    expect(Math.round(predEnd)).toBe(70)
    expect(predFuture).toBeGreaterThan(70)
  })
})

describe('generateRegressionPoints', () => {
  it('returns empty array when regression cannot be fitted', () => {
    expect(generateRegressionPoints([], '2024-01-01', '2025-01-01')).toEqual([])
  })

  it('returns empty array when startDate is after or equal to endDate', () => {
    const frontier = calculateFrontier(models)
    expect(generateRegressionPoints(frontier, '2025-01-01', '2024-01-01')).toEqual([])
    expect(generateRegressionPoints(frontier, '2024-01-01', '2024-01-01')).toEqual([])
  })

  it('generates points spanning from startDate to endDate', () => {
    const frontier = calculateFrontier(models)
    const points = generateRegressionPoints(frontier, '2024-01-01', '2025-01-01', 10)
    expect(points.length).toBe(10)
    expect(points[0].x).toBe(dateValue('2024-01-01'))
    expect(points[points.length - 1].x).toBe(dateValue('2025-01-01'))
    expect(points[0].regression).toBeGreaterThan(0)
    expect(points[points.length - 1].regression).toBeGreaterThan(points[0].regression)
  })
})
