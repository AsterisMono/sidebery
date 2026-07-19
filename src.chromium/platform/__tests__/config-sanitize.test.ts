import { describe, expect, test } from 'vitest'
import { PanelType } from 'src/enums'
import type { SettingsState, SidebarConfig } from 'src/types'
import { sanitizeSettingsForChromium, sanitizeSidebarConfigForChromium } from '../config-sanitize'

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
      ctxMenuIgnoreContainers: 'example.com=Work',
      omniReopenInCtr: true,
      newTabCtxReopen: true,
      colorizeTabsSrc: 'container',
      tabDoubleClick: 'clear_cookies',
      tabLongLeftClick: 'clear_cookies',
      tabLongRightClick: 'clear_cookies',
      colorScheme: 'ff',
      ctxMenuNative: true,
      previewTabs: true,
      selWinScreenshots: true,
      markWindow: true,
      hideInact: true,
      hideFoldedTabs: true,
      hideUnloadedTabs: true,
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
      ctxMenuIgnoreContainers: '',
      omniReopenInCtr: false,
      newTabCtxReopen: false,
      colorizeTabsSrc: 'domain',
      tabDoubleClick: 'none',
      tabLongLeftClick: 'none',
      tabLongRightClick: 'none',
      colorScheme: 'sys',
      ctxMenuNative: false,
      previewTabs: false,
      selWinScreenshots: false,
      markWindow: false,
      hideInact: false,
      hideFoldedTabs: false,
      hideUnloadedTabs: false,
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

    expect(sanitizeSidebarConfigForChromium(config)).toEqual({
      removedSyncPanels: 2,
      resetContainerAssignments: 2,
      removedContainerMoveRules: 0,
      removedContainerShortcuts: 0,
    })
    expect(config.nav).toEqual(['tabs', 'settings'])
    expect(config.panels['legacy-sync']).toBeUndefined()
    expect(config.panels.tabs).toBeDefined()
  })

  test('removes legacy container assignments while preserving URL behavior', () => {
    const config = {
      nav: ['tabs'],
      panels: {
        tabs: {
          id: 'tabs',
          type: PanelType.tabs,
          newTabCtx: 'firefox-container-1',
          dropTabCtx: 'firefox-default',
          moveRules: [
            { id: 1, active: true, containerId: 'firefox-container-1' },
            {
              id: 2,
              active: true,
              url: '^https://example\\.com',
              containerId: 'firefox-container-1',
            },
            { id: 3, active: true, url: '^https://kept\\.example' },
          ],
          newTabBtns: [
            'Work',
            'Work, https://example.com',
            '',
            'firefox-default',
            'https://kept.example',
          ],
        },
      },
    } as SidebarConfig

    expect(sanitizeSidebarConfigForChromium(config)).toEqual({
      removedSyncPanels: 0,
      resetContainerAssignments: 2,
      removedContainerMoveRules: 2,
      removedContainerShortcuts: 3,
    })

    const tabs = config.panels.tabs
    expect(tabs).toMatchObject({
      newTabCtx: 'none',
      dropTabCtx: 'none',
      newTabBtns: ['https://example.com', '', 'https://kept.example'],
      moveRules: [
        { id: 2, active: false, url: '^https://example\\.com' },
        { id: 3, active: true, url: '^https://kept\\.example' },
      ],
    })
  })
})
