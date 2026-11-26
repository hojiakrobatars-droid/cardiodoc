/* Лист обхода: офлайн-кэш. Страница — сначала сеть (до 3 с), иначе сохранённая копия. Остальное — из кэша с обновлением в фоне. */
var CACHE='obhod-cache-v1';
var SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

function timeout(ms){return new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},ms);});}
function store(req,res){
  if(res&&(res.ok||res.type==='opaque')){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
  return res;
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  if(req.mode==='navigate'){
    e.respondWith(
      Promise.race([fetch(req).then(function(res){
        if(res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});}
        return res;
      }),timeout(3000)]).catch(function(){
        return caches.match('./index.html').then(function(r){return r||caches.match('./');});
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    var net=fetch(req).then(function(res){return store(req,res);}).catch(function(){return hit;});
    return hit||net;
  }));
});
