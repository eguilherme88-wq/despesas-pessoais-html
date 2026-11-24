/* Service worker do FinançasApp – Controle de Gastos.
 * Para não conflitar com outros apps publicados no mesmo site:
 *  - usa um prefixo de cache exclusivo e só apaga os próprios caches;
 *  - só responde a pedidos dentro da própria pasta (scope);
 *  - não intercepta Firebase, CDNs nem outros domínios (os dados continuam sempre online).
 */
const PREFIXO_CACHE = 'financasapp-controle-gastos-';
const CACHE_ATUAL = PREFIXO_CACHE + 'v1.29';
const ARQUIVOS_BASE = [
  './',
  './index.html',
  './manifest.webmanifest?v=1.29',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_ATUAL)
      .then((cache) => Promise.allSettled(ARQUIVOS_BASE.map((arquivo) => cache.add(arquivo))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes
          .filter((nome) => nome.startsWith(PREFIXO_CACHE) && nome !== CACHE_ATUAL)
          .map((nome) => caches.delete(nome))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;            // Firebase, CDNs etc.: direto na rede
  if (!pedido.url.startsWith(self.registration.scope)) return; // fora da pasta deste app

  // Rede primeiro (sempre a versão mais nova); cache só quando estiver sem internet
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta && resposta.ok && resposta.type === 'basic') {
          const copia = resposta.clone();
          caches.open(CACHE_ATUAL).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido, { ignoreSearch: pedido.mode === 'navigate' })
        .then((emCache) => emCache || (pedido.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then((resposta) => resposta || Response.error()))
  );
});
