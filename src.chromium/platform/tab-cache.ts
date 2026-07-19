import type * as T from 'src/types'
import * as D from 'src/defaults'
import * as Utils from 'src/utils'

function canonicalUrl(url?: string): string {
  if (!url || url === 'about:newtab' || url === 'chrome://newtab/') return 'newtab:'
  return Utils.restoreUrl(url) ?? url
}

export interface ChromiumRestoreTab {
  id: ID
  url?: string
  pendingUrl?: string
  status?: string
  pinned: boolean
}

function liveUrl(tab: ChromiumRestoreTab): string | undefined {
  return tab.pendingUrl || tab.url || undefined
}

function canRestoreFrom(live: ChromiumRestoreTab, cached: T.TabCache): boolean {
  if (live.pinned !== !!cached.pin) return false
  const url = liveUrl(live)
  if (!url && (live.status === 'loading' || live.status === 'unloaded')) return true
  return canonicalUrl(url) === canonicalUrl(cached.url)
}

function alignRestoreCache(
  live: readonly ChromiumRestoreTab[],
  cached: readonly T.TabCache[]
): { score: number; cacheByLiveId: Record<ID, T.TabCache> } {
  const scores = Array.from({ length: live.length + 1 }, () =>
    Array<number>(cached.length + 1).fill(0)
  )
  for (let i = live.length - 1; i >= 0; i--) {
    for (let j = cached.length - 1; j >= 0; j--) {
      const skipLive = scores[i + 1]?.[j] ?? 0
      const skipCached = scores[i]?.[j + 1] ?? 0
      const pair = canRestoreFrom(live[i]!, cached[j]!) ? 1 + (scores[i + 1]?.[j + 1] ?? 0) : 0
      scores[i]![j] = Math.max(skipLive, skipCached, pair)
    }
  }

  const cacheByLiveId: Record<ID, T.TabCache> = {}
  let i = 0
  let j = 0
  while (i < live.length && j < cached.length) {
    const tab = live[i]!
    const data = cached[j]!
    const pairScore = canRestoreFrom(tab, data) ? 1 + (scores[i + 1]?.[j + 1] ?? 0) : -1
    if (pairScore === scores[i]?.[j]) {
      cacheByLiveId[tab.id] = data
      i++
      j++
    } else if ((scores[i + 1]?.[j] ?? 0) >= (scores[i]?.[j + 1] ?? 0)) {
      i++
    } else {
      j++
    }
  }
  return { score: scores[0]?.[0] ?? 0, cacheByLiveId }
}

/** Match a browser-restarted Chromium window to exactly one stored window cache. */
export function findCachedDataForLiveTabs(
  live: readonly ChromiumRestoreTab[],
  stored: readonly T.TabCache[][],
  uniqWinId?: ID
): Record<ID, T.TabCache> | undefined {
  if (live.length <= 1) return

  let candidates = stored
  if (uniqWinId !== undefined && uniqWinId !== D.NOID) {
    const sameWindow = stored.filter(cache => cache[0]?.uniqWinId === uniqWinId)
    if (sameWindow.length) candidates = sameWindow
  }

  let best: ReturnType<typeof alignRestoreCache> | undefined
  let tied = false
  for (const cached of candidates) {
    const aligned = alignRestoreCache(live, cached)
    if (aligned.score !== Math.min(live.length, cached.length)) continue
    if (!best || aligned.score > best.score) {
      best = aligned
      tied = false
    } else if (aligned.score === best.score) {
      tied = true
    }
  }
  return best && !tied ? best.cacheByLiveId : undefined
}

/** Recover a window identity only when one local cache is an unambiguous match. */
export function findUniqWinIdForLiveTabs(
  live: readonly ChromiumRestoreTab[],
  stored: readonly T.TabCache[][]
): ID | undefined {
  const matches = stored.filter(cache => {
    const uniqWinId = cache[0]?.uniqWinId
    if (uniqWinId === undefined || uniqWinId === D.NOID) return false
    return !!findCachedDataForLiveTabs(live, [cache])
  })
  return matches.length === 1 ? matches[0]?.[0]?.uniqWinId : undefined
}

function sameSignature(a: readonly T.TabCache[], b: readonly T.TabCache[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i]
    const right = b[i]
    if (!left || !right) return false
    if (canonicalUrl(left.url) !== canonicalUrl(right.url)) return false
    if (!!left.pin !== !!right.pin) return false
  }
  return true
}

function countSharedIds(a: readonly T.TabCache[], b: readonly T.TabCache[]): number {
  const ids = new Set(a.map(tab => tab.id))
  let count = 0
  for (const tab of b) if (ids.has(tab.id)) count++
  return count
}

/** Find the one stored window cache represented by an incoming sidebar cache. */
export function findTabsDataCacheIndex(
  stored: readonly T.TabCache[][],
  incoming: readonly T.TabCache[]
): number {
  if (!incoming.length) return -1

  const uniqWinId = incoming[0]?.uniqWinId
  if (uniqWinId !== undefined && uniqWinId !== D.NOID) {
    const matches = stored
      .map((tabs, index) => ({ index, uniqWinId: tabs[0]?.uniqWinId }))
      .filter(candidate => candidate.uniqWinId === uniqWinId)
    if (matches.length === 1) return matches[0]?.index ?? -1
  }

  let bestIdIndex = -1
  let bestIdCount = 0
  let bestIdCountIsUnique = true
  for (let i = 0; i < stored.length; i++) {
    const count = countSharedIds(stored[i] ?? [], incoming)
    if (count > bestIdCount) {
      bestIdIndex = i
      bestIdCount = count
      bestIdCountIsUnique = true
    } else if (count > 0 && count === bestIdCount) {
      bestIdCountIsUnique = false
    }
  }
  if (bestIdCount > 0 && bestIdCountIsUnique) return bestIdIndex

  const signatureMatches: number[] = []
  for (let i = 0; i < stored.length; i++) {
    if (sameSignature(stored[i] ?? [], incoming)) signatureMatches.push(i)
  }
  return signatureMatches.length === 1 ? (signatureMatches[0] ?? -1) : -1
}

/** Replace one window without dropping caches belonging to other windows. */
export function mergeTabsDataCache(
  stored: readonly T.TabCache[][] | undefined,
  incoming: T.TabCache[]
): T.TabCache[][] {
  const result = stored ? [...stored] : []
  const index = findTabsDataCacheIndex(result, incoming)
  if (index === -1) result.push(incoming)
  else result[index] = incoming
  return result
}

export function removeTabsDataCache(
  stored: readonly T.TabCache[][] | undefined,
  removed: readonly T.TabCache[] | undefined
): T.TabCache[][] {
  const result = stored ? [...stored] : []
  if (!removed?.length) return result
  const index = findTabsDataCacheIndex(result, removed)
  if (index !== -1) result.splice(index, 1)
  return result
}
