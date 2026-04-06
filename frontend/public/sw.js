// Service Worker SIG FTTH — base-aware
const CACHE_NAME = 'sig-ftth-v6'
const BASE = '/sig-ftth/'
const URLS = [BASE, BASE + 'index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Ne pas intercepter les requêtes API/WS
  if (e.request.url.includes('/api/') || e.request.url.includes('/auth/') || e.request.url.startsWith('ws')) return
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
})
