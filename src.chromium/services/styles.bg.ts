import type { Stored } from 'src/types'
import { NOID } from 'src/defaults'
import * as Windows from 'src/services/windows.bg'
import * as Settings from 'src/services/settings'

import * as Styles from 'src/services/styles'
export * from 'src/services/styles'

export interface WindowStyles {
  frameColorScheme: 'dark' | 'light'
  toolbarColorScheme: 'dark' | 'light'
  actElColorScheme: 'dark' | 'light'
  popupColorScheme: 'dark' | 'light'
  ffTheme: browser.theme.Theme | undefined
  parsedTheme: Styles.ParsedTheme | undefined
}

export const byWinId = new Map<ID, Readonly<WindowStyles>>()

export async function load(): Promise<void> {
  const updates = []
  for (const [id] of Windows.byId) {
    updates.push(updateWindowStyles(id))
  }
  await Promise.all(updates)
}

export function setupListeners(): void {
  // Chromium's theme shim is inert today, but retaining this listener keeps the
  // bg export behavior compatible if native theme data is introduced later.
  browser.theme.onUpdated.addListener(upd => {
    void updateWindowStyles(upd?.windowId === undefined ? NOID : upd.windowId)
  })
}

const waitingForWinStyles = new Map<ID, ((styles: WindowStyles) => void)[]>()

export async function updateWindowStyles(winId: ID): Promise<WindowStyles> {
  if (waitingForWinStyles.has(winId)) {
    return new Promise(resolve => waitingForWinStyles.get(winId)?.push(resolve))
  }
  waitingForWinStyles.set(winId, [])

  // A service worker has no matchMedia or computed styles. Foreground pages can
  // resolve `sys` against their own document; bg-provided page data uses light as
  // the deterministic fallback and honors explicit dark/light preferences.
  const scheme = Settings.state.colorScheme === 'dark' ? 'dark' : 'light'
  const newWinStyles: WindowStyles = {
    frameColorScheme: scheme,
    toolbarColorScheme: scheme,
    actElColorScheme: scheme,
    popupColorScheme: scheme,
    ffTheme: undefined,
    parsedTheme: undefined,
  }

  if (winId === NOID) {
    for (const [id] of Windows.byId) byWinId.set(id, newWinStyles)
  } else {
    byWinId.set(winId, newWinStyles)
  }

  waitingForWinStyles.get(winId)?.forEach(resolve => resolve(newWinStyles))
  waitingForWinStyles.delete(winId)
  return newWinStyles
}

export async function loadCustomGroupCSS(): Promise<string | undefined> {
  let stored = await browser.storage.managed.get<Stored>('groupCSS').catch(() => undefined)
  if (!stored?.groupCSS) {
    stored = await browser.storage.local.get<Stored>('groupCSS').catch(() => undefined)
  }
  return stored?.groupCSS
}
