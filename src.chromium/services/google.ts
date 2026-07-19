export * as Drive from 'src/services/google.drive'

export let accessToken: string | null = null

export function getRedirectURI(): string {
  return ''
}

export async function loadAccessToken(_force = false): Promise<void> {}
