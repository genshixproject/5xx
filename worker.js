addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

const FALLBACK_URL = 'https://raw.githubusercontent.com/genshixproject/5xx/main/index.html'
const TTL = 600

export default {
  async fetch(request, env, ctx) {
    return new Response('Hello World!');
  },
};
async function handleRequest(event) {
  const request = event.request

  try {
    const response = await fetch(request)

    if (!response.ok && response.status >= 500) {
      throw new Error(`Upstream error ${response.status}`)
    }

    return response
  } catch (err) {
    const cache = caches.default
    let cachedResponse = await cache.match(FALLBACK_URL)

    if (cachedResponse) {
      return new Response(await cachedResponse.text(), {
        status: 503,
        headers: {
          'Content-Type': 'text/html',
          'X-Cache': 'HIT'
        }
      })
    }

    const fallback = await fetch(FALLBACK_URL, {
      cf: {
        cacheTtl: TTL,
        cacheEverything: true
      }
    })

    const fallbackText = await fallback.text()

    const response = new Response(fallbackText, {
      status: 503,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': `public, max-age=${TTL}`,
        'X-Cache': 'MISS'
      }
    })

    event.waitUntil(cache.put(FALLBACK_URL, response.clone()))
    return response
  }
}
