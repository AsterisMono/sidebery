const LANG_REG = browser.i18n.getUILanguage().replace('-', '_')
export const LANG = LANG_REG.slice(0, 2)

// Window does not exist in an MV3 service worker, while globalThis is shared by
// both window-backed extension pages and the worker.
const translations = (
  globalThis as typeof globalThis & {
    translations?: Record<string, Record<string, TranslationFn | string>>
  }
).translations

const dict: Record<string, TranslationFn | string> = {}
if (translations) {
  for (const key of Object.keys(translations)) {
    const prop = translations[key]
    dict[key] = prop[LANG_REG] ?? prop[LANG] ?? prop.en
  }
}

function isString(r: string | TranslationFn): r is string {
  return r.constructor === String
}

export function translate(id?: string, ...args: (number | string | undefined)[]): string {
  if (!id) return ''

  const record = dict[id]
  if (record === undefined) return id

  if (isString(record)) return record
  return record(...args)
}
