import { beforeEach, expect, test, vi } from 'vitest'
import { InstanceType } from 'src/enums'

let sendMessage: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  sendMessage = vi.fn().mockResolvedValue(undefined)
  ;(globalThis as any).browser = { runtime: { sendMessage } }

  vi.doMock('src/utils', () => ({ uid: () => 'message-id' }))
  vi.doMock('src/services/logs', () => ({ err: vi.fn() }))
  vi.doMock('src/services/ipc', () => ({ runActionFor: vi.fn() }))
  vi.doMock('src/services/ippc', () => ({ getInstanceTypeMark: () => 's' }))
  vi.doMock('src/services/ippc.addon.bc', () => ({
    Channels: { delete: vi.fn(), clear: vi.fn() },
    sendBCMsg: vi.fn(),
  }))
  vi.doMock('src/services/ippc.addon.hm', () => ({}))
})

test('addresses group-page updates through extension messaging', async () => {
  const IPPC = await import('src/services/ippc.addon')
  const update = { title: 'Updated group' }

  await IPPC.callGroupPage(
    {
      id: 42,
      url: 'chrome-extension://example/sidebery/group.html#Group',
      cookieStoreId: 'firefox-default',
    },
    'update',
    update
  )

  expect(sendMessage).toHaveBeenCalledWith({
    id: 'message-id',
    dstType: InstanceType.group,
    dstTabId: 42,
    action: 'update',
    args: [update],
  })
})
