import type { SyncedEntry } from 'src/services/sync'
import type { KeyType, SyncableData, SyncedValue } from 'src/services/sync.firefox'

export * from 'src/services/sync.firefox'

export const cachedValues: Map<string, SyncedValue> = new Map()

export async function save(
  _key: KeyType,
  _value: SyncableData,
  _entryId?: string
): Promise<void> {}

export async function loadSyncedEntries(): Promise<SyncedEntry[]> {
  return []
}

export async function remove(_keyType: KeyType): Promise<void> {}
