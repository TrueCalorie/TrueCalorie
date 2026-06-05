self.addEventListener('push', event => {
  let data = { title: 'TrueCalorie', body: '', url: '/' }
  try { data = event.data.json() } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})
