// tests/helpers/fakeSupabase.js
// Minimal chainable stand-in for the supabase-js client. Each from(table)
// call builds a ctx describing the query; awaiting the chain resolves
// handler(ctx), which the test configures per table/op.
//
// ctx: { table, op: 'select'|'insert'|'upsert'|'update', payload, opts,
//        mode: 'many'|'maybeSingle'|'single', calls: [[method, args], ...] }

export function makeFakeSupabase(handler) {
  return {
    from(table) {
      const ctx = { table, op: 'select', payload: undefined, opts: undefined, mode: 'many', calls: [] }
      const q = {}
      for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit']) {
        q[m] = (...args) => { ctx.calls.push([m, args]); return q }
      }
      q.insert = (payload) => { ctx.op = 'insert'; ctx.payload = payload; return q }
      q.upsert = (payload, opts) => { ctx.op = 'upsert'; ctx.payload = payload; ctx.opts = opts; return q }
      q.update = (payload) => { ctx.op = 'update'; ctx.payload = payload; return q }
      q.maybeSingle = () => { ctx.mode = 'maybeSingle'; return q }
      q.single = () => { ctx.mode = 'single'; return q }
      q.then = (onFulfilled, onRejected) =>
        Promise.resolve().then(() => handler(ctx)).then(onFulfilled, onRejected)
      return q
    },
  }
}
