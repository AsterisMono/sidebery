import type * as T from 'src/types'
import { InstanceType } from 'src/enums'

interface PendingMsg {
  timeout: number
  ok: (v?: any) => void
  meh: (err?: any) => void
}

export class ProcessedUrls {
  static #urlEndings: string[] = []
  static add(url: string) {
    this.#urlEndings.push(url.slice(-25))
    if (this.#urlEndings.length > 100) this.#urlEndings.shift()
  }
  static has(url: string) {
    const ending = url.slice(-25)
    return this.#urlEndings.lastIndexOf(ending) !== -1
  }
}

let actions: T.Actions | undefined
let currentTabId: ID | undefined
let runtimeListenerReady = false
let messageId = 0

export let setHash: (h: string) => void
export let localType = InstanceType.unknown
export const localMark = 'p'
export const hashSuffix = ''
export const pending: Map<ID, PendingMsg> = new Map()

/**
 * Chromium extension pages can address the MV3 worker directly. This avoids
 * discovering a BroadcastChannel id through a same-document fragment update,
 * which is not reported through tabs.onUpdated in Chromium.
 */
export async function init<R, I extends InstanceType>(
  type: I,
  hashSetter: (h: string) => void,
  a: T.ActionsType<I>
): Promise<R> {
  localType = type
  actions = a
  setHash = hashSetter

  const tab = await browser.tabs.getCurrent()
  if (tab?.id === undefined) throw new Error('Internal page is not hosted in a tab')
  currentTabId = tab.id

  if (!runtimeListenerReady) {
    browser.runtime.onMessage.addListener(onRuntimeMsg)
    runtimeListenerReady = true
  }

  // Remove a channel suffix left by an older Chromium build.
  setHash('')

  if (type === InstanceType.group) {
    return browser.runtime.sendMessage({
      dstType: InstanceType.bg,
      action: 'getGroupPageInitData',
      args: [currentTabId],
    })
  }
  if (type === InstanceType.url) {
    return browser.runtime.sendMessage({
      dstType: InstanceType.bg,
      action: 'getPlaceholderPageInitData',
      args: [currentTabId],
    })
  }
  throw new Error(`Unsupported internal page type: ${String(type)}`)
}

export async function isInDefaultContainer(): Promise<boolean> {
  return true
}

function onRuntimeMsg<T extends InstanceType, A extends keyof T.Actions>(
  msg: T.Message<T, A>
): unknown {
  if (msg.dstType !== undefined && msg.dstType !== localType) return
  if (msg.dstTabId !== undefined && msg.dstTabId !== currentTabId) return
  return onMsg(msg)
}

export function onMsg<T extends InstanceType, A extends keyof T.Actions>(
  msg: T.Message<T, A>
): unknown {
  if (msg.id !== undefined) {
    const pm = pending.get(msg.id)
    if (pm) {
      clearTimeout(pm.timeout)
      pending.delete(msg.id)
      if (msg.error) pm.meh(msg.error)
      else pm.ok(msg.result)
      return
    }
  }

  if (!msg.action || !actions) return
  const action = actions[msg.action] as T.AnyFunc | undefined
  if (!action) return
  const args = msg.args
  if (args?.length) return action(...args)
  return action()
}

/**
 * Kept for the upstream module's export shape. Chromium routes the message
 * through extension messaging rather than a BroadcastChannel.
 */
export async function sendBCMsg<T extends InstanceType, A extends T.ActionsKeys<T>>(
  msg: T.Message<T, A>
): Promise<ID> {
  const id = ++messageId
  msg.id = id
  await browser.runtime.sendMessage(msg)
  return id
}

export function bg<T extends InstanceType.bg, A extends T.ActionsKeys<T>>(
  action: A,
  ...args: Parameters<T.ActionsType<T>[A]>
): Promise<ReturnType<T.ActionsType<T>[A]>> {
  const msg: T.Message<T, A> = { dstType: InstanceType.bg, action }
  if (args.length) msg.args = args
  return browser.runtime.sendMessage(msg)
}
