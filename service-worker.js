self.addEventListener('install', event => {
  console.log('Service Worker instalado');
});

const BASE = '/Treino-Tracker/'; // troque pelo nome real

self.addEventListener('fetch', event => {
  let url = event.request.url;

  if (url.startsWith(self.origin) && !url.includes(BASE)) {
    url = self.origin + BASE + url.substring(self.origin.length + 1);
  }

  event.respondWith(fetch(url).catch(() => caches.match(event.request)));
});