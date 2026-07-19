/** Environment decisions that differ in the DOM-free Chromium service worker. */
export function prefersReducedMotionByDefault(): boolean {
  // Foreground pages can query their own media state. Background defaults must
  // not touch matchMedia because it is absent from ServiceWorkerGlobalScope.
  return false
}
