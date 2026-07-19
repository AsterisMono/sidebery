const BACKGROUND_PING = 'sidebery:chromium-background-ready'

let resolveReady!: () => void
let rejectReady!: (error: unknown) => void
let settled = false

const ready = new Promise<void>((resolve, reject) => {
  resolveReady = resolve
  rejectReady = reject
})

// Avoid an unhandled rejection when startup fails before a foreground page pings.
void ready.catch(() => undefined)

export function waitForBackgroundReady(): Promise<void> {
  return ready
}

export function markBackgroundReady(): void {
  if (settled) return
  settled = true
  resolveReady()
}

export function markBackgroundFailed(error: unknown): void {
  if (settled) return
  settled = true
  rejectReady(error)
}

export function isBackgroundPing(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === BACKGROUND_PING
  )
}

export function createBackgroundPing(): { type: string } {
  return { type: BACKGROUND_PING }
}
