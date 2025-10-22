const CACHE_NAME = 'treino-app-v1';
const BASE = '/Treino-Tracker/'; 
const urlsToCache = [
  BASE,
  BASE + 'index.html',
  BASE + 'styles.css',
  BASE + 'image/imagem_1.png',
  BASE + 'manifest.json',

];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => console.log('Arquivos pré-cacheados com sucesso'))
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});


self.addEventListener('fetch', event => {
  let url = event.request.url;

  if (url.startsWith(self.origin) && !url.includes(BASE)) {
    url = self.origin + BASE + url.substring(self.origin.length + 1);
  }

  event.respondWith(
    caches.match(url)
      .then(response => response || fetch(url))
      .catch(() => caches.match(BASE + 'index.html')) 
  );
});
