# Chromium service-worker state notes

These observations are inputs to Plan 14's resilience audit. They describe state that is
rebuilt or lost whenever Chromium terminates and later restarts the MV3 background worker.

## Rehydrated during background startup

- `Windows.byId`, `lastFocusedId`, and `focusedId` are rebuilt from
  `browser.windows.getAll()`. Chromium defers window events that arrive during this query.
- `Tabs.byId` and each background window's tab list are rebuilt from `browser.tabs.query()`.
  Tab listeners register synchronously and defer events until `Tabs.load()` marks the service
  ready.
- Settings, sidebar configuration, permissions, favicon indexes, and omnibox history reload
  from managed/local storage before the startup barrier opens.
- IPC connections and IPPC broadcast channels are process-local and reconnect after a worker
  restart. Incoming IPC actions wait for the startup barrier before reading service state.
- Emulated tab/window session values live in `chrome.storage.session`, so they survive worker
  restarts but not a complete browser session.

## Process-local or timer-backed state

- `Windows.lockedWindowsTabs` and its global lock counter reset. They protect only in-flight
  window creation, so a restart abandons the operation rather than restoring the lock.
- Tab event deferrals, cache debounce timers, favicon save timers, settings/storage debounces,
  sidebar active-panel debounce, and omnibox command debounce reset. Their next live event or
  startup load reconstructs the in-memory view, but the most recent delayed write can be lost.
- Snapshot scheduling uses one persistent named `chrome.alarms` alarm. Startup reasserts it,
  setting changes recreate or clear it, and its module-level listener waits for the background
  readiness barrier. Snapshot auto-export converts Blob contents to `data:` URLs because
  `URL.createObjectURL` is unavailable in a service worker; large-export behavior still needs
  browser-level verification.
- Sync, containers, and request-routing state are not initialized on Chromium until their
  no-op service overlays land. Browser-action menus are likewise skipped until the persistent,
  id-based `contextMenus.onClicked` dispatcher replaces MV2 `onclick` closures.

## Follow-up risks

- `Windows.load()` is now repeatable within one worker. Upstream `Tabs.load()` is safe on a
  fresh worker and `Tabs.reinitTabs()` clears its state first, but calling `Tabs.load()` twice
  directly would append duplicate entries to existing window tab arrays.
- A tab created while the startup `browser.tabs.query()` is in flight can appear in both the
  query result and the deferred `tabs.onCreated` queue. Replaying `onTabCreated` then inserts
  the same tab a second time because that handler does not check `Tabs.byId` before splicing it
  into the window list.
- `Omnibox.load()` schedules its first command rebuild through a 500 ms debounce. The startup
  barrier opens immediately after `load()` returns, so an omnibox input/enter event in that
  window sees an empty command list and silently does nothing.
- `tabsDataCache` is the browser-restart fallback. Its write coverage and startup clobber risk
  belong to Plan 13; worker startup must not overwrite a newer cache before restore matching.
- Correctness cannot depend on a sidebar port keeping the worker alive. All future event
  listeners (especially alarms and context menus) must remain top-level/synchronous and use
  the shared startup readiness barrier before consuming hydrated state.

## `tabsDataCache` write coverage (Plan 13)

The tree cache is produced by the foreground tab model, not by the background's native-tab
event handlers. The foreground writes after startup restore; create/remove/update handlers;
pinning and unpinning; native moves and cross-window attach/detach; Sidebery tree moves;
fold/expand/flatten; panel reassignment; custom title/color changes; and sidebar panel
reconfiguration. New-tab creation is covered when its native `tabs.onCreated` event is folded
into the foreground model. Session tab values are also saved separately for the current
browser session.

The demonstrated Chromium gap was in the background aggregator: after a worker restart,
`cacheByWin` was empty, so the first reconnecting sidebar replaced local `tabsDataCache` with
only its own window. The Chromium path now keeps the local cache collection canonical, matches
and replaces one window by unique window id/current tab ids/unique URL signature, updates the
in-memory collection immediately, and awaits an eager serialized `storage.local` write. A
closed window removes only a confidently matched entry. Ambiguous unmatched entries are kept;
an extra stale reopen candidate is safer than deleting another live window's restart data.

The foreground debounce remains the coalescing boundary. Once its IPC message reaches the
background, there is no second timer, and the returned promise keeps the worker alive through
the storage write. A full browser shutdown during the foreground debounce can still lose only
the newest tree mutation; this is the accepted MV3 degradation.
