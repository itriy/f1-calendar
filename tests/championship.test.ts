import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateChampionshipChances } from '../src/utils/championship'

const standings = [
  { pos: '1', name: 'Leader', url: '', team: 'Team A', teamUrl: '', points: '100', code: 'leader', color: '' },
  { pos: '2', name: 'Contender', url: '', team: 'Team B', teamUrl: '', points: '60', code: 'contender', color: '' },
  { pos: '3', name: 'Out', url: '', team: 'Team C', teamUrl: '', points: '10', code: 'out', color: '' }
]

test('keeps only mathematical contenders and distributes a deterministic model index', () => {
  const result = estimateChampionshipChances(standings, 2)
  assert.deepEqual(result.map((item) => item.name), ['Leader', 'Contender'])
  assert.equal(result.reduce((total, item) => total + item.estimate, 0), 100)
})

test('returns no title model once the season is complete', () => {
  assert.deepEqual(estimateChampionshipChances(standings, 0), [])
})
