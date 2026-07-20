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
let tabsOnCreated: ReturnType<typeof createEvent<browser.tabs.CreatedListener>>
let tabsOnActivated: ReturnType<typeof createEvent<(info: { tabId: ID; windowId: ID }) => void>>
let tabsOnRemoved: ReturnType<typeof createEvent<browser.tabs.RemovedListener>>
let tabsCreate: ReturnType<typeof vi.fn>
let tabsUpdate: ReturnType<typeof vi.fn>
let tabsDuplicate: ReturnType<typeof vi.fn>
let tabsGet: ReturnType<typeof vi.fn>
let tabsMove: ReturnType<typeof vi.fn>
let tabsDiscard: ReturnType<typeof vi.fn>
let tabsHighlight: ReturnType<typeof vi.fn>
let webNavigationOnBeforeNavigate: ReturnType<
  typeof createEvent<(details: ChromiumWebNavigationDetails) => void>
>
let webNavigationOnCommitted: ReturnType<
  typeof createEvent<(details: ChromiumWebNavigationCommittedDetails) => void>
>
let windowsCreate: ReturnType<typeof vi.fn>
let windowsOnRemoved: ReturnType<typeof createEvent<(windowId: ID) => void>>
let sessionStorage: ReturnType<typeof createStorageArea>
let scriptingExecute: ReturnType<typeof vi.fn>
let searchQuery: ReturnType<typeof vi.fn>
let sidePanelOpen: ReturnType<typeof vi.fn>
let sidePanelClose: ReturnType<typeof vi.fn>
let runtimeGetContexts: ReturnType<typeof vi.fn>
let permissionsOnAdded: ReturnType<
  typeof createEvent<browser.permissions.PermissionsChangeListener>
>

async function loadShim(): Promise<typeof browser> {
  vi.resetModules()
  delete (globalThis as any).browser
  delete (globalThis as any).__sideberyBrowser

  tabsOnUpdated = createEvent<browser.tabs.UpdatedListener>()
  tabsOnCreated = createEvent<browser.tabs.CreatedListener>()
  tabsOnActivated = createEvent<(info: { tabId: ID; windowId: ID }) => void>()
  tabsOnRemoved = createEvent<browser.tabs.RemovedListener>()
  tabsCreate = vi.fn().mockImplementation(async details => ({ id: 99, windowId: 7, ...details }))
  tabsUpdate = vi.fn().mockImplementation(async (id, details) => ({ id, windowId: 7, ...details }))
  tabsDuplicate = vi.fn().mockImplementation(async () => {
    const tab = { id: 100, windowId: 7, index: 3, active: true } as browser.tabs.Tab
    tabsOnCreated.emit(tab)
    tabsOnActivated.emit({ tabId: tab.id, windowId: tab.windowId })
    return tab
  })
  tabsGet = vi.fn().mockImplementation(async id => ({
    id,
    windowId: 7,
    index: id === 100 ? 6 : 2,
    active: id === 10,
  }))
  tabsMove = vi.fn().mockImplementation(async (id, details) => ({
    id,
    windowId: 7,
    index: details.index,
    active: true,
  }))
  tabsDiscard = vi.fn().mockImplementation(async id => ({ id, windowId: 7, discarded: true }))
  tabsHighlight = vi.fn().mockResolvedValue({ id: 7 })
  webNavigationOnBeforeNavigate = createEvent<
    (details: ChromiumWebNavigationDetails) => void
  >()
  webNavigationOnCommitted = createEvent<
    (details: ChromiumWebNavigationCommittedDetails) => void
  >()
  windowsCreate = vi.fn().mockResolvedValue({ id: 43, incognito: false })
  windowsOnRemoved = createEvent<(windowId: ID) => void>()
  sessionStorage = createStorageArea()
  scriptingExecute = vi.fn().mockResolvedValue([])
  searchQuery = vi.fn().mockResolvedValue(undefined)
  sidePanelOpen = vi.fn().mockResolvedValue(undefined)
  sidePanelClose = vi.fn().mockResolvedValue(undefined)
  runtimeGetContexts = vi.fn().mockResolvedValue([])
  permissionsOnAdded = createEvent<browser.permissions.PermissionsChangeListener>()

  ;(globalThis as any).chrome = {
    tabs: {
      onCreated: tabsOnCreated,
      onUpdated: tabsOnUpdated,
      onActivated: tabsOnActivated,
      onRemoved: tabsOnRemoved,
      query: vi.fn().mockResolvedValue([{ id: 10, windowId: 7, active: true }]),
      create: tabsCreate,
      update: tabsUpdate,
      duplicate: tabsDuplicate,
      get: tabsGet,
      move: tabsMove,
      discard: tabsDiscard,
      highlight: tabsHighlight,
    },
    windows: {
      WINDOW_ID_CURRENT: -2,
      onRemoved: windowsOnRemoved,
      getCurrent: vi.fn().mockResolvedValue({ id: 42, focused: true, incognito: false }),
      getLastFocused: vi.fn().mockResolvedValue({ id: 77, focused: true, incognito: false }),
      update: vi.fn(),
      create: windowsCreate,
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
    webNavigation: {
      onBeforeNavigate: webNavigationOnBeforeNavigate,
      onCommitted: webNavigationOnCommitted,
    },
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
    permissions: {
      contains: vi.fn().mockResolvedValue(false),
      onAdded: permissionsOnAdded,
    },
    omnibox: {},
    i18n: {},
    extension: {
      inIncognitoContext: false,
      isAllowedIncognitoAccess: vi.fn().mockResolvedValue(true),
    },
    notifications: {},
  }

  await import('../browser-shim')
  const browserShim = (globalThis as any).__sideberyBrowser
  // Unit tests are not built with the production identifier rewrite. Alias the
  // private object only inside this mocked context so existing assertions call
  // the same adapter object as Chromium bundles do.
  ;(globalThis as any).browser = browserShim
  return browserShim
}

beforeEach(async () => {
  await loadShim()
})

test('keeps adapters isolated from Chromium native browser binding updates', () => {
  const shim = (globalThis as any).__sideberyBrowser
  const testAlias = (globalThis as any).browser

  try {
    ;(globalThis as any).browser = {
      tabs: chrome.tabs,
      sessions: chrome.sessions,
      history: chrome.history,
    }

    expect(typeof shim.tabs.moveInSuccession).toBe('function')
    expect(typeof shim.sessions.setTabValue).toBe('function')
    expect(typeof shim.history.onTitleChanged.addListener).toBe('function')
  } finally {
    ;(globalThis as any).browser = testAlias
  }
})

describe('tabs.onUpdated', () => {
  test('reports top-frame navigation as loading before it commits', async () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, { properties: ['status'] })
    tabsGet.mockResolvedValueOnce({
      id: 3,
      windowId: 7,
      status: 'complete',
      title: 'Current page',
      url: 'https://example.com/current',
    } as browser.tabs.Tab)

    webNavigationOnBeforeNavigate.emit({
      frameId: 0,
      tabId: 3,
      url: 'https://example.com/destination',
    })

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        3,
        { status: 'loading' },
        expect.objectContaining({
          pendingUrl: 'https://example.com/destination',
          status: 'loading',
        })
      )
    })
  })

  test('ignores subframe navigation starts', async () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, { properties: ['status'] })

    webNavigationOnBeforeNavigate.emit({
      frameId: 2,
      tabId: 3,
      url: 'https://example.com/frame',
    })

    await Promise.resolve()
    expect(listener).not.toHaveBeenCalled()
    expect(tabsGet).not.toHaveBeenCalled()
  })

  test('refreshes the title after back or forward navigation commits', async () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, { properties: ['title'] })
    tabsGet.mockResolvedValueOnce({
      id: 3,
      windowId: 7,
      status: 'loading',
      title: 'Restored history title',
      url: 'https://example.com/previous',
    } as browser.tabs.Tab)

    webNavigationOnCommitted.emit({
      frameId: 0,
      tabId: 3,
      transitionQualifiers: ['forward_back'],
      url: 'https://example.com/previous',
    })

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        3,
        { title: 'Restored history title' },
        expect.objectContaining({ title: 'Restored history title' })
      )
    })
  })

  test('does not synthesize titles for ordinary or subframe commits', async () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener, { properties: ['title'] })

    webNavigationOnCommitted.emit({
      frameId: 0,
      tabId: 3,
      transitionQualifiers: ['from_address_bar'],
      url: 'https://example.com/typed',
    })
    webNavigationOnCommitted.emit({
      frameId: 4,
      tabId: 3,
      transitionQualifiers: ['forward_back'],
      url: 'https://example.com/frame',
    })

    await Promise.resolve()
    expect(listener).not.toHaveBeenCalled()
    expect(tabsGet).not.toHaveBeenCalled()
  })

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

  test('uses the navigation URL while Chrome reports an empty loading title', () => {
    const listener = vi.fn()
    browser.tabs.onUpdated.addListener(listener)
    const tab = {
      id: 3,
      windowId: 7,
      title: '',
      url: 'https://example.com/committed',
    } as browser.tabs.Tab

    tabsOnUpdated.emit(3, { title: '' }, tab)

    expect(listener).toHaveBeenCalledWith(
      3,
      { title: 'https://example.com/committed' },
      expect.objectContaining({ title: 'https://example.com/committed' })
    )
  })
})

describe('tabs creation and activation semantics', () => {
  test('uses pendingUrl as the temporary title of a background link tab', () => {
    const listener = vi.fn()
    browser.tabs.onCreated.addListener(listener)
    const nativeTab = {
      id: 101,
      windowId: 7,
      index: 3,
      active: false,
      title: '',
      url: '',
      pendingUrl: 'https://example.com/background-link',
    } as browser.tabs.Tab & { pendingUrl: string }

    tabsOnCreated.emit(nativeTab)

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 101,
        title: 'https://example.com/background-link',
        pendingUrl: 'https://example.com/background-link',
      })
    )
    expect(nativeTab.title).toBe('')
  })

  test('normalizes loading titles returned by tab queries', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      {
        id: 102,
        windowId: 7,
        title: '',
        url: '',
        pendingUrl: 'https://example.com/queried-link',
      } as browser.tabs.Tab & { pendingUrl: string },
    ])

    await expect(browser.tabs.query({ windowId: 7 })).resolves.toEqual([
      expect.objectContaining({ title: 'https://example.com/queried-link' }),
    ])
  })

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

    await browser.tabs.update({ url: 'https://example.com/from-history' })
    expect(tabsUpdate).toHaveBeenLastCalledWith({ url: 'https://example.com/from-history' })

    await browser.tabs.update(99, { openerTabId: 99 })
    expect(tabsUpdate).toHaveBeenLastCalledWith(99, {})

    await browser.tabs.highlight({ windowId: 7, populate: false, tabs: [1, 2] })
    expect(tabsHighlight).toHaveBeenCalledWith({ windowId: 7, tabs: [1, 2] })
    await expect(browser.tabs.warmup(99)).resolves.toBeUndefined()
    await expect(browser.tabs.moveInSuccession([99], 10)).resolves.toBeUndefined()
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

  test('maps Firefox bulk discard calls to Chromium single-tab calls', async () => {
    await expect(browser.tabs.discard([7, 9])).resolves.toBeUndefined()
    expect(tabsDiscard).toHaveBeenNthCalledWith(1, 7)
    expect(tabsDiscard).toHaveBeenNthCalledWith(2, 9)

    await browser.tabs.discard(11)
    expect(tabsDiscard).toHaveBeenNthCalledWith(3, 11)
  })

  test('maps Firefox duplicate options to Chromium move and activation calls', async () => {
    const onCreated = vi.fn()
    browser.tabs.onCreated.addListener(onCreated)
    const duplicated = await browser.tabs.duplicate(22, { active: false, index: 6 })

    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, windowId: 7 })
    expect(tabsDuplicate).toHaveBeenCalledWith(22)
    expect(tabsMove).toHaveBeenCalledWith(100, { index: 6 })
    expect(tabsUpdate).toHaveBeenCalledWith(10, { active: true })
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 100, index: 6 }))
    expect(duplicated).toMatchObject({ id: 100, index: 6 })
  })

  test('waits for async creation handling before moving the duplicate', async () => {
    let finishCreation!: () => void
    const creationHandled = new Promise<void>(resolve => (finishCreation = resolve))
    const order: string[] = []
    browser.tabs.onCreated.addListener(async () => {
      order.push('created')
      await creationHandled
      order.push('creation handled')
    })
    browser.tabs.onActivated.addListener(() => order.push('activated'))

    const duplication = browser.tabs.duplicate(22, { index: 6 })
    await vi.waitFor(() => expect(tabsDuplicate).toHaveBeenCalledOnce())
    expect(tabsMove).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(order).toEqual(['created']))

    finishCreation()
    await duplication
    expect(tabsMove).toHaveBeenCalledWith(100, { index: 6 })
    expect(order).toEqual(['created', 'creation handled', 'activated'])
  })

  test('keeps exactly one active tab across repeated duplications', async () => {
    let nextDuplicateId = 100
    tabsDuplicate.mockImplementation(async () => {
      const tab = {
        id: nextDuplicateId++,
        windowId: 7,
        index: 3,
        active: true,
      } as browser.tabs.Tab
      tabsOnCreated.emit(tab)
      tabsOnActivated.emit({ tabId: tab.id, windowId: tab.windowId })
      return tab
    })

    let activeId = 10
    const activeById = new Map<ID, boolean>([[activeId, true]])
    browser.tabs.onCreated.addListener(tab => activeById.set(tab.id, tab.active))
    browser.tabs.onActivated.addListener(info => {
      activeById.set(activeId, false)
      activeById.set(info.tabId, true)
      activeId = info.tabId
    })

    await browser.tabs.duplicate(10, { active: true, index: 6 })
    await browser.tabs.duplicate(100, { active: true, index: 7 })

    const activeIds = [...activeById].filter(([, active]) => active).map(([id]) => id)
    expect(activeIds).toEqual([101])
  })

  test('clears the duplicate active flag after restoring a background activation', async () => {
    tabsUpdate.mockImplementationOnce(async (id, details) => {
      if (details.active) tabsOnActivated.emit({ tabId: id, windowId: 7 })
      return { id, windowId: 7, ...details }
    })

    let activeId = 10
    const activeById = new Map<ID, boolean>([[activeId, true]])
    browser.tabs.onCreated.addListener(tab => activeById.set(tab.id, tab.active))
    browser.tabs.onActivated.addListener(info => {
      activeById.set(activeId, false)
      activeById.set(info.tabId, true)
      activeId = info.tabId
    })

    await browser.tabs.duplicate(22, { active: false, index: 6 })

    const activeIds = [...activeById].filter(([, active]) => active).map(([id]) => id)
    expect(activeIds).toEqual([10])
  })

  test('coordinates creation events delivered after the native duplicate result', async () => {
    const nativeTab = { id: 101, windowId: 7, index: 3, active: true } as browser.tabs.Tab
    tabsDuplicate.mockResolvedValueOnce(nativeTab)
    tabsGet.mockResolvedValueOnce({ ...nativeTab, index: 7 })
    const onCreated = vi.fn()
    browser.tabs.onCreated.addListener(onCreated)

    const duplication = browser.tabs.duplicate(22, { index: 7 })
    await vi.waitFor(() => expect(tabsDuplicate).toHaveBeenCalledOnce())
    expect(tabsMove).not.toHaveBeenCalled()

    tabsOnCreated.emit(nativeTab)
    await duplication
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 101, index: 7 }))
    expect(tabsMove).toHaveBeenCalledWith(101, { index: 7 })
  })

  test('does not pass Firefox duplicate options to Chromium', async () => {
    await browser.tabs.duplicate(22, { active: true })

    expect(tabsDuplicate).toHaveBeenCalledWith(22)
    expect(tabsDuplicate).toHaveBeenCalledTimes(1)
    expect(tabsMove).not.toHaveBeenCalled()
    expect(chrome.tabs.query).not.toHaveBeenCalledWith({ active: true, windowId: 7 })
  })

  test('rejects when Chromium does not return a duplicated tab', async () => {
    tabsDuplicate.mockResolvedValueOnce(undefined)

    await expect(browser.tabs.duplicate(22)).rejects.toThrow(
      'Chromium did not duplicate tab 22'
    )
  })
})

describe('incognito window creation', () => {
  test('rejects before creating a window when incognito access is disabled', async () => {
    vi.mocked(chrome.extension.isAllowedIncognitoAccess).mockResolvedValueOnce(false)

    await expect(browser.windows.create({ incognito: true })).rejects.toThrow(
      'Extension does not have permission for incognito mode'
    )
    expect(windowsCreate).not.toHaveBeenCalled()
  })

  test('creates an incognito window when access is enabled', async () => {
    windowsCreate.mockResolvedValueOnce({ id: 44, incognito: true })

    await expect(browser.windows.create({ incognito: true })).resolves.toEqual({
      id: 44,
      incognito: true,
    })
    expect(windowsCreate).toHaveBeenCalledWith({ incognito: true })
  })

  test('rejects an empty native creation result', async () => {
    windowsCreate.mockResolvedValueOnce(null)

    await expect(browser.windows.create({})).rejects.toThrow(
      'Chromium did not return the created window'
    )
  })
})

describe('optional history permission', () => {
  test('resolves methods and events granted after shim initialization', async () => {
    const historySearch = vi.fn().mockResolvedValue([{ id: 'visit' }])
    const historyGetVisits = vi.fn().mockResolvedValue([{ id: 'visit-details' }])
    const historyDeleteRange = vi.fn().mockResolvedValue(undefined)
    const historyDeleteUrl = vi.fn().mockResolvedValue(undefined)
    const historyOnVisited = createEvent<browser.history.VisitedListener>()
    const historyOnVisitRemoved = createEvent<browser.history.VisitRemovedListener>()
    const visitedListener = vi.fn()

    expect(typeof browser.history.search).toBe('function')
    ;(chrome as any).history = {
      search: historySearch,
      getVisits: historyGetVisits,
      deleteRange: historyDeleteRange,
      deleteUrl: historyDeleteUrl,
      onVisited: historyOnVisited,
      onVisitRemoved: historyOnVisitRemoved,
    }

    await expect(browser.history.search({ text: '' })).resolves.toEqual([{ id: 'visit' }])
    await expect(browser.history.getVisits({ url: 'https://example.com' })).resolves.toEqual([
      { id: 'visit-details' },
    ])
    await browser.history.deleteRange({ startTime: 1, endTime: 2 })
    await browser.history.deleteUrl({ url: 'https://example.com' })
    browser.history.onVisited.addListener(visitedListener)
    historyOnVisited.emit({ id: 'visit' })

    expect(historySearch).toHaveBeenCalledWith({ text: '' })
    expect(historyGetVisits).toHaveBeenCalledWith({ url: 'https://example.com' })
    expect(historyDeleteRange).toHaveBeenCalledWith({ startTime: 1, endTime: 2 })
    expect(historyDeleteUrl).toHaveBeenCalledWith({ url: 'https://example.com' })
    expect(visitedListener).toHaveBeenCalledWith({ id: 'visit' })

    // Removing the permission hides the current namespace, but the shim still
    // unregisters from the native event object used when the listener was added.
    ;(chrome as any).history = {}
    browser.history.onVisited.removeListener(visitedListener)
    expect(historyOnVisited.hasListener(visitedListener)).toBe(false)
  })

  test('keeps the Firefox-only title event inert and reports missing access', async () => {
    const listener = vi.fn()
    expect(() => browser.history.onTitleChanged.addListener(listener)).not.toThrow()
    await expect(browser.history.search({ text: '' })).rejects.toThrow(/history permission/)
  })

  test('waits for Chromium to refresh bindings after permission grant', async () => {
    const historySearch = vi.fn().mockResolvedValue([{ id: 'delayed-visit' }])
    ;(chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(true)

    const result = browser.history.search({ text: '' })
    setTimeout(() => {
      ;(chrome as any).history = { search: historySearch }
    }, 5)

    await expect(result).resolves.toEqual([{ id: 'delayed-visit' }])
    expect(historySearch).toHaveBeenCalledWith({ text: '' })
  })

  test('does not search during the permission-added event turn', async () => {
    const historySearch = vi.fn().mockResolvedValue([{ id: 'settled-visit' }])
    ;(chrome as any).history = { search: historySearch }

    permissionsOnAdded.emit({ permissions: ['history'] })
    const result = browser.history.search({ text: '' })

    expect(historySearch).not.toHaveBeenCalled()
    await expect(result).resolves.toEqual([{ id: 'settled-visit' }])
    expect(historySearch).toHaveBeenCalledWith({ text: '' })
  })
})

describe('other optional API permissions', () => {
  test('late-binds bookmarks and downloads after first grant', async () => {
    const bookmarksGetTree = vi.fn().mockResolvedValue([{ id: '0', title: '', children: [] }])
    const bookmarksCreate = vi.fn().mockResolvedValue({ id: '1', title: 'Example' })
    const bookmarksOnCreated = createEvent<browser.bookmarks.CreateListener>()
    const downloadsDownload = vi.fn().mockResolvedValue(12)
    const bookmarkListener = vi.fn()

    ;(chrome as any).bookmarks = {
      getTree: bookmarksGetTree,
      create: bookmarksCreate,
      onCreated: bookmarksOnCreated,
    }
    ;(chrome as any).downloads = { download: downloadsDownload }

    permissionsOnAdded.emit({ permissions: ['bookmarks', 'downloads'] })
    const tree = browser.bookmarks.getTree()
    const created = browser.bookmarks.create({ title: 'Example', type: 'bookmark' })
    const downloaded = browser.downloads.download({ url: 'data:text/plain,Sidebery' })

    expect(bookmarksGetTree).not.toHaveBeenCalled()
    expect(downloadsDownload).not.toHaveBeenCalled()
    await expect(tree).resolves.toEqual([{ id: '0', title: '', children: [] }])
    await expect(created).resolves.toEqual({ id: '1', title: 'Example' })
    await expect(downloaded).resolves.toBe(12)
    expect(bookmarksCreate).toHaveBeenCalledWith({ title: 'Example' })

    browser.bookmarks.onCreated.addListener(bookmarkListener)
    bookmarksOnCreated.emit('1', { id: '1', title: 'Example' })
    expect(bookmarkListener).toHaveBeenCalledWith('1', { id: '1', title: 'Example' })

    await expect(
      browser.bookmarks.create({ title: 'Separator', type: 'separator' })
    ).rejects.toThrow(/does not support bookmark separators/)
  })
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
