import type { Container, NewContainerConf } from 'src/types'
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

export async function create(conf: NewContainerConf): Promise<Container> {
  return inertContainer(conf)
}

export async function remove(_id: string): Promise<void> {}

export async function saveContainer(_container: Container, _delay?: number): Promise<void> {}

export async function onStoredContainersUpdated(
  _newContainers?: Record<ID, Container> | null
): Promise<void> {
  Containers.reactive.byId = {}
}
