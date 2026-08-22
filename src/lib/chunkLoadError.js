/**
 * A dynamic import that could not be fetched.
 *
 * Every deploy rehashes the chunk filenames, so a tab left open across one
 * asks for a file that no longer exists. That is not a bug in the app — it is
 * a tab running yesterday's index against today's server — and the fix is to
 * load the new build rather than show the user a stack trace.
 *
 * The wording differs per browser, and none of it is standardised, so this
 * matches on the shapes the three engines actually produce.
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  if (error.name === "ChunkLoadError") return true;

  const message = String(error.message || error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Unable to preload CSS/i.test(message) ||
    /'text\/html' is not a valid JavaScript MIME type/i.test(message)
  );
}
