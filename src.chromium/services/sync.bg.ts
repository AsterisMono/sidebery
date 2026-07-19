import type { SyncedDataType, SyncedEntry, SyncedEntryType } from 'src/services/sync'
import type { SyncedTabsBatch } from 'src/services/sync.google'

export * as Firefox from 'src/services/sync.bg.firefox'
export * as Google from 'src/services/sync.bg.google'
export * from 'src/services/sync'

export let ready = true
export let entries: SyncedEntry[] = []

export async function save<T extends SyncedEntryType>(
  _type: T,
  _data: SyncedDataType<T>
): Promise<void> {}

export async function saveTabs(
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
  entries = []
}

export async function reload(): Promise<void> {
  entries = []
}
