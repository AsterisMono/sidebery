import type { SyncedEntry, SyncedEntryType } from 'src/services/sync'
import type { ProfileInfo, SyncedTabsBatch, SyncedTabsFileData } from 'src/services/sync.google'
import { FileType, typeNames } from 'src/services/sync.google'

export * from 'src/services/sync.google'

export const cachedTabFilesData: Map<string, SyncedTabsFileData> = new Map()

export function getFileName(_fileType: FileType): string {
  return ''
}

export function syncEntryTypeToFileType(_entryType: SyncedEntryType): FileType | void {}

export async function removeCachedId(_id: string): Promise<void> {}

export async function save<T>(
  _type: FileType,
  _content: T,
  _props?: Record<string, string>,
  _noRetry?: boolean
): Promise<null> {
  return null
}

export async function remove(_type: FileType): Promise<void> {}

export async function loadOtherProfilesInfo(): Promise<ProfileInfo[]> {
  return []
}

export async function saveProfileInfo(): Promise<void> {}

export async function removeAllFilesOfThisProfile(): Promise<void> {}

export async function loadSyncedEntries(): Promise<SyncedEntry[]> {
  return []
}

export async function saveTabs(
  _tabsBatch: SyncedTabsBatch,
  _favicons: Record<string, string>
): Promise<void> {}

export async function removeTabsEntry(_entry: SyncedEntry): Promise<void> {}

void typeNames
