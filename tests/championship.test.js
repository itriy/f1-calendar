import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateChampionshipChances } from '../src/utils/championship.js'

const standings = [
  { name: 'Leader', points: '200', code: 'a' },
  { name: 'Close', points: '180', code: 'b' },
  { name: 'Eliminated', points: '90', code: 'c' }
]

test('keeps only mathematical contenders and distributes a deterministic model index', () => {
  const result = estimateChampionshipChances(standings, 2)
  assert.deepEqual(result.map((driver) => driver.name), ['Leader', 'Close'])
  assert.equal(result.reduce((sum, driver) => sum + driver.estimate, 0), 100)
  assert.ok(result[0].estimate > result[1].estimate)
})

test('returns no title model once the season is complete', () => {
  assert.deepEqual(estimateChampionshipChances(standings, 0), [])
})
