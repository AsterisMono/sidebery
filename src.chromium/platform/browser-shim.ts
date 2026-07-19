/* eslint no-console: off */

/**
 * Chromium compatibility layer for Sidebery's Firefox-style `browser` global.
 * Complex adapters are intentionally left as loud placeholders for Plans 5 and 8.
 */

type AnyFunction = (...args: any[]) => any

const inertEvent = {
  addListener(_listener: AnyFunction): void {},
  removeListener(_listener: AnyFunction): void {},
  hasListener(_listener: AnyFunction): boolean {
    return false
  },
}

function pendingAdapter(api: string): (...args: any[]) => Promise<never> {
  return async () => {
    throw new Error(`browser.${api} is not yet shimmed for Chromium`)
  }
}

function warnSidebarAction(method: string): void {
  console.warn(`browser.sidebarAction.${method}() is not yet shimmed for Chromium`)
}

const nativeTabsOnUpdated = chrome.tabs.onUpdated
const tabsOnUpdatedWrappers = new Map<
  browser.tabs.UpdatedListener,
  browser.tabs.UpdatedListener
>()

const tabsOnUpdated = {
  addListener(
    listener: browser.tabs.UpdatedListener,
    filter?: browser.tabs.ExtraParameters
  ): void {
    const previousWrapper = tabsOnUpdatedWrappers.get(listener)
    if (previousWrapper) {
      nativeTabsOnUpdated.removeListener(previousWrapper)
      tabsOnUpdatedWrappers.delete(listener)
    }
    nativeTabsOnUpdated.removeListener(listener)

    const hasFilter =
      filter?.tabId !== undefined ||
      filter?.windowId !== undefined ||
      (filter?.properties !== undefined && filter.properties.length > 0)
    if (!hasFilter) {
      nativeTabsOnUpdated.addListener(listener)
      return
    }

    const wrapper: browser.tabs.UpdatedListener = (tabId, changeInfo, tab) => {
      if (filter.tabId !== undefined && tabId !== filter.tabId) return
      if (filter.windowId !== undefined && tab.windowId !== filter.windowId) return
      if (
        filter.properties?.length &&
        !filter.properties.some(property =>
          Object.prototype.hasOwnProperty.call(changeInfo, property)
        )
      ) {
        return
      }
      listener(tabId, changeInfo, tab)
    }

    tabsOnUpdatedWrappers.set(listener, wrapper)
    nativeTabsOnUpdated.addListener(wrapper)
  },
  removeListener(listener: browser.tabs.UpdatedListener): void {
    nativeTabsOnUpdated.removeListener(listener)
    const wrapper = tabsOnUpdatedWrappers.get(listener)
    if (!wrapper) return
    nativeTabsOnUpdated.removeListener(wrapper)
    tabsOnUpdatedWrappers.delete(listener)
  },
  hasListener(listener: browser.tabs.UpdatedListener): boolean {
    if (nativeTabsOnUpdated.hasListener(listener)) return true
    const wrapper = tabsOnUpdatedWrappers.get(listener)
    return wrapper !== undefined && nativeTabsOnUpdated.hasListener(wrapper)
  },
}

const tabs = {
  ...chrome.tabs,
  onUpdated: tabsOnUpdated,

  // TODO(Plan 5): translate this to chrome.scripting.executeScript().
  executeScript: pendingAdapter('tabs.executeScript'),

  // Chromium selects successor tabs natively.
  moveInSuccession: async (): Promise<void> => {},

  // These Firefox APIs are feature-checked by their remaining callers.
  captureTab: undefined,
  hide: undefined,
  show: undefined,
}

const windows = {
  ...chrome.windows,
  async update(
    windowId: ID,
    details: browser.windows.UpdateInfo
  ): Promise<browser.windows.Window> {
    const { titlePreface: _titlePreface, ...chromiumDetails } = details
    return chrome.windows.update(windowId, chromiumDetails)
  },
  async create(details: browser.windows.CreateData): Promise<browser.windows.Window> {
    const {
      titlePreface: _titlePreface,
      allowScriptsToClose: _allowScriptsToClose,
      cookieStoreId: _cookieStoreId,
      ...chromiumDetails
    } = details
    return chrome.windows.create(chromiumDetails)
  },
}

const runtime = {
  ...chrome.runtime,
  async getBrowserInfo(): Promise<browser.runtime.BrowserInfo> {
    const version = /(?:Chrome|Chromium)\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? '0'
    return { name: 'Chromium', vendor: '', version, buildID: '' }
  },
}

const storage = {
  ...chrome.storage,
  local: chrome.storage.local,
  managed: chrome.storage.managed,
  session: chrome.storage.session,
  sync: undefined,
}

const menus = {
  ...chrome.contextMenus,
  create(details: browser.menus.CreateProperties): string | number {
    if (details.onclick) {
      throw new Error(
        'browser.menus.create({ onclick }) is unavailable in MV3 service workers; ' +
          'register the item through the Chromium contextMenus.onClicked dispatcher (Plan 15)'
      )
    }

    const {
      icons: _icons,
      onclick: _onclick,
      viewTypes: _viewTypes,
      ...chromiumDetails
    } = details
    return chrome.contextMenus.create(chromiumDetails)
  },
  overrideContext(): void {},
  onHidden: inertEvent,
}

const sessions = {
  ...chrome.sessions,
  getRecentlyClosed: chrome.sessions.getRecentlyClosed,
  restore: chrome.sessions.restore,

  // TODO(Plan 5): emulate per-tab/window values with chrome.storage.session.
  setTabValue: pendingAdapter('sessions.setTabValue'),
  getTabValue: pendingAdapter('sessions.getTabValue'),
  setWindowValue: pendingAdapter('sessions.setWindowValue'),
  getWindowValue: pendingAdapter('sessions.getWindowValue'),
}

const commands = {
  getAll: (): Promise<browser.commands.Command[]> => chrome.commands.getAll(),
  onCommand: chrome.commands.onCommand,
  update: undefined,
  reset: undefined,
}

const theme = {
  getCurrent: async (): Promise<browser.theme.Theme> => ({}),
  onUpdated: inertEvent,
}

const pageAction = {
  setTitle(_details: browser.pageAction.SetTitleDetails): void {},
  show: async (_tabId: ID): Promise<void> => {},
  hide: async (_tabId: ID): Promise<void> => {},
}

const sidebarAction = {
  // TODO(Plan 8): translate these methods to chrome.sidePanel.
  async open(): Promise<void> {
    warnSidebarAction('open')
  },
  async close(): Promise<void> {
    warnSidebarAction('close')
  },
  async toggle(): Promise<void> {
    warnSidebarAction('toggle')
  },
  async isOpen(_details: browser.sidebarAction.IsOpenDetails): Promise<boolean> {
    warnSidebarAction('isOpen')
    return false
  },
  async setTitle(_details: browser.sidebarAction.SetTitleDetails): Promise<void> {
    warnSidebarAction('setTitle')
  },
}

const search = {
  // TODO(Plan 5): map Firefox's {query, ...} to chrome.search.query({text, ...}).
  search: pendingAdapter('search.search'),
}

const browserShim = {
  tabs,
  windows,
  runtime,
  storage,
  bookmarks: chrome.bookmarks,
  history: chrome.history,
  downloads: chrome.downloads,
  permissions: chrome.permissions,
  sessions,
  commands,
  i18n: chrome.i18n,
  extension: chrome.extension,
  notifications: chrome.notifications,
  omnibox: chrome.omnibox,
  search,
  alarms: chrome.alarms,
  browserAction: chrome.action,
  menus,
  theme,
  pageAction,
  sidebarAction,

  contextualIdentities: undefined,
  proxy: undefined,
  webRequest: undefined,
  identity: undefined,
}

;(globalThis as typeof globalThis & { browser: typeof browser }).browser =
  browserShim as unknown as typeof browser

export {}
