/**
 * Registers the service worker emitted at /sw.js by the production build.
 * In development there is no worker (HMR and caching don't mix).
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV)
    return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}
