# Chromium fork maintenance

The Chromium MV3 build stages upstream `src/` into `.staging-chromium`, overlays
`src.chromium/`, then applies `patches/`; see [the migration plan](migrate-plan.md) and
[`src.chromium/README.md`](../src.chromium/README.md).

## Updating from upstream

1. Merge `upstream/v5` and run `npm run check.overlays`.
2. Re-review every reported overlay or patch against the upstream diff and repair its plain and
   ordered application.
3. Run both builds, `npm test`, `npm run test.chromium`, and the manual checklist in
   [`docs/plans/notes-verify-in-chrome.md`](plans/notes-verify-in-chrome.md).
4. Once reviewed, run `npm run check.overlays.update` and commit the new baseline.

Add source replacements under `src.chromium/` with the same relative path and export shape. Use
small unified diffs under `patches/` for surgical changes; every patch must pass `git apply
--check` against upstream and compose in lexical order.

The stable extension identity and key handling are documented in [chromium-id.md](chromium-id.md).
For development, run `npm run build.chromium` and load `addon-chromium/` with **Load unpacked**.
For policy distribution, build `npm run build.ext.chromium`; its zip has `manifest.json` at root.

Known degradations are intentional: no containers, Firefox Sync/Drive, proxy routing, native tab
hiding, Firefox themes, editable shortcut API, native in-page menu override, bookmark separators,
or tab previews/window screenshots. Window identity can be ambiguous across a full restart when
multiple windows have identical tab signatures. Release remains gated on the manual checklist.
