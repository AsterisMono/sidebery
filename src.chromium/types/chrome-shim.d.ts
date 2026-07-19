/**
 * Minimal Chrome API declarations used by the Chromium platform shim.
 *
 * Keep these declarations deliberately narrower than `@types/chrome`: the
 * upstream tree has its own WebExtension declarations in `web-ext.d.ts`, and
 * installing the full Chrome types would make the two ambient API surfaces
 * conflict.
 */

interface ChromiumEvent<T extends (...args: any[]) => any> {
  addListener(listener: T): void
  removeListener(listener: T): void
  hasListener(listener: T): boolean
}

type ChromiumTabsApi = Omit<typeof browser.tabs, 'onUpdated'> & {
  onUpdated: ChromiumEvent<browser.tabs.UpdatedListener>
}
type ChromiumWindowsApi = typeof browser.windows

interface ChromiumExtensionContext {
  contextId: string
  contextType: 'TAB' | 'POPUP' | 'BACKGROUND' | 'OFFSCREEN_DOCUMENT' | 'SIDE_PANEL'
  documentId?: string
  documentOrigin?: string
  documentUrl?: string
  frameId: number
  incognito: boolean
  tabId: number
  windowId: number
}

interface ChromiumContextFilter {
  contextIds?: string[]
  contextTypes?: ChromiumExtensionContext['contextType'][]
  documentIds?: string[]
  documentOrigins?: string[]
  documentUrls?: string[]
  frameIds?: number[]
  incognito?: boolean
  tabIds?: number[]
  windowIds?: number[]
}

type ChromiumRuntimeApi = Omit<typeof browser.runtime, 'getBrowserInfo'> & {
  getContexts(filter: ChromiumContextFilter): Promise<ChromiumExtensionContext[]>
}

type ChromiumStorageArea = browser.storage.StorageArea & {
  get<S>(props: null): Promise<S>
}

interface ChromiumStorageApi {
  local: ChromiumStorageArea
  managed: ChromiumStorageArea
  session: ChromiumStorageArea
  sync: ChromiumStorageArea
  onChanged: typeof browser.storage.onChanged
}

type ChromiumMenuCreateProperties = Omit<
  browser.menus.CreateProperties,
  'icons' | 'onclick' | 'viewTypes'
>

interface ChromiumContextMenusApi {
  create(props: ChromiumMenuCreateProperties): string | number
  remove(id: string | number): Promise<void>
  removeAll(): Promise<void>
  update(id: string | number, props: Partial<ChromiumMenuCreateProperties>): Promise<void>
  onClicked: ChromiumEvent<(info: { menuItemId: string | number }, tab?: browser.tabs.Tab) => void>
}

interface ChromiumSidePanelApi {
  open(options: { tabId?: number; windowId?: number }): Promise<void>
  close(options: { tabId?: number; windowId?: number }): Promise<void>
  setPanelBehavior(options: { openPanelOnActionClick?: boolean }): Promise<void>
  onOpened: ChromiumEvent<(info: { path: string; tabId?: number; windowId: number }) => void>
  onClosed: ChromiumEvent<(info: { path: string; tabId?: number; windowId: number }) => void>
}

interface ChromiumInjectionTarget {
  tabId: number
  allFrames?: boolean
  frameIds?: number[]
}

interface ChromiumScriptInjection {
  target: ChromiumInjectionTarget
  files?: string[]
  func?: (...args: any[]) => any
  args?: any[]
  injectImmediately?: boolean
}

interface ChromiumInjectionResult<T = any> {
  documentId?: string
  frameId: number
  result?: T
}

interface ChromiumScriptingApi {
  executeScript<T = any>(injection: ChromiumScriptInjection): Promise<ChromiumInjectionResult<T>[]>
}

interface ChromiumSearchQuery {
  text: string
  tabId?: number
  disposition?: 'CURRENT_TAB' | 'NEW_TAB' | 'NEW_WINDOW'
}

interface ChromiumSearchApi {
  query(query: ChromiumSearchQuery): Promise<void>
}

interface ChromiumAlarm {
  name: string
  scheduledTime: number
  periodInMinutes?: number
  persistAcrossSessions?: boolean
}

interface ChromiumAlarmsApi {
  create(name: string, info: object): Promise<void>
  get(name: string): Promise<ChromiumAlarm | undefined>
  clear(name: string): Promise<boolean>
  onAlarm: ChromiumEvent<(alarm: ChromiumAlarm) => void>
}

interface ChromiumNotificationsApi {
  create(id: string, options: object): Promise<string>
  clear(id: string): Promise<boolean>
}

interface ChromiumSessionsApi {
  getRecentlyClosed(filter?: browser.sessions.Filter): Promise<browser.sessions.Session[]>
  restore(sessionId: string): Promise<browser.sessions.Session>
  onChanged: typeof browser.sessions.onChanged
}

interface ChromiumApi {
  tabs: ChromiumTabsApi
  windows: ChromiumWindowsApi
  runtime: ChromiumRuntimeApi
  storage: ChromiumStorageApi
  contextMenus: ChromiumContextMenusApi
  sidePanel: ChromiumSidePanelApi
  scripting: ChromiumScriptingApi
  search: ChromiumSearchApi
  alarms: ChromiumAlarmsApi
  action: typeof browser.browserAction
  commands: typeof browser.commands
  sessions: ChromiumSessionsApi
  bookmarks: typeof browser.bookmarks
  history: typeof browser.history
  downloads: typeof browser.downloads
  permissions: typeof browser.permissions
  omnibox: typeof browser.omnibox
  i18n: typeof browser.i18n
  extension: typeof browser.extension
  notifications: ChromiumNotificationsApi
}

declare const chrome: ChromiumApi

declare namespace browser.tabs {
  type ReplacedListener = (addedTabId: ID, removedTabId: ID) => void
  const onReplaced: ChromiumEvent<ReplacedListener>
}

declare namespace browser.sessions {
  function removeTabValue(tabId: ID, key: string): Promise<void>
  function removeWindowValue(windowId: ID, key: string): Promise<void>
}

declare namespace browser.sidebarAction {
  interface OpenDetails {
    windowId?: ID
  }

  function open(details?: OpenDetails): Promise<void>
  function close(details?: OpenDetails): Promise<void>
  function toggle(details?: OpenDetails): Promise<void>
  function getTitle(): Promise<string>
}
