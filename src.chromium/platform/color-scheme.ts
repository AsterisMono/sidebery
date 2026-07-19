export type PageColorScheme = 'dark' | 'light'

const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

export function watchSystemColorScheme(onChange: (scheme: PageColorScheme) => void): () => void {
  const media = window.matchMedia(DARK_COLOR_SCHEME_QUERY)
  const update = () => onChange(media.matches ? 'dark' : 'light')

  media.addEventListener('change', update)
  update()

  return () => media.removeEventListener('change', update)
}
