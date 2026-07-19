import type { SettingsState, SidebarConfig } from 'src/types'
import { PanelType } from 'src/enums'
import { DOMAIN_RE } from 'src/defaults'

export interface ChromiumSidebarSanitization {
  removedSyncPanels: number
  resetContainerAssignments: number
  removedContainerMoveRules: number
  removedContainerShortcuts: number
}

/** Mutates and returns settings so Firefox-only sync and container paths stay disabled. */
export function sanitizeSettingsForChromium<T extends Partial<SettingsState>>(settings: T): T {
  settings.subPanelSync = false
  settings.syncName = ''
  settings.syncUseFirefox = false
  settings.syncUseGoogleDrive = false
  settings.syncUseGoogleDriveApi = false
  settings.syncUseGoogleDriveApiClientId = ''
  settings.syncSaveSettings = false
  settings.syncSaveCtxMenu = false
  settings.syncSaveStyles = false
  settings.syncSaveKeybindings = false
  settings.ctxMenuIgnoreContainers = ''
  settings.omniReopenInCtr = false
  settings.newTabCtxReopen = false
  if (settings.colorizeTabsSrc === 'container') settings.colorizeTabsSrc = 'domain'
  if (settings.tabDoubleClick === 'clear_cookies') settings.tabDoubleClick = 'none'
  if (settings.tabLongLeftClick === 'clear_cookies') settings.tabLongLeftClick = 'none'
  if (settings.tabLongRightClick === 'clear_cookies') settings.tabLongRightClick = 'none'
  return settings
}

function sanitizeNewTabShortcuts(shortcuts: string[]): {
  shortcuts: string[]
  removed: number
} {
  const sanitized: string[] = []
  const seen = new Set<string>()
  let removed = 0

  for (const shortcut of shortcuts) {
    if (shortcut === '') {
      sanitized.push(shortcut)
      continue
    }

    const url = shortcut
      .split(',')
      .map(part => part.trim())
      .find(part => DOMAIN_RE.test(part))

    if (!url || seen.has(url)) {
      removed++
      continue
    }

    seen.add(url)
    sanitized.push(url)
    if (url !== shortcut.trim()) removed++
  }

  const compacted = sanitized.filter((shortcut, index) => {
    if (shortcut !== '') return true
    return index > 0 && index < sanitized.length - 1 && sanitized[index - 1] !== ''
  })

  return { shortcuts: compacted, removed }
}

/** Mutates a sidebar config, removing legacy sync panels and container assignments. */
export function sanitizeSidebarConfigForChromium(
  config: SidebarConfig
): ChromiumSidebarSanitization {
  const removedIds = new Set<ID>()
  let resetContainerAssignments = 0
  let removedContainerMoveRules = 0
  let removedContainerShortcuts = 0

  for (const [id, panel] of Object.entries(config.panels ?? {})) {
    if (panel?.type === PanelType.sync) {
      removedIds.add(id)
      delete config.panels[id]
      continue
    }
    if (panel?.type !== PanelType.tabs) continue

    if (panel.newTabCtx !== 'none') {
      panel.newTabCtx = 'none'
      resetContainerAssignments++
    }
    if (panel.dropTabCtx !== 'none') {
      panel.dropTabCtx = 'none'
      resetContainerAssignments++
    }

    panel.moveRules = (panel.moveRules ?? []).filter(rule => {
      if (!rule.containerId) return true
      removedContainerMoveRules++
      if (!rule.url) return false
      delete rule.containerId
      rule.active = false
      return true
    })

    const shortcuts = sanitizeNewTabShortcuts(panel.newTabBtns ?? [])
    panel.newTabBtns = shortcuts.shortcuts
    removedContainerShortcuts += shortcuts.removed
  }

  const previousNavLength = config.nav?.length ?? 0
  config.nav = (config.nav ?? []).filter(id => id !== 'sync' && !removedIds.has(id))

  return {
    removedSyncPanels: Math.max(removedIds.size, previousNavLength - config.nav.length),
    resetContainerAssignments,
    removedContainerMoveRules,
    removedContainerShortcuts,
  }
}
