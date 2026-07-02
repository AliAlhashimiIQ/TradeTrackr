/**
 * Simple in-memory TTL cache for API responses.
 * No dependencies. Automatically invalidates after TTL.
 * Call `invalidate(key)` or `invalidateAll()` after any write operation.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

// Singleton — one cache for the whole session
export const cache = new TTLCache();

// TTL presets
export const TTL = {
  SHORT: 30_000,    // 30s — for frequently changing data
  DEFAULT: 60_000,  // 60s — standard
  LONG: 300_000,    // 5m — for slow-changing data (accounts, tags)
} as const;

/**
 * Wrap an async function with cache-aside pattern.
 * If the key exists and is fresh, returns cached value.
 * Otherwise calls fn(), caches the result, and returns it.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = TTL.DEFAULT
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const data = await fn();
  cache.set(key, data, ttlMs);
  return data;
}
