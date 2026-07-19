import type { Reactivator } from 'src/types'
import type { SyncedDataType, SyncedEntry, SyncedEntryType, SyncReactiveState } from './sync'
import type { SyncedTabsBatch } from './sync.google'

export * as Firefox from 'src/services/sync.fg.firefox'
export * as Google from 'src/services/sync.fg.google'
export * from 'src/services/sync'

export let ready = true
export let reactive: SyncReactiveState = {
  loading: false,
  syncing: false,
  entries: [],
}

export function reactivate(r: Reactivator<SyncReactiveState>): void {
  reactive = r(reactive)
}

export async function save<T extends SyncedEntryType>(
  _type: T,
  _data: SyncedDataType<T>
): Promise<void> {}

export async function saveTabs(
  _tabsBatch: SyncedTabsBatch,
  _favicons: Record<string, string>
): Promise<void> {}

export async function _saveTabs(
  _tabsBatch: SyncedTabsBatch,
  _favicons: Record<string, string>
): Promise<void> {}

export async function remove(_entry: Partial<SyncedEntry>): Promise<void> {}

export async function removeByType(_type: SyncedEntryType): Promise<void> {}

export async function getData<T>(_entry: SyncedEntry): Promise<T | null> {
  return null
}

export async function load(_forced?: boolean): Promise<SyncedEntry[]> {
  return []
}

export async function _load(_forced?: boolean): Promise<SyncedEntry[]> {
  return []
}

export function unload(): void {
  reactive.entries = []
  reactive.loading = false
  reactive.syncing = false
}

export async function reload(): Promise<void> {
  unload()
}

export function unloadAfter(_delay: number): void {}

export async function openSyncPopup(): Promise<void> {}
