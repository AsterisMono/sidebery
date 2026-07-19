import * as E from 'src/enums'
import { NOID } from 'src/defaults'
import * as IPC from 'src/services/ipc'
import * as IPPC from 'src/services/ippc.addon'
import * as Logs from 'src/services/logs'
import * as Settings from 'src/services/settings.bg'
import * as Windows from 'src/services/windows.bg'
import * as Favicons from 'src/services/favicons.bg'
import * as Containers from 'src/services/containers.bg'
import * as Tabs from 'src/services/tabs.bg'
import * as Store from 'src/services/storage.bg'
import * as Permissions from 'src/services/permissions.bg'
import * as Snapshots from 'src/services/snapshots.bg'
import * as Sidebar from 'src/services/sidebar.bg'
import * as Info from 'src/services/info.bg'
import * as Menu from 'src/services/menu.bg'
import * as WebReq from 'src/services/web-req.bg'
import * as Sync from 'src/services/sync.bg'
import * as Omnibox from 'src/services/omnibox.bg'
import * as Styles from 'src/services/styles.bg'
import {
  markBackgroundFailed,
  markBackgroundReady,
  waitForBackgroundReady,
} from 'src/platform/background-ready'

void main().then(markBackgroundReady).catch(error => {
  markBackgroundFailed(error)
  Logs.err('Background initialization failed', error)
})

async function main(): Promise<void> {
  Info.setInstanceType(E.InstanceType.bg)
  IPC.setInstanceType(E.InstanceType.bg)
  IPPC.setInstanceType(E.InstanceType.bg)
  Logs.setInstanceType(E.InstanceType.bg)

  const ts = performance.now()
  Logs.info('Init start')

  // Register globally available actions before the first async initialization step.
  IPC.registerActions({
    cacheTabsData: Tabs.cacheTabsData,
    getGroupPageInitData: Tabs.getGroupPageInitData,
    getPlaceholderPageInitData: Tabs.getPlaceholderPageInitData,
    tabsApiProxy: Tabs.tabsApiProxy,
    getSidebarTabs: Tabs.getSidebarTabs,
    detachSidebarTabs: Tabs.detachSidebarTabs,
    openTabs: Tabs.openTabs,
    setActivePanelId: Sidebar.setActivePanelId,
    createSnapshot: Snapshots.createSnapshot,
    addSnapshot: Snapshots.addSnapshot,
    removeSnapshot: Snapshots.removeSnapshot,
    openSnapshotWindows: Snapshots.openWindows,
    createWindowWithTabs: Windows.createWithTabs,
    isWindowTabsLocked: Windows.isWindowTabsLocked,
    saveFavicon: Favicons.saveFavicon,
    reloadFavicons: Favicons.load,
    saveInLocalStorage: Store.setFromRemoteFg,
    checkIpInfo: WebReq.checkIpInfo,
    disableAutoReopening: WebReq.disableAutoReopening,
    enableAutoReopening: WebReq.enableAutoReopening,

    saveToSync: Sync.save,
    saveTabsToSync: Sync.saveTabs,
    saveProfileInfoToGoogleSync: Sync.Google.saveProfileInfo,
    removeFromSync: Sync.remove,
    removeFromFirefoxSync: Sync.Firefox.remove,
    removeByTypeFromSync: Sync.removeByType,
    removeCachedIdFromGoogleSync: Sync.Google.removeCachedId,
    getDataFromSync: Sync.getData,
    loadSync: Sync.load,

    // Sidebar startup asks for containers. Return the Chromium empty state until
    // Plan 9 supplies the full service-shaped no-op overlays.
    getContainers: async () => ({}),
    setContainers: Containers.setContainers,
    createContainer: Containers.createAndSave,
    removeContainer: Containers.removeAndSave,
    importContainers: Containers.importContainers,
  })

  // Runtime IPC must be registered synchronously on every service-worker wake.
  IPC.setupGlobalMessageListener()
  IPC.setupConnectionListener()

  // Register wake-capable browser events before the first await. Tabs and the
  // Chromium windows overlay defer their handlers until live state is loaded.
  Windows.setupWindowsListeners()
  Tabs.setupListeners()
  Settings.setupSettingsChangeListener()
  Sidebar.setupListeners()
  Permissions.setupListeners()
  Omnibox.setupListeners()
  setupSidebarConnectionHandlers()

  // Chrome owns primary-action clicks when this behavior is enabled. Do not
  // also register the Firefox browserAction.onClicked toggle: that would race
  // the browser's native open/close behavior and could double-toggle the panel.
  const panelBehaviorReady = chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => Logs.err('Cannot configure Chromium action side panel behavior', error))

  // `_execute_action` is browser-reserved: Chrome performs the action click and
  // does not dispatch commands.onCommand. If repeated presses do not close in
  // Chrome 150, add a non-reserved `toggle_side_panel` manifest command and bind:
  // chrome.commands.onCommand.addListener(cmd => {
  //   if (cmd === 'toggle_side_panel') void browser.sidebarAction.toggle()
  // })

  browser.runtime.onUpdateAvailable.addListener(details => {
    const currentVersion = Info.versionToInt(browser.runtime.getManifest().version)
    const newVersion = Info.versionToInt(details.version)
    if (newVersion <= currentVersion) browser.runtime.reload()
  })

  // Container initialization requires contextualIdentities and is replaced in Plan 9.
  await Promise.all([panelBehaviorReady, Windows.load(), Settings.load(), Info.loadVersionInfo()])

  Info.saveVersion()

  await Sidebar.load()

  WebReq.updateReqHandlers()

  await Tabs.load()
  Menu.createBrowserActionMenu()

  await Permissions.load()
  await Favicons.load()
  // Browser-action context menus use MV2 onclick handlers. Plan 15 replaces them
  // with a cold-start-safe contextMenus.onClicked dispatcher.
  await Snapshots.scheduleSnapshots()

  await Styles.load()
  Styles.setupListeners()
  await Omnibox.load()

  Logs.info(`Init end: ${performance.now() - ts}ms`)

  const debugGlobal = globalThis as typeof globalThis & {
    getSideberyState?: () => unknown
  }
  debugGlobal.getSideberyState = () => ({
    profileId: Info.getProfileId(),
    Windows: {
      byId: Windows.byId,
    },
    Tabs: {
      byId: Tabs.byId,
      cacheByWin: Tabs.cacheByWin,
    },
  })
}

function setupSidebarConnectionHandlers(): void {
  IPC.onConnected(E.InstanceType.sidebar, winId => {
    void waitForBackgroundReady()
      .then(() => {
        Logs.info('IPC.onConnected sidebar', winId)

        const tabs = Windows.byId.get(winId)?.tabs
        if (tabs) Tabs.initInternalPageScripts(tabs)

        if (Settings.state.markWindow && winId !== NOID) {
          IPC.sendToSidebar(winId, 'updWindowPreface')
        }
      })
      .catch(() => undefined)
  })
  IPC.onDisconnected(E.InstanceType.sidebar, winId => {
    void waitForBackgroundReady()
      .then(() => {
        Logs.info('IPC.onDisconnected sidebar', winId)

        if (Settings.state.markWindow && Windows.byId.has(winId)) {
          browser.windows.update(winId, { titlePreface: '' })
        }
      })
      .catch(() => undefined)
  })
}
