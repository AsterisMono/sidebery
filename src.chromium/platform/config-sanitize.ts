import type { SettingsState, SidebarConfig } from 'src/types'
import { PanelType } from 'src/enums'

export interface ChromiumSidebarSanitization {
  removedSyncPanels: number
}

/** Mutates and returns the supplied settings object so all sync paths stay disabled. */
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
  return settings
}

/** Mutates a sidebar config, removing legacy sync panels and their navigation entries. */
export function sanitizeSidebarConfigForChromium(
  config: SidebarConfig
): ChromiumSidebarSanitization {
  const removedIds = new Set<ID>()

  for (const [id, panel] of Object.entries(config.panels ?? {})) {
    if (panel?.type !== PanelType.sync) continue
    removedIds.add(id)
    delete config.panels[id]
  }

  const previousNavLength = config.nav?.length ?? 0
  config.nav = (config.nav ?? []).filter(id => id !== 'sync' && !removedIds.has(id))

  return {
    removedSyncPanels: Math.max(removedIds.size, previousNavLength - config.nav.length),
  }
}
