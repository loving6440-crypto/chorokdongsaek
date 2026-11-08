/** 기존 경제 데이터의 읽기 전용 무결성 사전 점검. 이 결과로 재화를 검증된 것으로 승격하지 않는다. */
export function auditLegacyEconomy({ accounts, snapshot, itemIds }) {
  const known = new Set(itemIds)
  const records = Array.isArray(accounts) ? accounts : []
  const listings = Array.isArray(snapshot?.market?.listings) ? snapshot.market.listings : []
  const proceeds = snapshot?.market?.proceeds ?? {}
  const issues = []
  const impacted = new Set()
  const accountIds = new Set(records.map((a) => a?.id).filter(Boolean))
  let totalPlayerMoney = 0
  let positiveInventoryItems = 0
  for (const acc of records) {
    if (!acc?.id) continue
    const profiles = [
      { slot: 'main', save: acc.save },
      ...Object.entries(acc.profiles ?? {}).map(([slot, save]) => ({ slot, save })),
    ]
    for (const { slot, save } of profiles) {
      const p = save?.player
      if (!p) continue
      if (!Number.isSafeInteger(p.money) || p.money < 0) {
        issues.push({ code: 'invalid-player-money', id: acc.id, slot })
        impacted.add(acc.id)
      } else totalPlayerMoney += p.money
      if (p.inventory && (typeof p.inventory !== 'object' || Array.isArray(p.inventory))) {
        issues.push({ code: 'invalid-inventory-shape', id: acc.id, slot })
        impacted.add(acc.id)
      } else for (const [item, qty] of Object.entries(p.inventory ?? {})) {
        if (!known.has(item) && !/^w-[a-z]+#[a-z0-9]{4,12}$/.test(item)) {
          issues.push({ code: 'unknown-item', id: acc.id, slot, item })
          impacted.add(acc.id)
        }
        if (!Number.isSafeInteger(qty) || qty < 0) {
          issues.push({ code: 'invalid-item-quantity', id: acc.id, slot, item })
          impacted.add(acc.id)
        } else positiveInventoryItems += qty
      }
    }
  }
  const listingIds = new Set()
  let listedItems = 0
  for (const l of listings) {
    if (listingIds.has(l.id)) issues.push({ code: 'duplicate-listing-id', listing: l.id })
    listingIds.add(l.id)
    if (!accountIds.has(l.seller)) issues.push({ code: 'unknown-listing-seller', listing: l.id, seller: l.seller })
    if (!known.has(l.item) || !Number.isSafeInteger(l.qty) || l.qty < 1 || !Number.isSafeInteger(l.price) || l.price < 1) {
      issues.push({ code: 'invalid-listing', listing: l.id })
    } else listedItems += l.qty
  }
  let unclaimedProceeds = 0
  for (const [seller, amount] of Object.entries(proceeds)) {
    if (!accountIds.has(seller)) issues.push({ code: 'unknown-proceeds-owner', seller })
    if (!Number.isSafeInteger(amount) || amount < 0) issues.push({ code: 'invalid-proceeds', seller })
    else unclaimedProceeds += amount
  }
  return {
    schema: 'B10-legacy-economy-audit-v1',
    safeToAutoMigrate: false,
    note: '과거의 브라우저 저장값과 장터 거래는 플레이 기록으로 검증되지 않았다. 운영자가 검수하기 전까지 신뢰 장부로 자동 이전하면 안 된다.',
    counts: { accounts: accountIds.size, listings: listings.length, listedItems, positiveInventoryItems, totalPlayerMoney, unclaimedProceeds, issues: issues.length, impactedAccounts: impacted.size },
    issues,
  }
}
