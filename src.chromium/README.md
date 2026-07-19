# Chromium source overlay

This directory is overlaid on `src/` when the Chromium build is staged. A file here
shadows the file with the same relative path under `src/`; paths that do not exist in
`src/` add Chromium-only files.

Keep upstream sources untouched: add Chromium changes here instead. A shadowing module
must preserve the export shape of the upstream module so existing imports keep working.
