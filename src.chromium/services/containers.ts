import type { Container, Reactivator } from 'src/types'

export interface ContainersState {
  byId: Record<string, Container>
}

export interface ContainerProxy {
  type: browser.proxy.ProxyType
  host: string
  port: string
}

export let reactive: ContainersState = { byId: {} }

export function reactivate(r: Reactivator<ContainersState>): void {
  reactive = r(reactive)
  reactive.byId = {}
}

export function getCPID(container: Container): string {
  const parts = [container.name, container.icon, container.color]
  return JSON.stringify(parts).slice(1, -1)
}

export function parseCPID(cpid: string): browser.contextualIdentities.CreateDetails | undefined {
  let result: string[] | undefined
  try {
    result = JSON.parse(`[${cpid}]`) as string[]
  } catch {
    return
  }
  if (!result || result.length !== 3) return

  const color = result[2]
  return {
    name: result[0],
    icon: result[1],
    color: (color === 'cyan'
      ? 'turquoise'
      : color === 'gray'
        ? 'toolbar'
        : color) as browser.ColorName,
  }
}

export function findUnique(
  _props?: Partial<browser.contextualIdentities.CreateDetails>
): Container | undefined {
  return
}

export function parseReopenRule(value: string): string | RegExp | undefined {
  const rule = value.trim()
  if (!rule) return

  const match = /^\/(?<re>.+)\/(?<flags>[dgimsuvy]*)$/.exec(rule)
  if (match?.groups?.re) {
    try {
      return new RegExp(match.groups.re, match.groups.flags)
    } catch {
      return
    }
  }
  return rule
}

export function getContainerFor(_url: string): string | undefined {
  return
}

export function sortContainers(_containers: Container[]): Container[] {
  return []
}

export function onContainerCreated(_info: browser.contextualIdentities.ChangeInfo): void {}
