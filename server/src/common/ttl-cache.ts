/**
 * ttl-cache.ts
 *
 * A tiny in-memory cache with per-entry TTL and a hard size cap.
 *
 * Why in-memory and not Redis?
 *   At the current scale (single server process) a per-process cache
 *   eliminates the round-trip to Postgres for hot reads (e.g. user
 *   role lookups on every authenticated request) without the
 *   operational overhead of standing up Redis. When the service is
 *   horizontally scaled this should be swapped for a shared cache —
 *   see SCALABILITY.md.
 *
 * Design notes:
 *   - Stores at most `maxEntries` items. When the cap is hit we evict
 *     the oldest entry (Map preserves insertion order in JS, so the
 *     first key returned by keys() is the oldest).
 *   - Expired entries are detected lazily on `get` and dropped, so a
 *     cold key never returns stale data.
 *   - No background timers — this means the cache never wakes the
 *     event loop on its own and shuts down cleanly.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<K, V> {
  private readonly store = new Map<K, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number = 1000,
  ) {
    if (ttlMs <= 0) throw new Error('TtlCache ttlMs must be > 0');
    if (maxEntries <= 0) throw new Error('TtlCache maxEntries must be > 0');
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    // Refresh insertion order on overwrite so the LRU-ish eviction
    // doesn't kick out an entry that was just updated.
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value as K | undefined;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Test helper. Don't rely on this in production code paths. */
  size(): number {
    return this.store.size;
  }
}
