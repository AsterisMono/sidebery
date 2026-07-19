import { describe, expect, test } from 'vitest'
import type * as T from 'src/types'
import * as Utils from 'src/utils'
import {
  findCachedDataForLiveTabs,
  findUniqWinIdForLiveTabs,
  mergeTabsDataCache,
  type ChromiumRestoreTab,
} from '../tab-cache'

const cache = (id: ID, url: string, extra?: Partial<T.TabCache>): T.TabCache => ({
  id,
  url,
  ...extra,
})

const live = (
  id: ID,
  url: string | undefined,
  extra?: Partial<ChromiumRestoreTab>
): ChromiumRestoreTab => ({ id, url, pinned: false, status: 'complete', ...extra })

describe('Chromium restart cache matching', () => {
  test('uses pendingUrl for an unloaded session-restored tab', () => {
    const stored = [[cache(1, 'https://a.example/'), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [
        live(101, '', { status: 'unloaded', pendingUrl: 'https://a.example/' }),
        live(102, '', { status: 'unloaded', pendingUrl: 'https://b.example/' }),
      ],
      stored
    )
    expect(result?.[101]).toBe(stored[0]?.[0])
    expect(result?.[102]).toBe(stored[0]?.[1])
  })

  test('accepts an unloaded URL blind spot while preserving pinned state', () => {
    const stored = [[cache(1, 'https://a.example/', { pin: true }), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [live(101, '', { status: 'unloaded', pinned: true }), live(102, 'https://b.example/')],
      stored
    )
    expect(Object.keys(result ?? {})).toEqual(['101', '102'])
  })

  test('normalizes Chromium and Firefox new-tab URLs', () => {
    const stored = [[cache(1, 'about:newtab'), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [live(101, 'chrome://newtab/'), live(102, 'https://b.example/')],
      stored
    )
    expect(result?.[101]).toBe(stored[0]?.[0])
  })

  test('matches a discarded placeholder by its target URL', () => {
    const target = 'https://discarded.example/path'
    const placeholder = Utils.createPlaceholderUrl({ url: target, title: 'Discarded' })
    const stored = [[cache(1, target), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [live(101, placeholder), live(102, 'https://b.example/')],
      stored
    )
    expect(result?.[101]).toBe(stored[0]?.[0])
  })

  test('does not restore cache across a pinned-state mismatch', () => {
    const stored = [[cache(1, 'https://a.example/', { pin: true }), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [live(101, 'https://a.example/'), live(102, 'https://b.example/')],
      stored
    )
    expect(result).toBeUndefined()
  })

  test('uses uniqWinId before identical URL signatures', () => {
    const first = [
      cache(1, 'https://same.example/', { uniqWinId: 11 }),
      cache(2, 'https://same-2.example/'),
    ]
    const second = [
      cache(3, 'https://same.example/', { uniqWinId: 22 }),
      cache(4, 'https://same-2.example/'),
    ]
    const result = findCachedDataForLiveTabs(
      [live(101, 'https://same.example/'), live(102, 'https://same-2.example/')],
      [first, second],
      22
    )
    expect(result?.[101]).toBe(second[0])
  })

  test('supports one inserted live tab without shifting cached relations', () => {
    const stored = [[cache(1, 'https://a.example/'), cache(2, 'https://b.example/')]]
    const result = findCachedDataForLiveTabs(
      [
        live(101, 'https://a.example/'),
        live(999, 'https://inserted.example/'),
        live(102, 'https://b.example/'),
      ],
      stored
    )
    expect(result?.[101]).toBe(stored[0]?.[0])
    expect(result?.[999]).toBeUndefined()
    expect(result?.[102]).toBe(stored[0]?.[1])
  })
})

test('canonical cache merge preserves unrelated windows', () => {
  const first = [cache(1, 'https://a.example/', { uniqWinId: 11 })]
  const second = [cache(2, 'https://b.example/', { uniqWinId: 22 })]
  const updated = [cache(101, 'https://a.example/new', { uniqWinId: 11 })]
  expect(mergeTabsDataCache([first, second], updated)).toEqual([updated, second])
})

test('best-effort window identity requires an unambiguous local cache match', () => {
  const first = [cache(1, 'https://a.example/', { uniqWinId: 11 }), cache(2, 'https://b.example/')]
  const liveTabs = [live(101, 'https://a.example/'), live(102, 'https://b.example/')]
  expect(findUniqWinIdForLiveTabs(liveTabs, [first])).toBe(11)
  expect(findUniqWinIdForLiveTabs(liveTabs, [first, structuredClone(first)])).toBeUndefined()
})
