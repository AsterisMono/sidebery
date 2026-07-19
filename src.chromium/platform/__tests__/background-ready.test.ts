import { describe, expect, test, vi } from 'vitest'

async function loadReadiness() {
  vi.resetModules()
  return import('../background-ready')
}

describe('background readiness', () => {
  test('keeps cold-start work behind the barrier', async () => {
    const readiness = await loadReadiness()
    const passed = vi.fn()

    void readiness.waitForBackgroundReady().then(passed)
    await Promise.resolve()
    expect(passed).not.toHaveBeenCalled()

    readiness.markBackgroundReady()
    await expect(readiness.waitForBackgroundReady()).resolves.toBeUndefined()
    expect(passed).toHaveBeenCalledOnce()
  })

  test('rejects waiters when background initialization fails', async () => {
    const readiness = await loadReadiness()
    const error = new Error('startup failed')

    readiness.markBackgroundFailed(error)
    await expect(readiness.waitForBackgroundReady()).rejects.toBe(error)
  })

  test('identifies the liveness ping without matching other messages', async () => {
    const readiness = await loadReadiness()
    expect(readiness.isBackgroundPing(readiness.createBackgroundPing())).toBe(true)
    expect(readiness.isBackgroundPing({ type: 'something-else' })).toBe(false)
    expect(readiness.isBackgroundPing(null)).toBe(false)
  })
})
