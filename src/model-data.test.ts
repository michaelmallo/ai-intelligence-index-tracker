import { describe, expect, it } from 'vitest'
import { calculateFrontier, filterModels, type Model } from './model-data'

const models: Model[] = [
  { vendor: 'A', name: 'first', score: 50, releaseDate: '2024-01-01', openness: 'Closed', country: 'United States' },
  { vendor: 'B', name: 'same score', score: 50, releaseDate: '2024-02-01', openness: 'Open weights', country: 'China' },
  { vendor: 'A', name: 'new high', score: 70, releaseDate: '2024-03-01', openness: 'Closed', country: 'United States' },
  { vendor: 'B', name: 'lower later', score: 60, releaseDate: '2024-04-01', openness: 'Open weights', country: 'China' },
]

describe('filterModels', () => {
  it('combines vendor, country, and openness filters', () => {
    expect(filterModels(models, 'B', 'China', 'Open weights').map((model) => model.name)).toEqual(['same score', 'lower later'])
    expect(filterModels(models, 'A', 'China', 'All')).toEqual([])
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
