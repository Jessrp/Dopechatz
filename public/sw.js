self.addEventListener('push', function(event) {
  const data = event.data?.json() || {}
  const title = data.title || 'Dopechatz'
  const options = {
    body: data.body || 'New message in your neighborhood',
    icon: '/icon.png',
    badge: '/icon.png',
    data: data.url || '/',
    vibrate: [100, 50, 100]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data))
})
