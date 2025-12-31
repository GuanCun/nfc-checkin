// Service Worker - 缓存静态资源
const CACHE_NAME = 'nfc-checkin-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// 请求拦截 - 优先使用缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 缓存命中则返回缓存，否则发起网络请求
      return response || fetch(event.request).then((fetchResponse) => {
        // 动态缓存其他资源
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone())
          return fetchResponse
        })
      })
    }).catch(() => {
      // 网络失败时的降级处理
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html')
      }
    })
  )
})
