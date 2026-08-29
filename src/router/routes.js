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
 *   ...?pp=26&ps=10           which page of the playlist list, and its size
 *   ...?vp=4&vs=8             which page of the video list, and its size
 *
 * Playlist and video URLs are the primary keys the backend already uses
 * (`PlaylistMetadata.playlistUrl`, `VideoMetadata.videoUrl`), so they go in
 * whole and percent-encoded. That makes for long links. The alternative is a
 * short id column and a lookup endpoint, which is a migration; this format
 * costs nothing to ship and can be redirected from later if anyone turns out
 * to share these links.
 *
 * **Pagination is in the URL because resuming needs it.** Opening a link to a
 * playlist that sits on page 26 of the list, or to page 4 of its videos, has
 * to put both panels where they were — otherwise "resume" means the right
 * panel is right and the left panel is on page 1. Page numbers are written
 * 1-based because that is what the pagination controls display; everything
 * inside the app counts pages from zero.
 */

/** No playlist selected. The value the app has always used for this. */
export const NO_PLAYLIST = "init";

/** The pseudo-playlist holding videos that belong to no playlist. */
export const UNLISTED = "None";

/**
 * Page sizes the two lists start on. They are the grammar's defaults as well
 * as the components' initial state, so a location that says nothing about
 * pagination and a location that spells out the defaults mean the same thing —
 * and only the first is ever written.
 */
export const DEFAULT_PLAYLIST_PAGE_SIZE = 10;
export const DEFAULT_VIDEO_PAGE_SIZE = 8;

const PLAYLIST_SEGMENT = "playlist";
const UNLISTED_SEGMENT = "unlisted";
const VIDEO_PARAM = "v";
const PLAYLIST_PAGE_PARAM = "pp";
const PLAYLIST_SIZE_PARAM = "ps";
const VIDEO_PAGE_PARAM = "vp";
const VIDEO_SIZE_PARAM = "vs";

/**
 * @typedef {Object} Route
 * @property {string} playlistUrl - `NO_PLAYLIST`, `UNLISTED`, or a playlist URL.
 * @property {?string} videoUrl - The video the player is open on, or null.
 * @property {number} playlistPage - Zero-based page of the playlist list.
 * @property {number} playlistPageSize - Rows per page in the playlist list.
 * @property {number} videoPage - Zero-based page of the video list.
 * @property {number} videoPageSize - Rows per page in the video list.
 */

/** Where an empty, unrecognised or malformed location lands. */
export const ROOT_ROUTE = Object.freeze({
  playlistUrl: NO_PLAYLIST,
  videoUrl: null,
  playlistPage: 0,
  playlistPageSize: DEFAULT_PLAYLIST_PAGE_SIZE,
  videoPage: 0,
  videoPageSize: DEFAULT_VIDEO_PAGE_SIZE,
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

/**
 * Reads a positive integer parameter, falling back to `fallback`.
 *
 * Hand-edited and rotted links reach this: `?vp=0`, `?vp=-3`, `?vp=abc` and a
 * missing parameter all mean the same thing, which is "the app decides".
 */
function readCount(params, name, fallback) {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

/** Reads the pagination half of a location's query string. */
function readPagination(search) {
  const params = new URLSearchParams(search);
  return {
    // 1-based in the URL, zero-based everywhere inside the app.
    playlistPage: readCount(params, PLAYLIST_PAGE_PARAM, 1) - 1,
    playlistPageSize: readCount(
      params,
      PLAYLIST_SIZE_PARAM,
      DEFAULT_PLAYLIST_PAGE_SIZE,
    ),
    videoPage: readCount(params, VIDEO_PAGE_PARAM, 1) - 1,
    videoPageSize: readCount(params, VIDEO_SIZE_PARAM, DEFAULT_VIDEO_PAGE_SIZE),
  };
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
  const params = new URLSearchParams(search);
  const videoUrl = params.get(VIDEO_PARAM) || null;
  const pagination = readPagination(search);

  // The playlist list is on screen at every location, so where it is paged to
  // survives even a location that names no playlist.
  const listOnly = {
    ...ROOT_ROUTE,
    playlistPage: pagination.playlistPage,
    playlistPageSize: pagination.playlistPageSize,
  };

  if (segments.length === 0) {
    // A video with no list to play it from is not a location the app can show,
    // and neither is a page of a video list that is not open.
    return listOnly;
  }

  if (segments.length === 1 && segments[0] === UNLISTED_SEGMENT) {
    return { ...pagination, playlistUrl: UNLISTED, videoUrl };
  }

  if (segments.length === 2 && segments[0] === PLAYLIST_SEGMENT) {
    const playlistUrl = decodeSegment(segments[1]);
    // A hand-written `#/playlist/None` means the unlisted view; `#/playlist/init`
    // means nothing selected. Normalising here keeps parse(format(x)) total.
    if (playlistUrl === UNLISTED) {
      return { ...pagination, playlistUrl: UNLISTED, videoUrl };
    }
    if (playlistUrl === NO_PLAYLIST || !playlistUrl) return listOnly;
    return { ...pagination, playlistUrl, videoUrl };
  }

  return listOnly;
}

/**
 * Writes a route back out as a location fragment, always with a leading `#`.
 *
 * Only what differs from the default is written, so the common case stays a
 * short link and `parse(format(x))` still round-trips.
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

  const params = new URLSearchParams();

  // The player is always opened from a row of some list, so a video outside
  // one is dropped rather than written to a location that cannot be parsed back.
  const listIsOpen = path !== "/";
  if (videoUrl && listIsOpen) params.set(VIDEO_PARAM, videoUrl);

  const playlistPage = route?.playlistPage ?? 0;
  const playlistPageSize =
    route?.playlistPageSize ?? DEFAULT_PLAYLIST_PAGE_SIZE;
  if (playlistPage > 0) {
    params.set(PLAYLIST_PAGE_PARAM, String(playlistPage + 1));
  }
  if (playlistPageSize !== DEFAULT_PLAYLIST_PAGE_SIZE) {
    params.set(PLAYLIST_SIZE_PARAM, String(playlistPageSize));
  }

  // A page of the video list means nothing when no video list is open.
  if (listIsOpen) {
    const videoPage = route?.videoPage ?? 0;
    const videoPageSize = route?.videoPageSize ?? DEFAULT_VIDEO_PAGE_SIZE;
    if (videoPage > 0) params.set(VIDEO_PAGE_PARAM, String(videoPage + 1));
    if (videoPageSize !== DEFAULT_VIDEO_PAGE_SIZE) {
      params.set(VIDEO_SIZE_PARAM, String(videoPageSize));
    }
  }

  const search = params.toString();
  return search ? `#${path}?${search}` : `#${path}`;
}
