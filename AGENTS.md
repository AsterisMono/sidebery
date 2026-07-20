# AGENTS.md

## Repository purpose

This branch is an overlay-maintained Chromium Manifest V3 port of upstream Sidebery. Read
`docs/migrate-plan.md` before making Chromium changes. Its decisions and accepted degradations
are the project baseline unless the user explicitly changes them.

Two rules override convenience:

1. **Preserve the overlay boundary.** This repository must remain easy to sync with
   `upstream/v5`; minimize changes to upstream-owned files and never solve a Chromium issue by
   casually editing the Firefox source.
2. **Verify browser API differences from primary sources.** Before implementing, diagnosing,
   or reviewing Chrome/Chromium-versus-Firefox extension behavior, read the applicable current
   browser documentation or implementation source. Do not rely on memory, typings, the migration
   plan, or existing shims alone.

## Overlay architecture

The Chromium build is materialized in this order:

1. Copy upstream-owned `src/` to `.staging-chromium/src/`.
2. Overlay `src.chromium/` at matching relative paths.
3. Apply `patches/*.patch` in lexical filename order.
4. Build the staged source into `addon-chromium/` and package it under `dist/`.

Treat these paths accordingly:

- `src/`: upstream Firefox source. Keep unchanged for Chromium work.
- `src.chromium/`: home for Chromium-only adapters, stubs, additions, and other new modules.
  Use it to shadow an upstream file only when a narrow patch is not practical. A shadowing module
  must preserve the upstream module's export shape.
- `patches/`: preferred home for narrow, surgical Chromium changes to existing upstream files.
  Patches apply to the staging tree, never to the working-tree `src/`.
- `build/*.chromium.*` and other new Chromium build files: Chromium-only build behavior.
- `build/overlays.lock.json`: reviewed upstream baselines for shadowed, patched, and forked files.
- `.staging-chromium/`, `addon/`, `addon-chromium/`, and `dist/`: generated output; never edit
  them as source and do not commit them.

For a Chromium-specific change, choose its home by whether it changes an existing upstream file:

1. Put Chromium-only additions and new modules under `src.chromium/`.
2. To change an existing upstream file, first add a narrow, purpose-focused patch under
   `patches/`.
3. Shadow the complete upstream file under `src.chromium/` only when a patch cannot reasonably
   express the divergence. Keep the replacement as small and stable as the module boundary allows.
4. Reserve deterministic Chromium build-time transforms for build/materialization behavior that
   is not appropriately expressed as source code or a staging patch.

Avoid full-file overlays of large or frequently changing upstream files. Keep patches focused,
independent where possible, and valid in lexical order. Do not change Firefox behavior. Features
that Firefox alone supports must be adapted, hidden, stubbed with the same interface, or retained
as an explicitly documented degradation for Chromium.

A shadowing file is a complete replacement, not a merge: if both `src/<path>` and
`src.chromium/<path>` exist, the Chromium staging step copies the overlay over the entire upstream
file. Therefore, an upstream edit to that file will not appear in the staged Chromium source and
can otherwise be silently masked. `npm run check.overlays` is the required guard: it compares the
current upstream file with its reviewed hash in `build/overlays.lock.json` and fails when the
upstream file changed. The check reports drift; it does not merge the upstream change or decide
whether it is relevant. A maintainer must inspect the upstream diff and deliberately port, reject,
or otherwise account for it in the overlay.

Do not assume a successful `npm run stage.chromium` or `npm run build.chromium` proves overlays are
current; those commands can succeed while building a stale shadowing file. Run
`npm run check.overlays` after every upstream merge and before accepting Chromium work. Never run
`npm run check.overlays.update` until every reported upstream change has been reviewed. Prefer new
Chromium-only modules and narrow patches because they reduce this manual reconciliation surface.

Changes to shared upstream-owned files such as `package.json` or `.gitignore` must be small and
additive. Before modifying any other shared/root file, first determine why a narrow patch, new
Chromium-only file, full-file shadow, or build transform cannot express the change.

## Platform API research is mandatory

ALWAYS consume current documentation or browser source when work touches platform differences,
including manifests, permissions, commands, side panels/sidebar actions, tabs, sessions, menus,
service-worker lifecycle, scripting, storage, alarms, bookmarks, themes, or extension URLs.

- Chrome/Chromium: prefer `developer.chrome.com/docs/extensions`, Chromium extension API schemas,
  and Chromium implementation source.
- Firefox: prefer MDN WebExtensions documentation, Mozilla extension schemas, Searchfox, or
  `mozilla/gecko-dev`.
- Web-platform behavior: use the relevant living standard and browser source when extension docs
  do not settle the question.

Check the exact accepted inputs, result shape, events, error behavior, permission requirements,
Manifest V3/service-worker constraints, persistence/lifecycle semantics, and version availability.
Cross-check both browsers when claiming a difference. When behavior is unclear, inspect source or
run a focused browser experiment and record the result. Add regression tests for adapter behavior
that can be automated, and document unavoidable semantic differences.

The current Chromium floor is 150+ and tracks latest stable. Do not add old-version fallbacks or
feature detection for earlier Chromium versions unless `docs/migrate-plan.md` is deliberately
revised. The plan is a design record, not a substitute for fresh API verification.

## Upstream synchronization

When merging upstream changes:

1. Merge `upstream/v5` without rewriting or discarding local overlay work.
2. Run `npm run check.overlays` immediately.
3. For every reported file, inspect the upstream diff and re-review all overlays and patches that
   depend on it. Repair them against the new source; do not blindly regenerate hashes.
4. Stage and test both Firefox and Chromium builds.
5. Only after the review and tests pass, run `npm run check.overlays.update` and inspect the lockfile
   diff before committing it.

Resolve conflicts in favor of keeping upstream source recognizable and moving Chromium divergence
back into overlays, transforms, or patches. Do not update `build/overlays.lock.json` merely to make
CI green. See `docs/chromium-fork.md` for the maintenance checklist.

## Build and verification

Use the smallest relevant checks while iterating, then run the full affected matrix before handoff.

- `npm run stage.chromium`: rebuild the merged staging source and validate manifest drift/patches.
- `npm run check.overlays`: detect upstream changes beneath overlays, patches, and Chromium build
  forks.
- `npm run test.chromium`: stage and run Chromium-specific tests.
- `npm run lint.types.chromium`: type-check the staged Chromium source.
- `npm run build.chromium`: build the unpacked MV3 extension in `addon-chromium/`.
- `npm run build.ext.chromium`: build and create the self-distribution zip.
- `npm test`, `npm run lint`, and `npm run build`: protect the upstream Firefox build.

For runtime, manifest, service-worker, or browser integration changes, also follow
`docs/plans/notes-verify-in-chrome.md`; unit tests do not replace loading the extension in a current
Chrome/Chromium build when behavior is browser-dependent.

For bug fixes, prefer manual verification in a real interactive browser and explicitly ask the
human to perform the relevant check. Do not use a headless browser for testing or verification.

## Project constraints

- Chromium distribution is self-hosted; keep the pinned public `manifest.key` stable.
- `chromium-dist.pem` is private key material. Never display, modify, delete, or commit it.
- Containers, all sync, per-request proxy, tab hiding, tab previews, Firefox theme integration,
  native context-menu override, bookmark separators, and editable shortcut APIs are intentionally
  unavailable or degraded on Chromium unless the migration decisions are explicitly revisited.
- MV3 service-worker correctness must not depend on long-lived module state or an always-open side
  panel. Persist/rebuild state and test cold-start behavior.
- Keep commits narrow. Do not mix an upstream sync, overlay-baseline refresh, and unrelated feature
  work when they can be separated.
