import { describe, expect, test, vi } from 'vitest'
import { watchSystemColorScheme } from '../color-scheme'

describe('Chromium page color scheme', () => {
  test('uses the browser preference and follows later changes', () => {
    let listener: (() => void) | undefined
    const media = {
      matches: true,
      addEventListener: vi.fn((_event: string, cb: () => void) => {
        listener = cb
      }),
      removeEventListener: vi.fn(),
    }
    const matchMedia = vi.fn().mockReturnValue(media)
    vi.stubGlobal('matchMedia', matchMedia)
    const onChange = vi.fn()

    const stop = watchSystemColorScheme(onChange)
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(onChange).toHaveBeenLastCalledWith('dark')

    media.matches = false
    listener?.()
    expect(onChange).toHaveBeenLastCalledWith('light')

    stop()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener)
  })
})
