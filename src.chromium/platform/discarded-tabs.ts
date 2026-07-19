/** Emulate Firefox's create({discarded,title}) with Chrome's native discard operation. */
export async function createDiscardedTab(
  props: browser.tabs.CreateProperties
): Promise<browser.tabs.Tab> {
  if (!props.discarded) return browser.tabs.create(props)

  const { discarded: _discarded, title: _title, ...nativeProps } = props
  const created = await browser.tabs.create(nativeProps)
  const targetUrl = typeof nativeProps.url === 'string' ? nativeProps.url : undefined
  const committed = await waitForCommittedUrl(created.id, targetUrl)
  if (committed) await browser.tabs.discard(created.id)
  return created
}

/** Chrome can resolve tabs.create() before the requested URL is committed. */
function waitForCommittedUrl(tabId: ID, targetUrl?: string): Promise<boolean> {
  return new Promise(resolve => {
    let timeout: number | undefined
    let settled = false

    const finish = (committed: boolean): void => {
      if (settled) return
      settled = true
      if (timeout !== undefined) clearTimeout(timeout)
      browser.tabs.onUpdated.removeListener(onUpdated)
      resolve(committed)
    }
    const onUpdated: browser.tabs.UpdatedListener = (updatedTabId, change, tab) => {
      if (updatedTabId !== tabId) return
      if (isCommittedUrl(change.url ?? tab.url, targetUrl)) finish(true)
    }

    browser.tabs.onUpdated.addListener(onUpdated)
    browser.tabs.get(tabId).then(
      tab => {
        if (isCommittedUrl(tab.url, targetUrl)) finish(true)
      },
      () => finish(false)
    )

    // A tab that cannot commit is still usable if left loaded; discarding it would
    // reproduce Chrome's unrecoverable unloaded/about:blank state.
    timeout = globalThis.setTimeout(() => finish(false), 5000)
  })
}

function isCommittedUrl(url?: string, targetUrl?: string): boolean {
  if (!url) return false
  return url !== 'about:blank' || targetUrl === 'about:blank'
}
