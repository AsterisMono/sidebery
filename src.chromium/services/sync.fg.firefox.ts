import type { KeyType } from 'src/services/sync.firefox'

export * from 'src/services/sync.firefox'

export async function updateProfileInfo(): Promise<void> {}

export async function remove(_keyType: KeyType): Promise<void> {}
