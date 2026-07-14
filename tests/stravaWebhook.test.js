// tests/stravaWebhook.test.js
// Webhook route contract: GET challenge echo, POST fast-ack, unknown athlete
// drop, create event -> strava_activities upsert + brief generator call.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  handler: () => ({ data: null, error: null }),
  log: [],
}))

vi.mock('@supabase/supabase-js', async () => {
  const { makeFakeSupabase } = await import('./helpers/fakeSupabase.js')
  return {
    createClient: () => makeFakeSupabase((ctx) => {
      mockDb.log.push(ctx)
      return mockDb.handler(ctx)
    }),
  }
})
vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }))
vi.mock('../lib/stravaTokens.js', () => ({
  getValidToken: vi.fn(async () => 'access-token'),
  refreshToken:  vi.fn(),
}))
vi.mock('../lib/composeBrief.js', () => ({
  composePostrunBrief: vi.fn(async () => ({ brief: { id: 'brief-1' } })),
  composeMorningBrief: vi.fn(),
}))
vi.mock('../lib/sentry.js', () => ({ reportError: vi.fn(async () => {}) }))

import handler, { processEvent } from '../api/strava/webhook.js'
import { composePostrunBrief } from '../lib/composeBrief.js'
import { waitUntil } from '@vercel/functions'

function makeRes() {
  const res = { statusCode: null, body: null }
  res.status = (code) => { res.statusCode = code; return res }
  res.json   = (body) => { res.body = body; return res }
  return res
}

const USER_ID = 'user-1'

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.log.length = 0
  mockDb.handler = () => ({ data: null, error: null })
  process.env.STRAVA_VERIFY_TOKEN = 'sekrit'
  delete process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  process.env.FUEL_COACH_ALLOWLIST = USER_ID
})

describe('GET subscription validation', () => {
  it('echoes hub.challenge when the verify token matches', async () => {
    const res = makeRes()
    await handler({ method: 'GET', query: {
      'hub.mode': 'subscribe', 'hub.verify_token': 'sekrit', 'hub.challenge': 'abc123',
    } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ 'hub.challenge': 'abc123' })
  })

  it('accepts the legacy STRAVA_WEBHOOK_VERIFY_TOKEN name', async () => {
    delete process.env.STRAVA_VERIFY_TOKEN
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'legacy-token'
    const res = makeRes()
    await handler({ method: 'GET', query: {
      'hub.mode': 'subscribe', 'hub.verify_token': 'legacy-token', 'hub.challenge': 'xyz',
    } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ 'hub.challenge': 'xyz' })
  })

  it('rejects a wrong verify token with 403', async () => {
    const res = makeRes()
    await handler({ method: 'GET', query: {
      'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'abc123',
    } }, res)
    expect(res.statusCode).toBe(403)
  })
})

describe('POST event handling', () => {
  it('acks 200 immediately and defers processing to waitUntil', async () => {
    const res = makeRes()
    await handler({ method: 'POST', body: {
      object_type: 'activity', aspect_type: 'create', object_id: 1, owner_id: 7,
    } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ received: true })
    expect(waitUntil).toHaveBeenCalledTimes(1)
  })

  it('ignores non-activity and non-create/update events (no DB access)', async () => {
    await processEvent({ object_type: 'athlete', aspect_type: 'update', owner_id: 7, updates: { authorized: 'false' } })
    await processEvent({ object_type: 'activity', aspect_type: 'delete', object_id: 1, owner_id: 7 })
    expect(mockDb.log.length).toBe(0)
    expect(composePostrunBrief).not.toHaveBeenCalled()
  })

  it('drops events for unknown athletes without writing anything', async () => {
    mockDb.handler = (ctx) => {
      if (ctx.table === 'strava_tokens') return { data: null, error: null }
      throw new Error(`unexpected table ${ctx.table}`)
    }
    await processEvent({ object_type: 'activity', aspect_type: 'create', object_id: 11, owner_id: 999 })
    expect(mockDb.log.filter(c => c.op !== 'select').length).toBe(0)
    expect(composePostrunBrief).not.toHaveBeenCalled()
  })

  it('create event: upserts strava_activities with mapped fields, then composes', async () => {
    const activity = {
      id: 555, name: 'Morning Run', sport_type: 'Run',
      start_date: '2026-07-14T13:00:00Z',
      moving_time: 3600, elapsed_time: 3700, distance: 16093,
      total_elevation_gain: 120, average_heartrate: 152, suffer_score: 87,
    }
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => activity }))
    mockDb.handler = (ctx) => {
      if (ctx.table === 'strava_tokens')     return { data: { user_id: USER_ID, athlete_id: 7, access_token: 't', refresh_token: 'r', expires_at: 0 }, error: null }
      if (ctx.table === 'strava_activities') return { data: null, error: null }
      throw new Error(`unexpected table ${ctx.table}`)
    }

    await processEvent({ object_type: 'activity', aspect_type: 'create', object_id: 555, owner_id: 7 })

    const upsert = mockDb.log.find(c => c.table === 'strava_activities' && c.op === 'upsert')
    expect(upsert).toBeTruthy()
    expect(upsert.opts).toEqual({ onConflict: 'activity_id' })
    expect(upsert.payload).toMatchObject({
      activity_id:       555,
      user_id:           USER_ID,
      name:              'Morning Run',
      sport_type:        'Run',
      start_date:        '2026-07-14T13:00:00Z',
      moving_time_s:     3600,
      distance_m:        16093,
      elevation_gain_m:  120,
      average_heartrate: 152,
      relative_effort:   87,   // suffer_score -> relative_effort
      raw:               activity,
    })
    expect(composePostrunBrief).toHaveBeenCalledTimes(1)
    expect(composePostrunBrief).toHaveBeenCalledWith({ userId: USER_ID, activity })
  })

  it('drops non-allowlisted users before any fetch or write', async () => {
    process.env.FUEL_COACH_ALLOWLIST = 'someone-else'
    global.fetch = vi.fn()
    mockDb.handler = (ctx) => {
      if (ctx.table === 'strava_tokens') return { data: { user_id: USER_ID, athlete_id: 7 }, error: null }
      throw new Error(`unexpected table ${ctx.table}`)
    }
    await processEvent({ object_type: 'activity', aspect_type: 'create', object_id: 1, owner_id: 7 })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(composePostrunBrief).not.toHaveBeenCalled()
  })
})
