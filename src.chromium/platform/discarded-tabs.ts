import * as Utils from 'src/utils'

/** Emulate Firefox's create({discarded,title}) with Sidebery's placeholder page. */
export async function createDiscardedTab(
  props: browser.tabs.CreateProperties
): Promise<browser.tabs.Tab> {
  if (!props.discarded) return browser.tabs.create(props)

  const { discarded: _discarded, title, ...nativeProps } = props
  const targetUrl = typeof nativeProps.url === 'string' ? nativeProps.url : undefined
  if (targetUrl) nativeProps.url = Utils.createPlaceholderUrl({ url: targetUrl, title })

  const created = await browser.tabs.create(nativeProps)
  const discarded = await browser.tabs.discard(created.id)
  return discarded ?? created
}
