import { describe, expect, it } from 'vitest'
import {
  addOneYear,
  buildCombinedChartData,
  buildFrontierChartData,
  calculateFrontier,
  calculateProjectionEndDate,
  calculateTimelineBounds,
  dateValue,
  filterModels,
  fitExponentialRegression,
  formatDate,
  generateRegressionPoints,
  generateSemesterTicks,
  getFrontierAtDate,
  getProjectedScore100Date,
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

describe('formatDate', () => {
  it('formats date strings into short month and year', () => {
    expect(formatDate('2024-01-01')).toBe('Jan 2024')
    expect(formatDate('2024-07-01')).toBe('Jul 2024')
  })

  it('formats timestamps into short month and year', () => {
    expect(formatDate(dateValue('2024-01-01'))).toBe('Jan 2024')
    expect(formatDate(dateValue('2024-07-01'))).toBe('Jul 2024')
  })
})

describe('generateSemesterTicks', () => {
  it('returns empty array when startDate is after endDate or inputs are invalid', () => {
    expect(generateSemesterTicks('2025-01-01', '2024-01-01')).toEqual([])
    expect(generateSemesterTicks('invalid', '2024-01-01')).toEqual([])
  })

  it('generates ticks for January 1st and July 1st of each calendar semester within range', () => {
    const ticks = generateSemesterTicks('2024-05-13', '2026-03-01')
    expect(ticks).toEqual([
      dateValue('2024-07-01'),
      dateValue('2025-01-01'),
      dateValue('2025-07-01'),
      dateValue('2026-01-01'),
    ])
  })

  it('includes boundary dates if they land exactly on semester beginnings', () => {
    const ticks = generateSemesterTicks('2024-01-01', '2024-07-01')
    expect(ticks).toEqual([
      dateValue('2024-01-01'),
      dateValue('2024-07-01'),
    ])
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

  it('calculates date when projected score reaches 100', () => {
    const frontier = calculateFrontier(models)
    const date100 = getProjectedScore100Date(frontier)
    expect(date100).not.toBeNull()
    if (!date100) return
    const model = fitExponentialRegression(frontier)!
    // On this date, the score reaches ~100
    const val = model.predict(dateValue(date100))
    expect(Math.round(val)).toBe(100)
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

describe('getFrontierAtDate', () => {
  it('returns null when frontier is empty', () => {
    expect(getFrontierAtDate([], dateValue('2024-01-01'))).toBeNull()
  })

  it('returns first score if date is before first breakthrough', () => {
    const frontier = calculateFrontier(models)
    expect(getFrontierAtDate(frontier, dateValue('2023-12-01'))).toBe(50)
  })

  it('returns correct score at intermediate and milestone dates', () => {
    const frontier = calculateFrontier(models)
    // First milestone at 2024-01-01 (50), second at 2024-03-01 (70)
    expect(getFrontierAtDate(frontier, dateValue('2024-01-01'))).toBe(50)
    expect(getFrontierAtDate(frontier, dateValue('2024-02-15'))).toBe(50)
    expect(getFrontierAtDate(frontier, dateValue('2024-03-01'))).toBe(70)
    expect(getFrontierAtDate(frontier, dateValue('2025-01-01'))).toBe(70)
  })
})

describe('buildCombinedChartData', () => {
  it('returns empty array when frontier is empty or dates invalid', () => {
    expect(buildCombinedChartData([], '2024-01-01', '2025-01-01')).toEqual([])
    const frontier = calculateFrontier(models)
    expect(buildCombinedChartData(frontier, '2025-01-01', '2024-01-01')).toEqual([])
  })

  it('combines frontier and regression data over timeline', () => {
    const frontier = calculateFrontier(models)
    const data = buildCombinedChartData(frontier, '2024-01-01', '2024-04-15', '2024-02-15')
    expect(data.length).toBeGreaterThan(0)

    // First point
    expect(data[0].x).toBe(dateValue('2024-01-01'))
    expect(data[0].frontier).toBe(50)
    expect(data[0].regression).toBe(50)

    // Point before frontierEnd (e.g. 2024-01-15 has frontier 50)
    const midPoint = data.find((p) => p.x === dateValue('2024-01-15'))
    expect(midPoint).toBeDefined()
    expect(midPoint?.frontier).toBe(50)

    // Point after frontierEnd (2024-02-15) but before score reaches 100 should have frontier undefined and regression defined
    const postFrontierPoint = data.find((p) => p.x === dateValue('2024-04-01'))
    expect(postFrontierPoint).toBeDefined()
    expect(postFrontierPoint?.frontier).toBeUndefined()
    expect(postFrontierPoint?.regression).toBeGreaterThan(70)
    expect(postFrontierPoint?.regression).toBeLessThanOrEqual(100)
  })

  it('stops projecting regression data beyond the date score reaches 100 and caps at 100', () => {
    const frontier = calculateFrontier(models)
    const score100Date = getProjectedScore100Date(frontier)!
    expect(score100Date).toBeDefined()

    // Pass a future endDate well beyond score100Date
    const data = buildCombinedChartData(frontier, '2024-01-01', '2025-01-01')

    // All points on or before score100Date must not exceed 100
    for (const pt of data) {
      if (pt.x <= dateValue(score100Date) && pt.regression !== undefined) {
        expect(pt.regression).toBeLessThanOrEqual(100)
      }
    }

    // Point at score100Date reaches 100
    const pointAt100 = data.find((p) => p.x === dateValue(score100Date))
    expect(pointAt100?.regression).toBe(100)

    // Points strictly after score100Date must not project regression
    const pointAfter100 = data.find((p) => p.x === dateValue('2025-01-01'))
    expect(pointAfter100).toBeDefined()
    expect(pointAfter100?.regression).toBeUndefined()
  })
})

describe('calculateProjectionEndDate', () => {
  it('returns the score 100 date when it is later than the latest actual data', () => {
    const frontier = calculateFrontier(models)
    const score100Date = getProjectedScore100Date(frontier)!
    // models latest is 2024-04-01, score100Date is in May 2024
    const result = calculateProjectionEndDate(frontier, '2024-04-01')
    expect(result).toBe(score100Date)
    expect(result.localeCompare('2024-04-01')).toBeGreaterThan(0)
  })

  it('returns the latest actual data date when it is later than the date score reaches 100', () => {
    const frontier = calculateFrontier(models)
    const result = calculateProjectionEndDate(frontier, '2024-08-01')
    expect(result).toBe('2024-08-01')
  })

  it('returns the latest actual data date when projection is not possible', () => {
    expect(calculateProjectionEndDate([], '2024-05-01')).toBe('2024-05-01')
  })
})

describe('calculateTimelineBounds', () => {
  it('returns undefined bounds when filtered models are empty', () => {
    expect(calculateTimelineBounds([])).toEqual({
      start: undefined,
      frontierEnd: undefined,
      axisEnd: undefined,
    })
  })

  it('stops projecting axisEnd at the date score reaches 100 when later than latest model', () => {
    const bounds = calculateTimelineBounds(models, '2024-03-01')
    const frontier = calculateFrontier(models)
    const score100Date = getProjectedScore100Date(frontier)!
    expect(bounds.start).toBe('2024-01-01')
    expect(bounds.axisEnd).toBe(score100Date)
    expect(bounds.frontierEnd).toBe('2024-04-01')
  })

  it('stops projecting axisEnd at latest actual data when actual data is later than score 100 date', () => {
    const modelsWithLateData: Model[] = [
      { vendor: 'A', name: 'early hit', score: 99, releaseDate: '2024-01-01' },
      { vendor: 'A', name: 'hits 100', score: 100, releaseDate: '2024-02-01' },
      { vendor: 'A', name: 'late actual model', score: 100, releaseDate: '2024-08-01' },
    ]
    const bounds = calculateTimelineBounds(modelsWithLateData, '2024-08-01')
    expect(bounds.axisEnd).toBe('2024-08-01')
  })
})

describe('CustomChartTooltip', () => {
  it('displays projection value on or before the score 100 date without exceeding 100', async () => {
    const { renderToString } = await import('react-dom/server')
    const { CustomChartTooltip } = await import('./App')
    const frontier = calculateFrontier(models)
    const regressionModel = fitExponentialRegression(frontier)
    const score100Date = getProjectedScore100Date(frontier)!

    // Tooltip on date before 100
    const htmlBefore = renderToString(
      CustomChartTooltip({
        active: true,
        label: dateValue('2024-03-01'),
        hoveredModel: null,
        frontier,
        regressionModel,
      })
    )
    expect(htmlBefore).toContain('Projection:')
    expect(htmlBefore).toContain('70')

    // Tooltip on score 100 date
    const htmlAt100 = renderToString(
      CustomChartTooltip({
        active: true,
        label: dateValue(score100Date),
        hoveredModel: null,
        frontier,
        regressionModel,
      })
    )
    expect(htmlAt100).toContain('Projection:')
    expect(htmlAt100).toContain('100')
  })

  it('does not display projection when timestamp is past the score 100 date', async () => {
    const { renderToString } = await import('react-dom/server')
    const { CustomChartTooltip } = await import('./App')
    const frontier = calculateFrontier(models)
    const regressionModel = fitExponentialRegression(frontier)

    // Tooltip on date far past score 100 date (e.g. 2025-01-01)
    const htmlAfter = renderToString(
      CustomChartTooltip({
        active: true,
        label: dateValue('2025-01-01'),
        hoveredModel: null,
        frontier,
        regressionModel,
      })
    )
    expect(htmlAfter).toContain('Frontier line:')
    expect(htmlAfter).not.toContain('Projection:')
  })
})


