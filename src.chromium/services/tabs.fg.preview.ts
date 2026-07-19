import { NOID } from 'src/defaults'

export const enum Status {
  Closing = -1,
  Closed = 0,
  Opening = 1,
  Open = 2,
}

export const enum Mode {
  Nope = 0,
  InSidebar = 1,
  InPage = 3,
}

export const state = {
  status: Status.Closed,
  mode: Mode.Nope,
  modeFallback: false,

  targetTabId: NOID,

  openTimeout: undefined as number | undefined,
  closeTimeout: undefined as number | undefined,
}

export function setTargetTab(_tabId: ID): void {}

export function resetTargetTab(_tabId: ID, _closeDelay = 36): void {}

export function closePreview(): void {}

export function resetMode(): void {}

export function setPPreviewPosition(_y: number): void {}

export function updatePPreview(_tabId: ID): void {}

export async function closePPreview(): Promise<void> {}

export function registerSPreviewEl(_el: HTMLElement | null): void {}

export function closeSPreview(): void {}
