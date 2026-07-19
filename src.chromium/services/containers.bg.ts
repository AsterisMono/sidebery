import type { Container, IPCNodeInfo, NewContainerConf } from 'src/types'
import { DEFAULT_CONTAINER, DEFAULT_CONTAINER_ID } from 'src/defaults'

import * as Containers from 'src/services/containers'
export * from 'src/services/containers'

function inertContainer(conf: NewContainerConf): Container {
  return {
    ...DEFAULT_CONTAINER,
    ...conf,
    id: DEFAULT_CONTAINER_ID,
    cookieStoreId: DEFAULT_CONTAINER_ID,
    reopenRules: conf.reopenRules ? [...conf.reopenRules] : [],
  }
}

export async function load(): Promise<void> {
  Containers.reactive.byId = {}
}

export async function saveContainers(_delay?: number, _invoker?: IPCNodeInfo): Promise<void> {}

export async function getContainers(): Promise<Record<string, Container>> {
  Containers.reactive.byId = {}
  return {}
}

export async function create(conf: NewContainerConf): Promise<Container> {
  return inertContainer(conf)
}

export async function createAndSave(
  conf: NewContainerConf,
  _invoker?: IPCNodeInfo
): Promise<Container> {
  return inertContainer(conf)
}

export async function removeAndSave(_id: string, _invoker?: IPCNodeInfo): Promise<void> {}

export async function setContainers(
  _containers: Record<string, Container>,
  _invoker?: IPCNodeInfo
): Promise<void> {
  Containers.reactive.byId = {}
}

export async function importContainers(
  _containers: Record<string, Container>,
  _invoker?: IPCNodeInfo
): Promise<Record<string, string>> {
  Containers.reactive.byId = {}
  return {}
}

export function setupListeners(): void {}

export function onStoredContainersUpdated(_newContainers?: Record<ID, Container> | null): void {
  Containers.reactive.byId = {}
}
