// Exact Canva exports supplied in `trace logo/`. Keep all branding references here.
export const TRACE_BRANDING = {
  light: '/trace-logo-light.png',
  dark: '/trace-logo-dark.png',
  width: 2000,
  height: 2000,
  // Both exports have the same transparent canvas. This viewport includes the
  // complete artwork plus breathing room, without editing either PNG.
  viewBox: '398 529 1313 988',
  favicon: '/trace-favicon.svg',
  faviconDark: '/trace-favicon-dark.svg',
}

export function applyBrandIcon(dark) {
  const icon = document.querySelector('link[rel="icon"]')
  if (icon) icon.setAttribute('href', dark ? TRACE_BRANDING.faviconDark : TRACE_BRANDING.favicon)
}
