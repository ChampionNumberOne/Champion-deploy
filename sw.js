/* sw.js | Service worker: приложение работает без сети
   ============================================================
   Версию и список файлов подставляет build.js при сборке (строки с
   пометкой BUILD). В корне проекта лежит заготовка: с пустым списком
   она ничего не кеширует, поэтому при разработке не мешает.

   Как работает:
     • при установке кладёт все файлы приложения в кеш устройства;
     • дальше отдаёт их из кеша — мгновенно и без интернета;
     • новая версия (после деплоя) скачивается в фоне целиком и
       подменяет старую: либо всё новое, либо всё старое, без смеси;
     • чужие адреса (Telegram, сервер ключей) не трогает вообще.
   ============================================================ */
const VERSION = "054f1e1632";
const FILES = ["./","index.html","app.min.js","styles.css","manifest.json","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","fonts/fraunces-latin-wght-normal.woff2","fonts/manrope-cyrillic-wght-normal.woff2","fonts/manrope-latin-wght-normal.woff2"];
const PREFIX = 'turnik-';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // cache:'reload' — берём с сервера, минуя HTTP-кеш браузера,
      // иначе в «новую» версию может попасть старый файл
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.indexOf(PREFIX) === 0 && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // чужие адреса — мимо
  if (!FILES.length) return;                                 // заготовка без сборки
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        if (hit) return hit;
        return fetch(req).catch(() => {
          // нет сети и файла нет в кеше: для перехода по адресу отдаём приложение
          if (req.mode === 'navigate') return cache.match('./', { ignoreSearch: true });
          return Response.error();
        });
      })
    )
  );
});
