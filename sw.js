// Service worker de MercaDieta — estrategia deliberadamente conservadora.
//
// IMPORTANTE: como el proyecto ya sufrio problemas de cache del navegador
// (el coach.js quedandose desactualizado), este service worker usa
// "network-first" para todo el codigo de la app: SIEMPRE intenta traer la
// version mas reciente de la red primero, y solo usa la copia guardada si
// no hay conexion. Nunca sirve una version vieja de un .js/.html teniendo
// internet disponible. Esto da instalabilidad + funcionamiento offline
// basico sin añadir una segunda capa de cache "agresiva" que confunda mas.
//
// Sube CACHE_VERSION cada vez que quieras forzar que los dispositivos
// limpien su copia guardada (normalmente no hace falta, se auto-actualiza).
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'mercadieta-' + CACHE_VERSION;

// Solo lo estrictamente estatico y que casi nunca cambia.
const PRECACHE = [
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Las llamadas a la API nunca se cachean: siempre deben ir a la red
  // (login, chat, sincronizacion de datos... nada de esto debe servirse
  // "viejo").
  if (url.pathname.startsWith('/api/')) return;

  // Solo gestionamos peticiones GET del mismo origen; todo lo demas
  // (POST, otros dominios como el CDN de jsPDF) pasa directo a la red.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
