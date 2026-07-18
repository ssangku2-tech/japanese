/* 하루、일본어 서비스워커 — 오프라인 캐시
   앱 파일 수정 후에는 아래 CACHE 버전 숫자를 올려야 갱신됩니다 */
const CACHE='nihongo-v8';
const ASSETS=['./','./index.html','./words.js','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  const u=e.request.url;
  // Firebase/폰트/TTS 등 외부 요청은 항상 네트워크로
  if(!u.startsWith(self.location.origin)||u.includes('firebase')){return}
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      // 새로 받은 같은 출처 파일은 캐시에 갱신
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
