#!/usr/bin/env node
// B10: 기존 계정/장터/판매대금 읽기 전용 감사. 어떠한 서버 데이터도 변경하지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { ITEMS } from '../src/game/items.js'
import { auditLegacyEconomy } from '../server/economyAudit.js'

const readJson = (name) => JSON.parse(fs.readFileSync(name, 'utf8'))
async function load() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 1 })
    try {
      // v-B.15: 공용 기록은 'server'(백업용 통짜 행) 위에 'server:market' 등 영역별 행이 덮어쓴다.
      const rows = await pool.query("SELECT id, data FROM saves WHERE id LIKE 'account:%' OR id = 'server' OR id = 'server:market'")
      return {
        accounts: rows.rows.filter((r) => r.id.startsWith('account:')).map((r) => r.data),
        snapshot: { ...(rows.rows.find((r) => r.id === 'server')?.data ?? {}), ...(rows.rows.find((r) => r.id === 'server:market')?.data ?? {}) },
      }
    } finally { await pool.end() }
  }
  const accountsPath = process.env.CHOROK_ACCOUNTS || path.join(process.cwd(), 'server/accounts.json')
  const serverPath = process.env.CHOROK_DATA || path.join(process.cwd(), 'server/data.json')
  const local = readJson(accountsPath)
  let snapshot = {}
  try { snapshot = readJson(serverPath) } catch (error) { if (error.code !== 'ENOENT') throw error }
  return { accounts: Object.values(local.accounts ?? {}), snapshot }
}

try {
  const input = await load()
  const audit = auditLegacyEconomy({ ...input, itemIds: ITEMS.map((it) => it.id) })
  // 결과에 계정 id 등의 비공개 데이터가 들어갈 수 있으므로 공개 로그/저장소에 업로드하지 않는다.
  console.log(JSON.stringify(audit, null, 2))
  if (audit.counts.issues) process.exitCode = 2
} catch (error) {
  console.error('읽기 전용 이전 점검 실패:', error.message)
  process.exitCode = 1
}
