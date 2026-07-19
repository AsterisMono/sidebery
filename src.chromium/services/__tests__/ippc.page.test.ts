import { describe, expect, test, vi } from 'vitest'
import { InstanceType } from 'src/enums'

type RuntimeListener = (message: any) => unknown

let listeners: RuntimeListener[]
let sendMessage: ReturnType<typeof vi.fn>

async function loadPageIPPC() {
  vi.resetModules()
  listeners = []
  sendMessage = vi.fn(async message => {
    if (message.action === 'getGroupPageInitData') return { tabId: 42, groupInfo: { tabs: [] } }
    if (message.action === 'getPlaceholderPageInitData') return { tabId: 42 }
  })

  ;(globalThis as any).browser = {
    runtime: {
      sendMessage,
      onMessage: {
        addListener(listener: RuntimeListener) {
          listeners.push(listener)
        },
      },
    },
    tabs: {
      getCurrent: vi.fn().mockResolvedValue({ id: 42, windowId: 7 }),
    },
  }

  return import('src/services/ippc.page')
}

describe('Chromium internal-page IPC', () => {
  test('initializes a group page directly through runtime messaging', async () => {
    const IPPC = await loadPageIPPC()
    const setHash = vi.fn()
    const update = vi.fn()

    await expect(IPPC.init(InstanceType.group, setHash, { update })).resolves.toEqual({
      tabId: 42,
      groupInfo: { tabs: [] },
    })

    expect(setHash).toHaveBeenCalledWith('')
    expect(sendMessage).toHaveBeenCalledWith({
      dstType: InstanceType.bg,
      action: 'getGroupPageInitData',
      args: [42],
    })
  })

  test('delivers updates only to the addressed group tab', async () => {
    const IPPC = await loadPageIPPC()
    const update = vi.fn()
    await IPPC.init(InstanceType.group, vi.fn(), { update })

    const payload = { title: 'Updated group' }
    listeners[0]?.({
      dstType: InstanceType.group,
      dstTabId: 41,
      action: 'update',
      args: [payload],
    })
    listeners[0]?.({
      dstType: InstanceType.group,
      dstTabId: 42,
      action: 'update',
      args: [payload],
    })

    expect(update).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith(payload)
  })

  test('routes page actions to the background worker', async () => {
    const IPPC = await loadPageIPPC()

    await IPPC.bg('tabsApiProxy', 'update', 15, { active: true })

    expect(sendMessage).toHaveBeenLastCalledWith({
      dstType: InstanceType.bg,
      action: 'tabsApiProxy',
      args: ['update', 15, { active: true }],
    })
  })
})
