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
