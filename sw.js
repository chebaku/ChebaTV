const USERSCRIPT_PATH = '/userscript.bundle.js';
const TWITCH_DOMAINS = ['twitch.tv', 'www.twitch.tv', 'lg.tv.twitch.tv', 'tv.twitch.tv'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept our own script requests
  if (url.pathname === USERSCRIPT_PATH) {
    return;
  }

  // Only intercept navigation requests to Twitch domains
  const isTwitchNav = TWITCH_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith('.' + d));

  if (isTwitchNav && event.request.mode === 'navigate') {
    event.respondWith(interceptAndInject(event.request));
  }
});

async function interceptAndInject(request) {
  try {
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return response;
    }

    const html = await response.text();

    // Fetch the user script bundle from the app's origin
    const scriptResp = await fetch(USERSCRIPT_PATH);
    const scriptContent = await scriptResp.text();

    // Inject user script into the page
    const injectedHtml = html.replace(
      '</body>',
      `<script>${scriptContent}<\/script></body>`
    );

    return new Response(injectedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (e) {
    console.warn('[ChebaTV SW] Injection failed, falling back to direct load:', e);
    return fetch(request);
  }
}
