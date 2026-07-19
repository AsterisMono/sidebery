import { translate } from 'src/dict'
import * as TabsBg from 'src/services/tabs.bg'
import { MENU_IDS } from 'src/platform/menus.bg'

export function createBrowserActionMenu(): void {
  void Promise.resolve(browser.menus.removeAll()).then(() => {
    createSettingsMenu()
    TabsBg.createOpenFromCacheMenu()
  })
}

export function createSettingsMenu(): void {
  browser.menus.create({
    id: MENU_IDS.openSettings,
    title: translate('menu.browserAction.open_settings'),
    contexts: ['action' as browser.menus.ContextType],
  })
  browser.menus.create({
    id: MENU_IDS.createSnapshot,
    title: translate('menu.browserAction.create_snapshot'),
    contexts: ['action' as browser.menus.ContextType],
  })
}

export function setupListeners(): void {}
export function resetListeners(): void {}
