# Chromium source overlay

This directory is overlaid on `src/` when the Chromium build is staged. A file here
shadows the file with the same relative path under `src/`; paths that do not exist in
`src/` add Chromium-only files.

Keep upstream sources untouched: add Chromium-only files and substantive replacements here.
Use an ordered patch under `patches/` for narrow changes to otherwise shared upstream files.
A shadowing module must preserve the export shape of the upstream module so existing imports
keep working.

The upstream runtime entries are monolithic, so they cannot be shadowed and then imported
under another name. Instead, `build/vite.chromium.ts` prepends the Chromium browser shim to
every extension-page entry (including the service worker and the group/URL pages) during
transformation. Locale-only entries and scripts injected into web pages do not load the
shim.
