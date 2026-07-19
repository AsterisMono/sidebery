# Chromium staging patches

Files named `*.patch` in this directory are `git apply`-style diffs applied to
`.staging-chromium/` during staging. They never modify the working-tree sources. Patch
filenames use the `0000-description.patch` format; the numeric prefix defines their
application order.

For changes to existing upstream files, first try a narrow, purpose-focused patch.
Chromium-only additions should remain regular source files under `src.chromium/`.

Use a full shadowing file only as a last resort when a patch cannot reasonably express the
divergence. Shadowing masks the complete upstream file and increases drift-review, staging,
and long-term maintenance complexity.
