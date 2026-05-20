/**
 * Simple in-memory rate limiter.
 * Tracks request counts per key within a sliding 60-second window.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 60 seconds to avoid memory leaks.
const CLEANUP_INTERVAL = 60_000;
const WINDOW_MS = 60_000; // 1 minute

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Allow the process to exit even if the timer is still running.
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Returns `true` if the request is allowed, `false` if rate limited.
 * @param key   Identifier (e.g. session ID or IP).
 * @param limit Max requests per minute (default 30).
 */
export function checkRateLimit(key: string, limit = 30): boolean {
  ensureCleanup();

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Drop timestamps outside the window.
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    return false; // rate limited
  }

  entry.timestamps.push(now);
  return true;
}
