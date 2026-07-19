# Chromium staging patches

Files named `*.patch` in this directory are `git apply`-style diffs applied to
`.staging-chromium/` during staging. They never modify the working-tree sources. Patch
filenames use the `0000-description.patch` format; the numeric prefix defines their
application order.

Patches are a last resort for small changes that cannot reasonably be expressed as an
overlay or build-time transform.
