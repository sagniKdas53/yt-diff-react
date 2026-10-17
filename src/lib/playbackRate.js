/**
 * The speeds the player offers, and the one it remembers.
 *
 * A static list on purpose: the menu is a picker, not a slider, and the values
 * are the ones people expect to find rather than a continuum. Shared with the
 * keyboard shortcuts so `<` and `>` step through exactly what the menu lists.
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Where the choice is kept, alongside volume and autoplay. */
export const PLAYBACK_RATE_KEY = "ytdiff_player_rate";

/** The saved rate, falling back to normal speed for anything odd. */
export function readStoredRate() {
  const saved = Number.parseFloat(localStorage.getItem(PLAYBACK_RATE_KEY));
  return PLAYBACK_RATES.includes(saved) ? saved : 1;
}
