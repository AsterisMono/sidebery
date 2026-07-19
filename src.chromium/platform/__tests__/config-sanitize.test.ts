import { describe, expect, test } from 'vitest'
import { PanelType } from 'src/enums'
import type { SettingsState, SidebarConfig } from 'src/types'
import {
  sanitizeSettingsForChromium,
  sanitizeSidebarConfigForChromium,
} from '../config-sanitize'

describe('Chromium config sanitization', () => {
  test('forces legacy sync settings off', () => {
    const settings = {
      subPanelSync: true,
      syncName: 'Old profile',
      syncUseFirefox: true,
      syncUseGoogleDrive: true,
      syncUseGoogleDriveApi: true,
      syncUseGoogleDriveApiClientId: 'client-id',
      syncSaveSettings: true,
      syncSaveCtxMenu: true,
      syncSaveStyles: true,
      syncSaveKeybindings: true,
    } as SettingsState

    expect(sanitizeSettingsForChromium(settings)).toBe(settings)
    expect(settings).toMatchObject({
      subPanelSync: false,
      syncName: '',
      syncUseFirefox: false,
      syncUseGoogleDrive: false,
      syncUseGoogleDriveApi: false,
      syncUseGoogleDriveApiClientId: '',
      syncSaveSettings: false,
      syncSaveCtxMenu: false,
      syncSaveStyles: false,
      syncSaveKeybindings: false,
    })
  })

  test('removes sync panels and every matching navigation entry', () => {
    const config = {
      nav: ['tabs', 'sync', 'legacy-sync', 'settings'],
      panels: {
        tabs: { id: 'tabs', type: PanelType.tabs },
        'legacy-sync': { id: 'legacy-sync', type: PanelType.sync },
      },
    } as SidebarConfig

    expect(sanitizeSidebarConfigForChromium(config)).toEqual({ removedSyncPanels: 2 })
    expect(config.nav).toEqual(['tabs', 'settings'])
    expect(config.panels['legacy-sync']).toBeUndefined()
    expect(config.panels.tabs).toBeDefined()
  })
})
