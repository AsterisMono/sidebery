# Chromium MV3 migration — plan index

Split of `docs/migrate-plan.md` into 18 sub-agent-executable plans. Each plan is
self-contained (a sub-agent needs only the plan file + the referenced sections of the
master plan), broken into small TODOs, and requires a commit after each TODO
(`chromium: <summary>`).

## Execution order & dependencies

| Plan | Milestone | Title | Depends on |
|---|---|---|---|
| [1](1.md) | M0 | Staging pipeline (`stage.chromium.js`, overlay, patches) | — |
| [2](2.md) | M0 | MV3 manifest + pinned key + drift check | 1 |
| [3](3.md) | M0 | Build pipeline (vite/copy/html/styles/icons/zip) | 1, 2 |
| [4](4.md) | M1 | Browser shim core + entry wiring + types | 1–3 |
| [5](5.md) | M1 | Complex adapters: onUpdated filter, sessions, scripting, search | 4 |
| [6](6.md) | M1 | Platform env: profile id, `about:` URLs, bookmark roots | 1–4 |
| [7](7.md) | M1 | Service-worker background entry | 4–6 |
| [8](8.md) | M1 | Side panel integration | 4–7 |
| [9](9.md) | M2 | Remove containers | 1–8 |
| [10](10.md) | M2 | Remove sync | 1–8 |
| [11](11.md) | M2 | Remove proxy/webRequest + tab previews | 1–8 |
| [12](12.md) | M2 | Small hides: tab-hide, theme, markWindow, keybindings, native menu, separators | 9–11 (shares a patch file with 11) |
| [13](13.md) | M3 | Persistence: restart recovery + snapshots via alarms | 5, 7, 9–12 |
| [14](14.md) | M3 | SW-kill resilience audit of all bg services | 13 |
| [15](15.md) | M4 | Context menus `onClicked` dispatcher | 4, 14 |
| [16](16.md) | M4 | Injections rework + discarded-tab emulation | 5, 11, 13 |
| [17](17.md) | M4 | Parity polish sweep (DnD, locales, omnibox, CSS) + manual checklist | 1–16 |
| [18](18.md) | M5 | Ship: overlay-check tool, staged tests, CI, docs | 1–17 |

Parallelizable groups (disjoint write sets, after prerequisites):
- 5 ∥ 6 (after 4)
- 9 ∥ 10 ∥ 11 (after 8; 12 must wait for 11's `settings.tabs.vue` patch)
- 15 ∥ 16 (after 14; 16 also needs 13)

## Shared artifacts created along the way

- `docs/plans/notes-sw-state.md` — bg module-state audit notes (created in Plan 7,
  extended in 13–14).
- `docs/plans/notes-verify-in-chrome.md` — accumulating manual-verification checklist
  (created in Plan 8, appended by 12–17, consolidated in 17). Items in it require a
  human running Chrome ≥ 150 — sub-agents must record, not skip, such items.
- `patches/0021-settings-tabs-vue.patch` — shared by Plans 11 and 12 (single patch file,
  two hunks).
- `build/overlays.lock.json` — overlay baseline (Plan 18).

## Invariants every sub-agent must uphold

1. Never modify files under `src/` or existing `build/` scripts; only add files
   (`src.chromium/`, `build/*.chromium.*`, `patches/`) plus additive edits to
   `package.json` / `.gitignore`.
2. Overlays keep the exact export shape of the upstream file they shadow.
3. Chrome ≥ 150; no compat fallbacks.
4. After every plan: `npm run build` (Firefox) and `npm test` must pass, and
   `npm run build.chromium` must pass once it exists (Plan 3+).
5. Commit after each TODO; no branches.
