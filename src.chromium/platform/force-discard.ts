/** Clear beforeunload handlers using MV3 scripting with a serialized function. */
export function prepareTabForForceDiscard(tabId: ID): Promise<unknown> {
  return chrome.scripting.executeScript({
    target: { tabId: Number(tabId), allFrames: true },
    injectImmediately: true,
    func: () => {
      window.onbeforeunload = null
      window.addEventListener('beforeunload', event => {
        event.returnValue = ''
      })
    },
  })
}
