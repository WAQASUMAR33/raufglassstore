import { NextResponse } from 'next/server';

// Global cache map to persist across module reloads in Node.js runtime
const globalForCache = globalThis;
if (!globalForCache.__appServerCache) {
  globalForCache.__appServerCache = new Map();
}
const cache = globalForCache.__appServerCache;

/**
 * Retrieve an item from the cache if not expired.
 * @param {string} key
 * @returns {any | null}
 */
export function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

/**
 * Store an item in the cache with a time-to-live in seconds.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds
 */
export function setCached(key, data, ttlSeconds = 60) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate all keys matching a prefix or pattern.
 * @param {string} prefix
 */
export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate everything in the server cache.
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Helper to get or execute and cache an async operation.
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<any>} fetcher
 * @returns {Promise<any>}
 */
export async function withCache(key, ttlSeconds, fetcher) {
  const cached = getCached(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const result = await fetcher();
  if (result !== undefined && result !== null) {
    setCached(key, result, ttlSeconds);
  }
  return result;
}

/**
 * Helper for returning a cached JSON response with HTTP Cache-Control headers.
 * @param {any} data
 * @param {number} status
 * @param {number} maxAge
 * @returns {NextResponse}
 */
export function cachedJsonResponse(data, status = 200, maxAge = 30) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    },
  });
}

