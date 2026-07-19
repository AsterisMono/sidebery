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
