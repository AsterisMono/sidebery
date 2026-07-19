const LANG_REG = browser.i18n.getUILanguage().replace('-', '_')
export const LANG = LANG_REG.slice(0, 2)

type TranslationCatalog = Record<string, Record<string, TranslationFn | string>>

function getTranslation(id: string): TranslationFn | string | undefined {
  // Locale entry scripts can finish after this module is evaluated, so read the
  // page catalog lazily instead of taking a one-time snapshot.
  const translations = (
    globalThis as typeof globalThis & {
      translations?: TranslationCatalog
    }
  ).translations
  const record = translations?.[id]
  return record?.[LANG_REG] ?? record?.[LANG] ?? record?.en
}

function getBrowserMessage(id: string): string {
  // MV3 service workers do not load the page locale scripts. Static strings
  // needed there are mirrored into messages.json with normalized identifiers.
  const messageId = id.replace(/[^A-Za-z0-9_@]/g, '_')
  return browser.i18n.getMessage?.(messageId) ?? ''
}

function isString(record: string | TranslationFn): record is string {
  return record.constructor === String
}

export function translate(id?: string, ...args: (number | string | undefined)[]): string {
  if (!id) return ''

  const record = getTranslation(id)
  if (record === undefined) return getBrowserMessage(id) || id

  if (isString(record)) return record
  return record(...args)
}
