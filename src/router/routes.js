/**
 * The URL grammar, as pure functions.
 *
 * No React and no `history` in here on purpose: the mapping between a location
 * and what the app is showing is the part worth testing on its own, and it is
 * the part that survives if the plumbing around it is ever replaced by a real
 * router (see `RouterProvider`'s note on that).
 *
 * The grammar lives in the fragment rather than the path because the backend
 * serves static assets out of an exact-match table (`makeAssets` in the
 * server's `index.ts`) with no history fallback — a GET for `/ytdiff/playlist/x`
 * is a hard 404 there. A fragment never reaches the server, so hash routing
 * needs no backend change at all. There is no SEO stake in a self-hosted tool
 * behind a login, which is the usual reason to pay for path routing.
 *
 *   #/                        nothing selected; the right panel is empty
 *   #/unlisted                the videos that belong to no playlist
 *   #/playlist/<encoded url>  one playlist
 *   ...?v=<encoded url>       the player, open on one video
 *
 * Playlist and video URLs are the primary keys the backend already uses
 * (`PlaylistMetadata.playlistUrl`, `VideoMetadata.videoUrl`), so they go in
 * whole and percent-encoded. That makes for long links. The alternative is a
 * short id column and a lookup endpoint, which is a migration; this format
 * costs nothing to ship and can be redirected from later if anyone turns out
 * to share these links.
 */

/** No playlist selected. The value the app has always used for this. */
export const NO_PLAYLIST = "init";

/** The pseudo-playlist holding videos that belong to no playlist. */
export const UNLISTED = "None";

const PLAYLIST_SEGMENT = "playlist";
const UNLISTED_SEGMENT = "unlisted";
const VIDEO_PARAM = "v";

/**
 * @typedef {Object} Route
 * @property {string} playlistUrl - `NO_PLAYLIST`, `UNLISTED`, or a playlist URL.
 * @property {?string} videoUrl - The video the player is open on, or null.
 */

/** Where an empty, unrecognised or malformed location lands. */
export const ROOT_ROUTE = Object.freeze({
  playlistUrl: NO_PLAYLIST,
  videoUrl: null,
});

/** `decodeURIComponent` throws on a lone `%`; a bad link is not a crash. */
function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Splits on the first `?` only — a query value may contain more of them. */
function splitQuery(location) {
  const at = location.indexOf("?");
  if (at === -1) return [location, ""];
  return [location.slice(0, at), location.slice(at + 1)];
}

function readVideoParam(search) {
  if (!search) return null;
  const value = new URLSearchParams(search).get(VIDEO_PARAM);
  return value ? value : null;
}

/**
 * Reads a location fragment into the state it names.
 *
 * Total by construction: anything it does not recognise is `ROOT_ROUTE`,
 * because a link that has rotted should open the app, not break it.
 *
 * @param {?string} hash - `location.hash`, with or without the leading `#`.
 * @returns {Route}
 */
export function parseRoute(hash) {
  const raw = typeof hash === "string" ? hash : "";
  const [path, search] = splitQuery(raw.startsWith("#") ? raw.slice(1) : raw);
  const segments = path.split("/").filter(Boolean);
  const videoUrl = readVideoParam(search);

  if (segments.length === 0) {
    // A video with no list to play it from is not a location the app can show.
    return { ...ROOT_ROUTE };
  }

  if (segments.length === 1 && segments[0] === UNLISTED_SEGMENT) {
    return { playlistUrl: UNLISTED, videoUrl };
  }

  if (segments.length === 2 && segments[0] === PLAYLIST_SEGMENT) {
    const playlistUrl = decodeSegment(segments[1]);
    // A hand-written `#/playlist/None` means the unlisted view; `#/playlist/init`
    // means nothing selected. Normalising here keeps parse(format(x)) total.
    if (playlistUrl === UNLISTED) return { playlistUrl: UNLISTED, videoUrl };
    if (playlistUrl === NO_PLAYLIST || !playlistUrl) return { ...ROOT_ROUTE };
    return { playlistUrl, videoUrl };
  }

  return { ...ROOT_ROUTE };
}

/**
 * Writes a route back out as a location fragment, always with a leading `#`.
 *
 * @param {?Route} route
 * @returns {string}
 */
export function formatRoute(route) {
  const playlistUrl = route?.playlistUrl ?? NO_PLAYLIST;
  const videoUrl = route?.videoUrl ?? null;

  let path = "/";
  if (playlistUrl === UNLISTED) {
    path = `/${UNLISTED_SEGMENT}`;
  } else if (playlistUrl && playlistUrl !== NO_PLAYLIST) {
    path = `/${PLAYLIST_SEGMENT}/${encodeURIComponent(playlistUrl)}`;
  }

  // The player is always opened from a row of some list, so a video outside
  // one is dropped rather than written to a location that cannot be parsed back.
  if (videoUrl && path !== "/") {
    const params = new URLSearchParams();
    params.set(VIDEO_PARAM, videoUrl);
    return `#${path}?${params.toString()}`;
  }

  return `#${path}`;
}
