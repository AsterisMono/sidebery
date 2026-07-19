# Chromium manual verification

Checks in this file require a real unpacked-extension session and cannot be established by
the build or DOM-based unit tests.

## M1 side panel

### Reserved keyboard action

- Confirm the Chromium manifest exposes `_execute_action` with `Ctrl+E` (Mac: `MacCtrl+E`)
  and does not expose Firefox's `_execute_sidebar_action`.
- With the panel closed, press `Ctrl+E` and confirm Chrome opens Sidebery through
  `openPanelOnActionClick` without a `commands.onCommand` event or duplicate toggle.
- Press `Ctrl+E` again. Confirm Chrome 150 closes the panel. If it only opens, replace the
  reserved shortcut with the documented non-reserved `toggle_side_panel` fallback listener in
  the Chromium background overlay.
- Open the extension shortcuts page and confirm the Sidebery action shortcut is displayed.
  The Chromium keybindings settings row should show `_execute_action`, not an empty command.

### User-gesture audit

- Primary action clicks and `_execute_action` are Chrome-owned user gestures through
  `openPanelOnActionClick`; the background does not register a second action-click listener.
- The current Chromium source graph has no direct `sidebarAction.open()` call. The shim still
  accepts it for compatibility and catches/logs `sidePanel.open()` rejection so a future
  non-gesture caller cannot fail its primary operation.
- `tabs.bg.ts:reopenTab()` calls only `sidebarAction.isOpen({windowId})` while coordinating tab
  reopening. It does not attempt to open the panel and passes a concrete numeric window ID.
- `sidebar.fg.ts:updateSidebarTitle()` calls only `setTitle()`. Chromium intentionally treats
  per-window side-panel titles as a no-op because the API has no equivalent.
- The optional non-reserved keyboard fallback would be gesture-driven. Future context-menu and
  omnibox open paths must call the defensive shim from their event callback and be checked here
  when implemented.

### Two-window identity, IPC, and toggle script

The expected identity flow is: `sidebar/sidebar.ts` awaits `Windows.load()`, the side-panel
context resolves its owner through `windows.getCurrent()`, the session-value adapter resolves
`WINDOW_ID_CURRENT` the same way, and `IPC.connectTo(bg)` serializes that numeric `srcWinId`
into its Port name. The background parses the Port name and stores the sidebar connection under
that window ID. No step depends on a Firefox sidebar URL or `sidebar_action` API.

1. Load `addon-chromium` as an unpacked extension. Open its service-worker console from
   `chrome://extensions` and keep it visible. Confirm startup reaches `Init end` without an
   unhandled rejection, invalid-permission error, or duplicate action-listener warning.
2. Open two normal Chrome windows, A and B, with visibly different tab sets. Record their
   numeric IDs using `chrome.windows.getAll()` in the service-worker console.
3. Click Sidebery's action in A. Confirm only A's panel opens and it lists A's tabs. In the
   side-panel console, compare `await chrome.windows.getCurrent()` with A's recorded ID.
4. Check the service-worker logs for `IPC.onConnect(sidebar, A_ID)`. Run
   `await browser.sidebarAction.isOpen({windowId: A_ID})` there and confirm it returns `true`.
   Confirm the underlying `runtime.getContexts` request accepts `[A_ID]` as numeric
   `windowIds` and returns a `SIDE_PANEL` context.
5. Open Sidebery in B while A remains open. Confirm B lists only B's tabs, the worker logs a
   second `IPC.onConnect(sidebar, B_ID)`, and `isOpen` is independently true for both IDs.
6. In each window, create, close, pin, activate, and move tabs. Move one tab from A to B.
   Confirm both panels update immediately and no IPC request times out or routes to the other
   window.
7. Close A's panel with the action or `await browser.sidebarAction.toggle({windowId: A_ID})`.
   Confirm B remains open and responsive, A's `isOpen` becomes false, and B's stays true.
   Toggle A open again and confirm its Port reconnects with A's ID.
8. Close B with `browser.sidebarAction.close({windowId: B_ID})`, then focus B and reopen it with
   the action click or `Ctrl+E`. Confirm closing one panel never changes the other window's
   side-panel state.
9. With at least one panel closed, call `open()` from a non-gesture service-worker console task.
   Chrome should reject the native open request; the shim should log one warning and resolve
   without an unhandled rejection.
10. Terminate the worker from `chrome://extensions`, then interact with a tab while a panel is
    open. Confirm the worker wakes, rehydrates, accepts the sidebar Port, and tab events continue
    after the readiness barrier without duplicate tabs or cross-window routing.

### Full-restart window identity degradation

- With two windows containing different tab sequences, restart Chrome and confirm each sidebar
  reuses the `uniqWinId` embedded in its matching local `tabsDataCache` entry.
- Repeat with two windows that have identical tab sequences. The local match is intentionally
  treated as ambiguous, so one or both windows can receive a new identity. This accepted
  degradation affects snapshot window grouping only; it must not cross-route sidebar IPC or
  restore another window's tree.

## M3 persistence and snapshot alarms

- Open three normal windows with different panels, nested trees, pinned tabs, custom tab
  titles/colors, and discarded tabs. Wait for the cache write, terminate the extension worker
  from `chrome://extensions` (or let it idle), then immediately create/move/close a tab. Confirm
  the worker wakes behind the readiness barrier and every sidebar/tree remains intact.
- Restart Chrome with those three windows restored. Confirm tab order, parent/child relations,
  folds, panel assignments, custom titles/colors, pinned state, and discarded state are restored.
  Confirm a cached `about:newtab` matches Chrome's `chrome://newtab/`, and activating a discarded
  placeholder navigates to its real target.
- After the restart, mutate only one window and inspect local `tabsDataCache`. Confirm entries for
  the other two windows remain present; closing one window removes only its matched cache entry.
- Enable automatic snapshots with a short supported interval. In the worker console, inspect
  `await chrome.alarms.get('sidebery:snapshots')`: it must have the configured period and
  `persistAcrossSessions: true`. Terminate the worker and confirm the alarm wakes it and creates a
  snapshot after initialization. Restart Chrome and confirm the alarm remains/reasserts.
- Change the snapshot interval and confirm the named alarm is recreated with the new period.
  Disable automatic snapshots and confirm the named alarm is cleared.
- Enable snapshot auto-export for JSON, Markdown, and both. Confirm downloads succeed from the
  service worker through `data:` URLs without `URL.createObjectURL` errors.
