// tests/composeBrief.test.js
// Post-run brief generator contract: run-only gate, 20-minute floor,
// notify_postrun opt-out, window from activity end, insert + dedupe.

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
vi.mock('../lib/notify.js', () => ({ deliverBrief: vi.fn(async () => {}) }))
vi.mock('../lib/sentry.js', () => ({ reportError: vi.fn(async () => {}) }))
vi.mock('posthog-node', () => ({
  PostHog: class { capture() {} async shutdown() {} },
}))

import { composePostrunBrief } from '../lib/composeBrief.js'
import { deliverBrief } from '../lib/notify.js'

const USER_ID = 'user-1'

const SETTINGS = {
  weight_kg: 70, age: 22, sex: 'male', height_cm: 180,
  activity_level: 'moderate', goal: 'maintain',
  sport: 'running', weekly_mileage: 50, training_hours_week: 0,
}

function dbFor({ profile = { dining_situation: 'dining_hall', notify_postrun: true }, insertResults }) {
  let insertCall = 0
  return (ctx) => {
    if (ctx.table === 'user_settings')  return { data: SETTINGS, error: null }
    if (ctx.table === 'fuel_profiles')  return { data: profile, error: null }
    if (ctx.table === 'fuel_checkins')  return { data: [], error: null }
    if (ctx.table === 'fuel_briefs' && ctx.op === 'insert') {
      const r = insertResults[Math.min(insertCall, insertResults.length - 1)]
      insertCall++
      return r
    }
    throw new Error(`unexpected query: ${ctx.table} ${ctx.op}`)
  }
}

const RUN = {
  id: 555, name: 'Morning Run', sport_type: 'Run',
  start_date: '2026-07-14T13:00:00Z',
  moving_time: 3600, elapsed_time: 3700, distance: 16093,
  average_heartrate: 152, suffer_score: 87,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.log.length = 0
  mockDb.handler = () => ({ data: null, error: null })
  // No key -> the Claude call throws -> deterministic fallback body. Keeps
  // tests offline and exercises the never-fail composition path.
  delete process.env.ANTHROPIC_API_KEY
})

describe('gates (checked before any DB read where possible)', () => {
  it('skips non-run activities without touching the DB', async () => {
    const result = await composePostrunBrief({ userId: USER_ID, activity: { ...RUN, sport_type: 'Ride' } })
    expect(result).toEqual({ skipped: 'not a run' })
    expect(mockDb.log.length).toBe(0)
  })

  it('skips runs under the 20-minute floor', async () => {
    const result = await composePostrunBrief({ userId: USER_ID, activity: { ...RUN, moving_time: 600 } })
    expect(result).toEqual({ skipped: 'under 20 min' })
    expect(mockDb.log.length).toBe(0)
  })

  it('skips when fuel_profiles.notify_postrun is false', async () => {
    mockDb.handler = dbFor({ profile: { dining_situation: 'mixed', notify_postrun: false }, insertResults: [] })
    const result = await composePostrunBrief({ userId: USER_ID, activity: RUN })
    expect(result).toEqual({ skipped: 'notify_postrun off' })
    expect(mockDb.log.find(c => c.op === 'insert')).toBeUndefined()
  })

  it('treats a missing profile row as notify_postrun = true', async () => {
    mockDb.handler = dbFor({
      profile: null,
      insertResults: [{ data: { id: 'brief-1', kind: 'postrun' }, error: null }],
    })
    const result = await composePostrunBrief({ userId: USER_ID, activity: RUN })
    expect(result.brief).toBeTruthy()
  })
})

describe('composition', () => {
  it('inserts a postrun brief with the window anchored to activity end + 60 min', async () => {
    mockDb.handler = dbFor({
      insertResults: [{ data: { id: 'brief-1', kind: 'postrun', body: 'x' }, error: null }],
    })
    const result = await composePostrunBrief({ userId: USER_ID, activity: RUN })
    expect(result.brief).toBeTruthy()

    const insert = mockDb.log.find(c => c.table === 'fuel_briefs' && c.op === 'insert')
    expect(insert.payload).toMatchObject({
      user_id:            USER_ID,
      kind:               'postrun',
      strava_activity_id: 555,
    })
    // start 13:00:00Z + elapsed 3700s = 14:01:40Z; + 60 min window = 15:01:40Z
    expect(insert.payload.window_ends_at).toBe('2026-07-14T15:01:40.000Z')
    // macros carry the targets used in the copy
    expect(insert.payload.macros.carbs_g).toBeGreaterThan(0)
    expect(insert.payload.macros.protein_g).toBeGreaterThan(0)
    expect(insert.payload.macros.window_min).toBe(60)
    // fallback body is real copy, and never an em dash
    expect(insert.payload.body.length).toBeGreaterThan(10)
    expect(insert.payload.body).not.toMatch(/[—–]/)

    expect(deliverBrief).toHaveBeenCalledTimes(1)
  })

  it('duplicate insert (unique-index conflict) resolves as deduped, no second delivery', async () => {
    mockDb.handler = dbFor({
      insertResults: [
        { data: { id: 'brief-1', kind: 'postrun' }, error: null },
        { data: null, error: { code: '23505' } },
      ],
    })
    const first  = await composePostrunBrief({ userId: USER_ID, activity: RUN })
    const second = await composePostrunBrief({ userId: USER_ID, activity: RUN })
    expect(first.brief).toBeTruthy()
    expect(second).toEqual({ deduped: true })
    expect(deliverBrief).toHaveBeenCalledTimes(1)
  })
})
