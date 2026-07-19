import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as Utils from 'src/utils'
import { createDiscardedTab } from '../discarded-tabs'

const create = vi.fn()
const discard = vi.fn()
const get = vi.fn()
let updatedListeners: Set<browser.tabs.UpdatedListener>

function emitUpdated(tabId: ID, change: browser.tabs.ChangeInfo, tab: browser.tabs.Tab): void {
  for (const listener of [...updatedListeners]) listener(tabId, change, tab)
}

beforeEach(() => {
  create.mockReset().mockResolvedValue({ id: 41, active: false, url: '' })
  discard.mockReset().mockResolvedValue(undefined)
  get.mockReset().mockResolvedValue({ id: 41, active: false, url: 'about:blank' })
  updatedListeners = new Set()
  browser.tabs.create = create
  browser.tabs.discard = discard
  browser.tabs.get = get
  browser.tabs.onUpdated = {
    addListener: vi.fn(listener => updatedListeners.add(listener)),
    removeListener: vi.fn(listener => updatedListeners.delete(listener)),
    hasListener: vi.fn(listener => updatedListeners.has(listener)),
  }
})

afterEach(() => vi.useRealTimers())

describe('Chromium discarded tab creation', () => {
  test('waits for the real URL to commit before discarding the tab', async () => {
    const target = 'https://example.com/a?b=1#section'
    const creation = createDiscardedTab({
      url: target,
      title: 'Example title',
      active: false,
      discarded: true,
      windowId: 7,
    })

    await vi.waitFor(() => expect(get).toHaveBeenCalledWith(41))
    expect(create).toHaveBeenCalledWith({ url: target, active: false, windowId: 7 })
    expect(discard).not.toHaveBeenCalled()

    emitUpdated(41, { url: target }, { id: 41, active: false, url: target } as browser.tabs.Tab)

    await expect(creation).resolves.toEqual({ id: 41, active: false, url: '' })
    expect(discard).toHaveBeenCalledWith(41)
    expect(updatedListeners.size).toBe(0)
  })

  test('ignores URL updates from other tabs', async () => {
    vi.useFakeTimers()
    const creation = createDiscardedTab({
      url: 'https://example.com',
      active: false,
      discarded: true,
    })
    await vi.advanceTimersByTimeAsync(0)

    emitUpdated(
      99,
      { url: 'https://other.example.com' },
      { id: 99, active: false, url: 'https://other.example.com' } as browser.tabs.Tab
    )
    expect(discard).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)
    await expect(creation).resolves.toBeDefined()
    expect(discard).not.toHaveBeenCalled()
    expect(updatedListeners.size).toBe(0)
  })

  test('preserves an unavailable-URL placeholder as the actual tab URL', async () => {
    const unavailable = Utils.createPlaceholderUrl({ url: 'chrome://settings/' })
    create.mockResolvedValue({ id: 41, active: false, url: unavailable })
    get.mockResolvedValue({ id: 41, active: false, url: unavailable })
    await createDiscardedTab({ url: unavailable, discarded: true, active: false })

    expect(create).toHaveBeenCalledWith({ url: unavailable, active: false })
    expect(discard).toHaveBeenCalledWith(41)
  })

  test('passes ordinary tab creation through unchanged', async () => {
    await createDiscardedTab({ url: 'https://example.com', active: true })

    expect(create).toHaveBeenCalledWith({ url: 'https://example.com', active: true })
    expect(discard).not.toHaveBeenCalled()
  })
})
