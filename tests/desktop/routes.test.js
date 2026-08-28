import { describe, expect, test } from "vitest";

import {
  formatRoute,
  NO_PLAYLIST,
  parseRoute,
  UNLISTED,
} from "../../src/router/routes.js";

const PLAYLIST = "https://www.youtube.com/playlist?list=PLabc123";
const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s";

describe("the URL grammar", () => {
  test("an empty or bare location is 'nothing selected'", () => {
    for (const location of ["", "#", "#/", undefined, null]) {
      expect(parseRoute(location)).toEqual({
        playlistUrl: NO_PLAYLIST,
        videoUrl: null,
      });
    }
  });

  test("a playlist URL survives its own query string", () => {
    // The reason the whole URL is percent-encoded into one segment: it carries
    // a `?list=` of its own, which would otherwise be read as the route's.
    const route = parseRoute(formatRoute({ playlistUrl: PLAYLIST }));
    expect(route.playlistUrl).toBe(PLAYLIST);
  });

  test("a playlist and a video round-trip together", () => {
    const original = { playlistUrl: PLAYLIST, videoUrl: VIDEO };
    expect(parseRoute(formatRoute(original))).toEqual(original);
  });

  test("the unlisted view has its own name rather than a sentinel", () => {
    expect(formatRoute({ playlistUrl: UNLISTED, videoUrl: null })).toBe(
      "#/unlisted",
    );
    expect(parseRoute("#/unlisted")).toEqual({
      playlistUrl: UNLISTED,
      videoUrl: null,
    });
  });

  test("the sentinels are not reachable as literal playlist names", () => {
    // `init` and `None` are how the app spells these two states internally.
    // A location that spells them out is normalised to the state it names, so
    // that parse(format(x)) has no second spelling to disagree about.
    expect(parseRoute("#/playlist/None").playlistUrl).toBe(UNLISTED);
    expect(parseRoute("#/playlist/init").playlistUrl).toBe(NO_PLAYLIST);
  });

  test("a rotted link opens the app rather than breaking it", () => {
    // A lone `%` makes decodeURIComponent throw; unknown shapes are simply
    // not routes. Neither is allowed to be a crash.
    for (const location of ["#/playlist/%E0%A4%A", "#/nope/deeper", "#/x"]) {
      expect(parseRoute(location)).toEqual({
        playlistUrl: NO_PLAYLIST,
        videoUrl: null,
      });
    }
  });

  test("a video outside any list is dropped in both directions", () => {
    // The player is always opened from a row of some list, so there is no
    // location that means "this video, from nowhere".
    expect(formatRoute({ playlistUrl: NO_PLAYLIST, videoUrl: VIDEO })).toBe(
      "#/",
    );
    expect(parseRoute("#/?v=" + encodeURIComponent(VIDEO)).videoUrl).toBeNull();
  });

  test("format always produces something parse accepts", () => {
    const routes = [
      { playlistUrl: NO_PLAYLIST, videoUrl: null },
      { playlistUrl: UNLISTED, videoUrl: null },
      { playlistUrl: UNLISTED, videoUrl: VIDEO },
      { playlistUrl: PLAYLIST, videoUrl: null },
      { playlistUrl: PLAYLIST, videoUrl: VIDEO },
      { playlistUrl: "https://x.com/a b/c#frag", videoUrl: "a&b=c" },
    ];
    for (const route of routes) {
      expect(parseRoute(formatRoute(route))).toEqual(route);
    }
  });
});
