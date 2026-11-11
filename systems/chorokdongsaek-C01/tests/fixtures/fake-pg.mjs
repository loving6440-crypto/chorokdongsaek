// 파일 기반 가짜 pg (테스트 전용). FAKE_PG_FILE 에 saves 행을, FAKE_PG_LOG 에 실행된 SQL 을 한 줄씩 남긴다.
import fs from 'node:fs'

const FILE = process.env.FAKE_PG_FILE
const LOG = process.env.FAKE_PG_LOG
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return {} } }
const save = (rows) => fs.writeFileSync(FILE, JSON.stringify(rows))
const log = (sql, params) => { if (LOG) fs.appendFileSync(LOG, JSON.stringify({ sql: sql.replace(/\s+/g, ' ').trim(), ids: params.filter((p, i) => typeof p === 'string' && (i % 2 === 0 || params.length === 1)).slice(0, 20), bytes: JSON.stringify(params).length }) + '\n') }

async function query(sql, params = []) {
  log(sql, params)
  const s = sql.replace(/\s+/g, ' ').trim()
  const rows = load()
  if (/^select 1$/i.test(s)) return { rows: [{ '?column?': 1 }] }
  if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(s) || /pg_advisory_xact_lock/i.test(s)) return { rows: [] }
  if (/^select data from saves where id ?= ?\$1( for update)?$/i.test(s)) {
    const r = rows[params[0]]
    return { rows: r ? [{ data: structuredClone(r.data) }] : [] }
  }
  if (/^select id, data from saves where id like \$1$/i.test(s)) {
    const prefix = String(params[0]).replace(/%$/, '')
    return { rows: Object.entries(rows).filter(([id]) => id.startsWith(prefix)).map(([id, r]) => ({ id, data: structuredClone(r.data) })) }
  }
  if (/^SELECT data->>'id' AS id/i.test(s)) {
    const r = rows[params[0]]
    return { rows: r ? [{ id: r.data.id, version: r.data.sessionVersion == null ? null : String(r.data.sessionVersion), reset: r.data.mustReset == null ? null : String(r.data.mustReset) }] : [] }
  }
  if (/^insert into saves/i.test(s)) {
    const doNothing = /do nothing/i.test(s)
    for (let i = 0; i + 1 < params.length; i += 2) {
      if (doNothing && rows[params[i]]) continue
      rows[params[i]] = { data: typeof params[i + 1] === 'string' ? JSON.parse(params[i + 1]) : params[i + 1], updatedAt: Date.now() }
    }
    save(rows)
    return { rows: [] }
  }
  if (/^delete from saves where id ?= ?\$1$/i.test(s)) { delete rows[params[0]]; save(rows); return { rows: [] } }
  if (/^delete from saves where id like \$1 and updated_at < now\(\) - \(\$2::integer \* interval '1 second'\)$/i.test(s)) {
    const prefix = String(params[0]).replace(/%$/, '')
    const cutoff = Date.now() - Number(params[1]) * 1000
    let rowCount = 0
    for (const [id, r] of Object.entries(rows)) if (id.startsWith(prefix) && (r.updatedAt ?? 0) < cutoff) { delete rows[id]; rowCount++ }
    save(rows)
    return { rows: [], rowCount }
  }
  if (/data->>'twitterNorm'/i.test(s)) return { rows: Object.entries(rows).filter(([id, r]) => id.startsWith('account:') && r.data.twitterNorm === params[0]).map(([, r]) => ({ id: r.data.id })) }
  throw new Error('fake-pg: unsupported SQL: ' + s)
}

class Pool {
  constructor(opts = {}) { this.opts = opts; if (process.env.FAKE_PG_OPTS_LOG) fs.writeFileSync(process.env.FAKE_PG_OPTS_LOG, JSON.stringify({ ssl: opts.ssl ?? null, max: opts.max })) }
  query(sql, params) { return query(sql, params) }
  async connect() { return { query, release() {} } }
  on() {}
  async end() {}
}
export default { Pool }
