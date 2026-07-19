import type * as T from 'src/types'
import * as D from 'src/defaults'
import * as Utils from 'src/utils'

function canonicalUrl(url?: string): string {
  if (!url || url === 'about:newtab' || url === 'chrome://newtab/') return 'newtab:'
  return Utils.restoreUrl(url) ?? url
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
