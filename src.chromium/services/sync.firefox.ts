import type { MenuConfs, SettingsState } from 'src/types'
import type * as Sync from 'src/services/sync'

export type KeyType = 'settings' | 'ctxMenu' | 'kb' | 'styles'

export interface Synced {
  [key: string]: SyncedValue
}

export interface SyncedValue {
  ver?: string
  name: string
  time: number
  value: SyncableData
  entryId?: string
}

export interface SyncableData {
  settings?: SettingsState
  contextMenu?: MenuConfs
  sidebarCSS?: string
  groupCSS?: string
  keybindings?: { [name: string]: string }
}

export function syncEntryTypeToKeyType(_entryType: Sync.SyncedEntryType): KeyType | void {}
