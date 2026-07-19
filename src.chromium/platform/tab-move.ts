type IndexedTab = {
  id: ID
  index: number
}

/**
 * A Chromium move event can arrive after Sidebery has already projected the
 * tab at its destination. Treat that replay as successfully reconciled.
 */
export function isTabAtMoveDestination(
  tabs: readonly IndexedTab[],
  tabId: ID,
  toIndex: number
): boolean {
  const tab = tabs[toIndex]
  return tab?.id === tabId && tab.index === toIndex
}
