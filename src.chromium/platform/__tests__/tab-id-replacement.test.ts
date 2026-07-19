import { describe, expect, test } from 'vitest'
import { replaceId, replaceTabId } from 'src/platform/tab-id-replacement'

describe('Chromium replacement tab ids', () => {
  test('migrates the tab and all direct tab references', () => {
    const replaced = { id: 7, parentId: -1 }
    const child = {
      id: 8,
      parentId: 7,
      openerTabId: 7,
      relGroupId: 7,
      successorTabId: 7,
      reopening: { id: 7 },
      urgentTabIds: new Set([7]),
    }
    const byId = { 7: replaced, 8: child }

    expect(replaceTabId(byId, [replaced, child], 70, 7)).toBe(replaced)
    expect(byId[7]).toBeUndefined()
    expect(byId[70]).toBe(replaced)
    expect(replaced.id).toBe(70)
    expect(child).toMatchObject({
      parentId: 70,
      openerTabId: 70,
      relGroupId: 70,
      successorTabId: 70,
      reopening: { id: 70 },
    })
    expect(child.urgentTabIds).toEqual(new Set([70]))
  })

  test('does not overwrite an existing added id', () => {
    const removed = { id: 7 }
    const added = { id: 70 }
    const byId = { 7: removed, 70: added }

    expect(replaceTabId(byId, [removed, added], 70, 7)).toBeUndefined()
    expect(byId).toEqual({ 7: removed, 70: added })
  })

  test('replaces ids in derived arrays', () => {
    const ids = [1, 7, 3, 7]
    replaceId(ids, 7, 70)
    expect(ids).toEqual([1, 70, 3, 70])
  })
})
