interface ReplaceableTab {
  id: ID
  parentId?: ID
  openerTabId?: ID
  relGroupId?: ID
  successorTabId?: ID
  reopening?: { id: ID }
  urgentTabIds?: Set<ID>
}

export function replaceId(ids: ID[], removedTabId: ID, addedTabId: ID): void {
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === removedTabId) ids[i] = addedTabId
  }
}

export function replaceTabId<T extends ReplaceableTab>(
  byId: Partial<Record<ID, T>>,
  tabs: T[],
  addedTabId: ID,
  removedTabId: ID
): T | undefined {
  const tab = byId[removedTabId]
  if (!tab || byId[addedTabId]) return undefined

  delete byId[removedTabId]
  tab.id = addedTabId
  byId[addedTabId] = tab

  for (const current of tabs) {
    if (current.parentId === removedTabId) current.parentId = addedTabId
    if (current.openerTabId === removedTabId) current.openerTabId = addedTabId
    if (current.relGroupId === removedTabId) current.relGroupId = addedTabId
    if (current.successorTabId === removedTabId) current.successorTabId = addedTabId
    if (current.reopening?.id === removedTabId) current.reopening.id = addedTabId
    if (current.urgentTabIds?.delete(removedTabId)) current.urgentTabIds.add(addedTabId)
  }

  return tab
}
