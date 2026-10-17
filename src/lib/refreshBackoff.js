/**
 * How a failed signed-URL refresh is retried.
 *
 * A refresh that throws — a server restart, a 5xx, a dropped connection — used
 * to leave the timer scheduled at `max(0, expiry - margin)`, which is 0 once
 * the id has expired: the next attempt fired immediately, failed, and fired
 * again, for as long as the server was down and then forever after, because an
 * id that has already expired never becomes due again. `useThumbnailUrls` had
 * the same loop and additionally treated the entries it gave up on as "in
 * progress", so they were never fetched again.
 *
 * Both hooks back off through this sequence and then stop. What takes over
 * after that is a fresh mint: a refetch when `items` changes, or the player's
 * `onError` recovery remint.
 */

/** 5 s, 15 s, 60 s, then the last step repeated to the cap. */
export const REFRESH_BACKOFF_MS = [5000, 15000, 60000];

/** After this many consecutive failures the id is given up on. */
export const REFRESH_BACKOFF_LIMIT = 5;

/**
 * The delay before the next attempt, or null when the budget is spent.
 *
 * @param {number} failures - Consecutive failures so far, starting at 1.
 * @returns {number | null}
 */
export function nextBackoffDelay(failures) {
  if (failures >= REFRESH_BACKOFF_LIMIT) {
    return null;
  }
  const step = REFRESH_BACKOFF_MS.length;
  const index = Math.min(failures - 1, step - 1);
  return REFRESH_BACKOFF_MS[index];
}