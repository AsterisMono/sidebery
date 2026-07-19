const EXTENSION_PROTOCOLS = new Set(['chrome-extension:', 'moz-extension:'])

export const URL_TRANSLATIONS: Readonly<Record<string, string>> = {
  'about:newtab': 'chrome://newtab/',
  'about:privatebrowsing': 'chrome://newtab/',
  'about:blank': 'about:blank',
}

export function translateBrowserUrl(url: string): string {
  return URL_TRANSLATIONS[url] ?? url
}

export function getNewTabUrl(_incognito = false): string {
  return URL_TRANSLATIONS['about:newtab']
}

export function isNewTabUrl(url?: string): boolean {
  if (!url) return false
  return (
    url === 'about:newtab' ||
    url === 'about:privatebrowsing' ||
    url === 'chrome://newtab' ||
    url === 'chrome://newtab/'
  )
}

export function isExtensionUrl(url?: string): boolean {
  if (!url) return false
  try {
    return EXTENSION_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

export function isExtensionPageUrl(url: string, pagePath: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      EXTENSION_PROTOCOLS.has(parsed.protocol) &&
      parsed.pathname === `/${pagePath.replace(/^\/+/, '')}`
    )
  } catch {
    return false
  }
}

export function replaceExternalGroupUrl(url: string, currentGroupUrl: string): string {
  try {
    const parsed = new URL(url)
    if (!EXTENSION_PROTOCOLS.has(parsed.protocol)) return url
    if (
      parsed.pathname !== '/sidebery/group.html' &&
      parsed.pathname !== '/page.group/group.html' &&
      parsed.pathname !== '/group/group.html'
    ) {
      return url
    }
    return `${currentGroupUrl}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}
