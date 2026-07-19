import { afterEach, describe, expect, test, vi } from 'vitest'
import { translate } from 'src/dict'

const originalTranslations = globalThis.translations
const originalGetMessage = browser.i18n.getMessage

afterEach(() => {
  globalThis.translations = originalTranslations
  browser.i18n.getMessage = originalGetMessage
})

describe('Chromium translations', () => {
  test('uses browser messages in an MV3 service worker', () => {
    globalThis.translations = undefined
    browser.i18n.getMessage = vi.fn(id => (id === 'panel_tabs_title' ? 'Tabs' : ''))

    expect(translate('panel.tabs.title')).toBe('Tabs')
    expect(browser.i18n.getMessage).toHaveBeenCalledWith('panel_tabs_title')
  })

  test('sees a page translation catalog loaded after module evaluation', () => {
    globalThis.translations = undefined
    browser.i18n.getMessage = vi.fn(() => '')
    expect(translate('late.message')).toBe('late.message')

    globalThis.translations = { 'late.message': { en: 'Loaded later' } }
    expect(translate('late.message')).toBe('Loaded later')
  })
})
