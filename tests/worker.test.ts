import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSearch } from '../src/worker'
import worker from '../src/worker'

const assets = { fetch: async () => new Response('asset') }

test('returns a friendly configuration state without a Gemini secret', async () => {
  const response = await handleSearch(new Request('https://example.test/api/f1-search', { method: 'POST', body: JSON.stringify({ query: 'Хто виграв Монако?' }) }), { ASSETS: assets })
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: { code: 'not_configured', message: 'AI-пошук ще не налаштований.' } })
})

test('rejects invalid and oversized requests before any provider call', async () => {
  const invalid = await handleSearch(new Request('https://example.test/api/f1-search', { method: 'POST', body: '{}' }), { ASSETS: assets })
  assert.equal(invalid.status, 400)
  const oversized = await handleSearch(new Request('https://example.test/api/f1-search', { method: 'POST', body: JSON.stringify({ query: 'x'.repeat(2_000) }) }), { ASSETS: assets })
  assert.equal(oversized.status, 413)
})

test('routes DELETE push unsubscribe requests to push validation instead of the API 404 fallback', async () => {
  const db = { prepare: () => ({ bind() { return this }, run: async () => ({ success: true }), first: async () => null, all: async () => ({ results: [] }) }) }
  const response = await worker.fetch(new Request('https://example.test/api/push/subscription', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: '{}' }), { ASSETS: assets, PUSH_DB: db, VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private' })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: { code: 'invalid_subscription', message: 'Некоректна push-підписка.' } })
})
