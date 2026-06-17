export type Theme = 'dark' | 'light'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('aiub-theme') as Theme | null
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark' // default dark
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  localStorage.setItem('aiub-theme', theme)
}

// Inline script string to prevent FOUC — insert in <head> as dangerouslySetInnerHTML
export const THEME_SCRIPT = `
(function(){
  var t = localStorage.getItem('aiub-theme') || 'dark';
  document.documentElement.classList.add(t);
})();
`.trim()
