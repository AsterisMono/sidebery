import type { IPCheckResult } from 'src/types'

export let containersProxies: Record<string, browser.proxy.ProxyInfo> = {}

export function disableAutoReopening(_containerId: string, _delay: number): void {}

export function enableAutoReopening(_excludeTabIds: ID[]): void {}

export async function checkIpInfo(_cookieStoreId: ID): Promise<IPCheckResult | null> {
  return null
}

export function updateReqHandlers(): void {
  containersProxies = {}
}

export function updateReqHandlersDebounced(_delay = 500): void {}
