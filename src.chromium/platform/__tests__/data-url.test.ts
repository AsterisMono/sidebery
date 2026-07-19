import { expect, test } from 'vitest'
import { blobToDataUrl } from '../data-url'

test('encodes snapshot exports without a service-worker object URL', async () => {
  const url = await blobToDataUrl(new Blob(['Sidebery ✓'], { type: 'text/plain;charset=utf-8' }))
  expect(url.startsWith('data:text/plain;charset=utf-8;base64,')).toBe(true)
  const base64 = url.slice(url.indexOf(',') + 1)
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
  expect(new TextDecoder().decode(bytes)).toBe('Sidebery ✓')
})
