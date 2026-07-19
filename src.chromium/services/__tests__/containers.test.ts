import { beforeEach, describe, expect, test } from 'vitest'
import type { Container } from 'src/types'
import { DEFAULT_CONTAINER_ID } from 'src/defaults'
import * as Containers from '../containers'
import * as ContainersBg from '../containers.bg'

const legacyContainer = {
  id: 'firefox-container-1',
  cookieStoreId: 'firefox-container-1',
  name: 'Work',
  icon: 'briefcase',
  color: 'blue',
  proxified: true,
  proxy: {},
  reopenRulesActive: true,
  reopenRules: [],
  userAgentActive: true,
  userAgent: 'Legacy UA',
} as Container

describe('Chromium container stubs', () => {
  beforeEach(async () => {
    await ContainersBg.load()
  })

  test('discards imported contextual identities without mutating reactive state', async () => {
    await expect(
      ContainersBg.importContainers({ [legacyContainer.id]: legacyContainer })
    ).resolves.toEqual({})
    await expect(ContainersBg.getContainers()).resolves.toEqual({})
    expect(Containers.reactive.byId).toEqual({})
  })

  test('returns inert values for callers that still create or look up a container', async () => {
    const created = await ContainersBg.create(legacyContainer)

    expect(created.id).toBe(DEFAULT_CONTAINER_ID)
    expect(Containers.findUnique({ name: legacyContainer.name })).toBeUndefined()
    expect(Containers.getContainerFor('https://example.com')).toBeUndefined()
    expect(Containers.reactive.byId).toEqual({})
  })
})
