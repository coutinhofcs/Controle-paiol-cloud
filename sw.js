
self.addEventListener('install', e=>{
  e.waitUntil(caches.open('paiol-final-v1').then(c=>c.addAll(['.','index.html','manifest.webmanifest','script.js'])));
});
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
