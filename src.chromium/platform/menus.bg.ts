import type * as T from 'src/types'
import * as D from 'src/defaults'
import * as Utils from 'src/utils'
import * as Windows from 'src/services/windows.bg'
import * as Snapshots from 'src/services/snapshots.bg'
import { waitForBackgroundReady } from 'src/platform/background-ready'

export const MENU_IDS = {
  openSettings: 'sidebery:open_settings',
  createSnapshot: 'sidebery:create_snapshot',
  reopenParent: 'sidebery:reopen_cached_wins',
  reopenPrefix: 'sidebery:reopen_cached_win:',
} as const

chrome.contextMenus.onClicked.addListener(info => {
  void waitForBackgroundReady().then(() => dispatchMenuClick(String(info.menuItemId)))
})

export async function dispatchMenuClick(id: string): Promise<void> {
  if (id === MENU_IDS.openSettings) {
    browser.runtime.openOptionsPage()
    return
  }
  if (id === MENU_IDS.createSnapshot) {
    await Snapshots.createSnapshot()
    return
  }
  if (!id.startsWith(MENU_IDS.reopenPrefix)) return

  const index = Number(id.slice(MENU_IDS.reopenPrefix.length))
  if (!Number.isSafeInteger(index) || index < 0) return
  const stored = await browser.storage.local.get<T.Stored>('tabsDataCache')
  const cache = stored.tabsDataCache?.[index]
  if (!cache?.length) return

  const items: T.ItemInfo[] = cache.map(cachedTab => ({
    id: cachedTab.id,
    url: Utils.restoreUrl(cachedTab.url),
    title: cachedTab.customTitle ?? cachedTab.url.replace(/^https?:\/\//, ''),
    parentId: cachedTab.parentId ?? D.NOID,
    panelId: cachedTab.panelId ?? D.NOID,
    pinned: !!cachedTab.pin,
    customColor: cachedTab.customColor,
    customTitle: cachedTab.customTitle,
    folded: !!cachedTab.folded,
  }))
  if (items[0]) items[0].active = true
  await Windows.createWithTabs(items)
}
