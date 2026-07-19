import { describe, expect, test } from 'vitest'
import { isTabAtMoveDestination } from '../tab-move'

describe('isTabAtMoveDestination', () => {
  const tabs = [
    { id: 10, index: 0 },
    { id: 11, index: 1 },
    { id: 12, index: 2 },
  ]

  test('accepts a move already reflected in the Sidebery model', () => {
    expect(isTabAtMoveDestination(tabs, 12, 2)).toBe(true)
  })

  test('rejects mismatched ids and stale indexes', () => {
    expect(isTabAtMoveDestination(tabs, 11, 2)).toBe(false)
    expect(isTabAtMoveDestination([{ id: 12, index: 1 }], 12, 0)).toBe(false)
  })
})
