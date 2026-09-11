import { describe, expect, it } from 'vitest'
import { calculateFrontier, filterModels, type Model } from './model-data'

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
