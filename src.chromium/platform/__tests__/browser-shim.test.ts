import { beforeEach, describe, expect, test, vi } from 'vitest'

type Listener = (...args: any[]) => any

function createEvent<T extends Listener>() {
  const listeners = new Set<T>()
  return {
    listeners,
    addListener(listener: T): void {
      listeners.add(listener)
    },
    removeListener(listener: T): void {
      listeners.delete(listener)
    },
    hasListener(listener: T): boolean {
      return listeners.has(listener)
    },
    emit(...args: Parameters<T>): void {
      for (const listener of [...listeners]) listener(...args)
    },
  }
}

function createStorageArea() {
  const data: Record<string, unknown> = {}
  return {
    data,
    async get(props?: string | string[] | null): Promise<Record<string, unknown>> {
      if (props === null || props === undefined) return { ...data }
      const keys = Array.isArray(props) ? props : [props]
      const result: Record<string, unknown> = {}
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = data[key]
      }
      return result
    },
    async set(values: Record<string, unknown>): Promise<void> {
      Object.assign(data, values)
    },
    async remove(props: string | string[]): Promise<void> {
      const keys = Array.isArray(props) ? props : [props]
      for (const key of keys) delete data[key]
    },
    async clear(): Promise<void> {
      for (const key of Object.keys(data)) delete data[key]
    },
  }
}

let tabsOnUpdated: ReturnType<typeof createEvent<browser.tabs.UpdatedListener>>
let tabsOnActivated: ReturnType<typeof createEvent<(info: { tabId: ID; windowId: ID }) => void>>
let tabsOnRemoved: ReturnType<typeof createEvent<browser.tabs.RemovedListener>>
let tabsCreate: ReturnType<typeof vi.fn>
let tabsUpdate: ReturnType<typeof vi.fn>
let tabsHighlight: ReturnType<typeof vi.fn>
let windowsOnRemoved: ReturnType<typeof createEvent<(windowId: ID) => void>>
let sessionStorage: ReturnType<typeof createStorageArea>
let scriptingExecute: ReturnType<typeof vi.fn>
let searchQuery: ReturnType<typeof vi.fn>
let sidePanelOpen: ReturnType<typeof vi.fn>
let sidePanelClose: ReturnType<typeof vi.fn>
let runtimeGetContexts: ReturnType<typeof vi.fn>

async function loadShim(): Promise<typeof browser> {
  vi.resetModules()
  delete (globalThis as any).browser

  tabsOnUpdated = createEvent<browser.tabs.UpdatedListener>()
  tabsOnActivated = createEvent<(info: { tabId: ID; windowId: ID }) => void>()
  tabsOnRemoved = createEvent<browser.tabs.RemovedListener>()
  tabsCreate = vi.fn().mockImplementation(async details => ({ id: 99, windowId: 7, ...details }))
  tabsUpdate = vi.fn().mockImplementation(async (id, details) => ({ id, windowId: 7, ...details }))
  tabsHighlight = vi.fn().mockResolvedValue({ id: 7 })
  windowsOnRemoved = createEvent<(windowId: ID) => void>()
  sessionStorage = createStorageArea()
  scriptingExecute = vi.fn().mockResolvedValue([])
  searchQuery = vi.fn().mockResolvedValue(undefined)
  sidePanelOpen = vi.fn().mockResolvedValue(undefined)
  sidePanelClose = vi.fn().mockResolvedValue(undefined)
  runtimeGetContexts = vi.fn().mockResolvedValue([])

  ;(globalThis as any).chrome = {
    tabs: {
      onUpdated: tabsOnUpdated,
      onActivated: tabsOnActivated,
      onRemoved: tabsOnRemoved,
      query: vi.fn().mockResolvedValue([{ id: 10, windowId: 7, active: true }]),
      create: tabsCreate,
      update: tabsUpdate,
      highlight: tabsHighlight,
    },
    windows: {
      WINDOW_ID_CURRENT: -2,
      onRemoved: windowsOnRemoved,
      getCurrent: vi.fn().mockResolvedValue({ id: 42, focused: true, incognito: false }),
      getLastFocused: vi.fn().mockResolvedValue({ id: 77, focused: true, incognito: false }),
      update: vi.fn(),
      create: vi.fn(),
    },
    runtime: {
      getContexts: runtimeGetContexts,
      getManifest: vi.fn().mockReturnValue({ name: 'Sidebery', action: { default_title: 'Tabs' } }),
    },
    storage: {
      local: createStorageArea(),
      managed: createStorageArea(),
      session: sessionStorage,
      sync: createStorageArea(),
    },
    contextMenus: { create: vi.fn() },
    sidePanel: {
      open: sidePanelOpen,
      close: sidePanelClose,
      setPanelBehavior: vi.fn(),
      onOpened: createEvent(),
      onClosed: createEvent(),
    },
    scripting: { executeScript: scriptingExecute },
    search: { query: searchQuery },
    alarms: {},
    action: {},
    commands: { getAll: vi.fn().mockResolvedValue([]), onCommand: createEvent() },
    sessions: {
      getRecentlyClosed: vi.fn().mockResolvedValue([]),
      restore: vi.fn(),
      onChanged: createEvent(),
    },
    bookmarks: {},
    history: {},
    downloads: {},
    permissions: {},
    omnibox: {},
    i18n: {},
    extension: { inIncognitoContext: false },
    notifications: {},
  }

  await import('../browser-shim')
  return (globalThis as any).browser
}

beforeEach(async () => {
  await loadShim()
})

describe('tabs.onUpdated', () => {
  test('filters properties and ids while preserving listener identity', () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, {
      properties: ['title'],
      tabId: 3,
      windowId: 7,
    })

    const tab = { id: 3, windowId: 7 } as browser.tabs.Tab
    tabsOnUpdated.emit(3, { url: 'https://example.com' }, tab)
    tabsOnUpdated.emit(4, { title: 'wrong tab' }, tab)
    tabsOnUpdated.emit(3, { title: 'wrong window' }, { ...tab, windowId: 8 })
    tabsOnUpdated.emit(3, { title: 'matched' }, tab)

    expect(listener).toHaveBeenCalledOnce()
    expect(browser.tabs.onUpdated.hasListener(listener)).toBe(true)

    browser.tabs.onUpdated.removeListener(listener)
    expect(browser.tabs.onUpdated.hasListener(listener)).toBe(false)
    expect(tabsOnUpdated.listeners.size).toBe(0)
  })

  test('replaces a filtered registration with an unfiltered registration', () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, { properties: ['title'] })
    browser.tabs.onUpdated.addListener(listener)

    tabsOnUpdated.emit(
      1,
      { url: 'https://example.com' },
      { id: 1, windowId: 2 } as browser.tabs.Tab
    )

    expect(listener).toHaveBeenCalledOnce()
    expect(tabsOnUpdated.listeners.size).toBe(1)
  })
})

describe('tabs creation and activation semantics', () => {
  test('strips Firefox-only create and update properties', async () => {
    await browser.tabs.create({
      url: 'https://example.com',
      cookieStoreId: 'firefox-default',
      discarded: false,
      title: 'Example',
    })
    expect(tabsCreate).toHaveBeenCalledWith({ url: 'https://example.com' })

    await browser.tabs.update(99, { active: true, loadReplace: true, successorTabId: 10 })
    expect(tabsUpdate).toHaveBeenCalledWith(99, { active: true })

    await browser.tabs.update(99, { openerTabId: 99 })
    expect(tabsUpdate).toHaveBeenLastCalledWith(99, {})

    await browser.tabs.highlight({ windowId: 7, populate: false, tabs: [1, 2] })
    expect(tabsHighlight).toHaveBeenCalledWith({ windowId: 7, tabs: [1, 2] })
    await expect(browser.tabs.warmup(99)).resolves.toBeUndefined()
  })

  test('adds Firefox previousTabId to Chrome activation events', async () => {
    const listener = vi.fn()
    browser.tabs.onActivated.addListener(listener)
    await vi.waitFor(() => expect((chrome.tabs.query as any)).toHaveBeenCalled())

    tabsOnActivated.emit({ tabId: 11, windowId: 7 })
    tabsOnActivated.emit({ tabId: 12, windowId: 7 })
    expect(listener).toHaveBeenNthCalledWith(1, { tabId: 11, windowId: 7, previousTabId: 10 })
    expect(listener).toHaveBeenNthCalledWith(2, { tabId: 12, windowId: 7, previousTabId: 11 })

    tabsOnRemoved.emit(12, { isWindowClosing: false, windowId: 7 })
    tabsOnActivated.emit({ tabId: 13, windowId: 7 })
    expect(listener).toHaveBeenNthCalledWith(3, { tabId: 13, windowId: 7, previousTabId: -1 })
  })
})

test('provides an inert Firefox history title event', () => {
  const listener = vi.fn()
  expect(() => browser.history.onTitleChanged.addListener(listener)).not.toThrow()
})

describe('sessions values', () => {
  test('stores, reads, and removes tab and current-window values', async () => {
    await browser.sessions.setTabValue(9, 'data', { panelId: 3 })
    await browser.sessions.setWindowValue(browser.windows.WINDOW_ID_CURRENT, 'panel', 'tabs')

    expect(sessionStorage.data).toEqual({
      'tv:9:data': { panelId: 3 },
      'wv:42:panel': 'tabs',
    })
    await expect(browser.sessions.getTabValue(9, 'data')).resolves.toEqual({ panelId: 3 })
    await expect(browser.sessions.getWindowValue(42, 'panel')).resolves.toBe('tabs')
    await expect(browser.sessions.getTabValue(9, 'missing')).resolves.toBeUndefined()

    await browser.sessions.removeTabValue(9, 'data')
    await browser.sessions.removeWindowValue(browser.windows.WINDOW_ID_CURRENT, 'panel')
    expect(sessionStorage.data).toEqual({})
  })

  test('cleans only values belonging to removed tabs and windows', async () => {
    await browser.sessions.setTabValue(9, 'a', 1)
    await browser.sessions.setTabValue(10, 'a', 2)
    await browser.sessions.setWindowValue(42, 'a', 3)
    await browser.sessions.setWindowValue(43, 'a', 4)

    tabsOnRemoved.emit(9, { isWindowClosing: false, windowId: 42 })
    windowsOnRemoved.emit(42)
    await vi.waitFor(() => {
      expect(sessionStorage.data).toEqual({ 'tv:10:a': 2, 'wv:43:a': 4 })
    })
  })
})

describe('tabs.executeScript', () => {
  test('normalizes file injections and maps frame results', async () => {
    scriptingExecute.mockResolvedValue([
      { frameId: 0, result: true },
      { frameId: 2, result: false },
    ])

    await expect(
      browser.tabs.executeScript(5, {
        file: '../../injections/pause-media.js',
        allFrames: true,
        runAt: 'document_start',
      })
    ).resolves.toEqual([true, false])
    expect(scriptingExecute).toHaveBeenCalledWith({
      target: { tabId: 5, allFrames: true },
      files: ['injections/pause-media.js'],
      injectImmediately: true,
    })
  })

  test('uses a single frame target and rejects string code', async () => {
    await browser.tabs.executeScript(5, {
      file: './injections/play-media.js',
      frameId: 2,
      allFrames: true,
    })
    expect(scriptingExecute).toHaveBeenLastCalledWith({
      target: { tabId: 5, frameIds: [2] },
      files: ['injections/play-media.js'],
    })

    await expect(browser.tabs.executeScript(5, { code: 'document.title' })).rejects.toThrow(
      /\{ func, args \}.*Plan 16/
    )
  })
})

describe('search.search', () => {
  test('maps Firefox query options and rejects an invalid combination', async () => {
    await browser.search.search({ query: 'one', tabId: 8 })
    await browser.search.search({ query: 'two', disposition: 'NEW_TAB' })

    expect(searchQuery).toHaveBeenNthCalledWith(1, { text: 'one', tabId: 8 })
    expect(searchQuery).toHaveBeenNthCalledWith(2, {
      text: 'two',
      disposition: 'NEW_TAB',
    })
    await expect(
      browser.search.search({ query: 'bad', tabId: 8, disposition: 'NEW_TAB' }) as any
    ).rejects.toThrow(/cannot combine tabId and disposition/)
  })
})

describe('sidebarAction', () => {
  test('uses numeric window context filters and toggles the target panel', async () => {
    runtimeGetContexts.mockResolvedValueOnce([{ contextType: 'SIDE_PANEL', windowId: 8 }])
    await expect(browser.sidebarAction.isOpen({ windowId: 8 })).resolves.toBe(true)
    expect(runtimeGetContexts).toHaveBeenLastCalledWith({
      contextTypes: ['SIDE_PANEL'],
      windowIds: [8],
    })

    runtimeGetContexts.mockResolvedValueOnce([])
    await browser.sidebarAction.toggle()
    expect(sidePanelOpen).toHaveBeenCalledWith({ windowId: 42 })

    runtimeGetContexts.mockResolvedValueOnce([{ contextType: 'SIDE_PANEL', windowId: 42 }])
    await browser.sidebarAction.toggle()
    expect(sidePanelClose).toHaveBeenCalledWith({ windowId: 42 })
  })

  test('falls back to the last focused window and contains open failures', async () => {
    ;(chrome.windows.getCurrent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    sidePanelOpen.mockRejectedValueOnce(new Error('user gesture required'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(browser.sidebarAction.open()).resolves.toBeUndefined()
    expect(sidePanelOpen).toHaveBeenCalledWith({ windowId: 77 })
    expect(warn).toHaveBeenCalledWith(
      'browser.sidebarAction.open() failed on Chromium:',
      expect.any(Error)
    )
    await expect((browser.sidebarAction as any).getTitle()).resolves.toBe('Tabs')
  })
})
