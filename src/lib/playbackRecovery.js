/**
 * When a media error is worth another try, and when it is the file's fault.
 *
 * `<video>` errors arrive as codes, and the player's answer to every one of
 * them used to be "mint a new URL and try again", with no limit. A file the
 * browser cannot decode made that a loop: 25 code-4 errors produced 25 more
 * `/getfile` requests. One retry has to stay, because an expired signed URL
 * also surfaces as code 4, and a remint fixes exactly that.
 *
 * Pure on purpose: no React, no timers, so the rules can be tested alone.
 *
 * @typedef {{ retries: number, lastErrorAt: number | null }} RecoveryState
 *   `lastErrorAt` is a position in the media, in seconds, not a clock time.
 */

/** Retries allowed per MediaError code. 4 is "source not supported". */
const MAX_RETRIES = { 4: 1, 2: 2, 3: 2 };

/**
 * How far past the last error playback must get before the budget refills.
 * Measured in media seconds so a file that dies at the same spot every time is
 * not forgiven by a second of playback after each remint, while a long video
 * with two unrelated glitches an hour apart is.
 */
const RESET_AFTER_SECONDS = 10;

/** @returns {RecoveryState} */
export function initialRecovery() {
  return { retries: 0, lastErrorAt: null };
}

/**
 * @param {RecoveryState} state
 * @param {number | null | undefined} code - `MediaError.code`.
 * @param {number} currentTime - Where in the media the error happened.
 * @returns {{ action: "retry" | "fail" | "ignore", state: RecoveryState }}
 */
export function onMediaError(state, code, currentTime) {
  // Code 1 is the load being aborted, which the app does itself when it
  // switches tracks. Anything unlisted is not something a remint can fix.
  const max = MAX_RETRIES[code];
  if (max === undefined) {
    return { action: "ignore", state };
  }
  // One counter for all codes: a stream that has already needed two network
  // retries should not get a fresh budget because the next error has a
  // different number.
  if (state.retries >= max) {
    return { action: "fail", state: { ...state, lastErrorAt: currentTime } };
  }
  return {
    action: "retry",
    state: { retries: state.retries + 1, lastErrorAt: currentTime },
  };
}

/**
 * Call on every time update. Gives the retries back once playback has moved
 * well past the last error.
 *
 * @param {RecoveryState} state
 * @param {number} currentTime
 * @returns {RecoveryState}
 */
export function onPlaybackAdvanced(state, currentTime) {
  if (
    state.lastErrorAt !== null &&
    currentTime - state.lastErrorAt >= RESET_AFTER_SECONDS
  ) {
    return initialRecovery();
  }
  return state;
}
