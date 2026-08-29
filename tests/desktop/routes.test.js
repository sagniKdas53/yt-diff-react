import { describe, expect, test } from "vitest";

import {
  DEFAULT_PLAYLIST_PAGE_SIZE,
  DEFAULT_VIDEO_PAGE_SIZE,
  formatRoute,
  NO_PLAYLIST,
  parseRoute,
  UNLISTED,
} from "../../src/router/routes.js";

const PLAYLIST = "https://www.youtube.com/playlist?list=PLabc123";
const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s";

/** A full route, so a test only has to name the fields it is about. */
const route = (partial) => ({
  playlistUrl: NO_PLAYLIST,
  videoUrl: null,
  playlistPage: 0,
  playlistPageSize: DEFAULT_PLAYLIST_PAGE_SIZE,
  videoPage: 0,
  videoPageSize: DEFAULT_VIDEO_PAGE_SIZE,
  ...partial,
});

describe("the URL grammar", () => {
  test("an empty or bare location is 'nothing selected'", () => {
    for (const location of ["", "#", "#/", undefined, null]) {
      expect(parseRoute(location)).toEqual(route({}));
    }
  });

  test("a playlist URL survives its own query string", () => {
    // The reason the whole URL is percent-encoded into one segment: it carries
    // a `?list=` of its own, which would otherwise be read as the route's.
    const parsed = parseRoute(formatRoute(route({ playlistUrl: PLAYLIST })));
    expect(parsed.playlistUrl).toBe(PLAYLIST);
  });

  test("a playlist and a video round-trip together", () => {
    const original = route({ playlistUrl: PLAYLIST, videoUrl: VIDEO });
    expect(parseRoute(formatRoute(original))).toEqual(original);
  });

  test("the unlisted view has its own name rather than a sentinel", () => {
    expect(formatRoute(route({ playlistUrl: UNLISTED }))).toBe("#/unlisted");
    expect(parseRoute("#/unlisted")).toEqual(route({ playlistUrl: UNLISTED }));
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
      expect(parseRoute(location)).toEqual(route({}));
    }
  });

  test("a video outside any list is dropped in both directions", () => {
    // The player is always opened from a row of some list, so there is no
    // location that means "this video, from nowhere".
    expect(formatRoute(route({ videoUrl: VIDEO }))).toBe("#/");
    expect(parseRoute("#/?v=" + encodeURIComponent(VIDEO)).videoUrl).toBeNull();
  });

  describe("pagination", () => {
    test("page numbers are 1-based in the URL and 0-based inside", () => {
      // The controls display page 26; the app counts it as 25. The URL matches
      // what the person reading it can see on screen.
      const link = formatRoute(
        route({ playlistUrl: PLAYLIST, playlistPage: 25, videoPage: 3 }),
      );
      expect(link).toContain("pp=26");
      expect(link).toContain("vp=4");

      const parsed = parseRoute(link);
      expect(parsed.playlistPage).toBe(25);
      expect(parsed.videoPage).toBe(3);
    });

    test("defaults are left out, so an ordinary link stays short", () => {
      expect(formatRoute(route({ playlistUrl: UNLISTED }))).toBe("#/unlisted");
    });

    test("page sizes are written only when they differ from the default", () => {
      const link = formatRoute(
        route({
          playlistUrl: PLAYLIST,
          playlistPageSize: 25,
          videoPageSize: 32,
        }),
      );
      expect(link).toContain("ps=25");
      expect(link).toContain("vs=32");
      expect(parseRoute(link).playlistPageSize).toBe(25);
      expect(parseRoute(link).videoPageSize).toBe(32);
    });

    test("where the playlist list is paged to survives at the root", () => {
      // The left panel is on screen at every location, so its page is not
      // something only a playlist link can carry.
      const link = formatRoute(route({ playlistPage: 25 }));
      expect(link).toBe("#/?pp=26");
      expect(parseRoute(link).playlistPage).toBe(25);
    });

    test("a video page means nothing with no video list open", () => {
      expect(formatRoute(route({ videoPage: 3, videoPageSize: 32 }))).toBe(
        "#/",
      );
      expect(parseRoute("#/?vp=4&vs=32").videoPage).toBe(0);
      expect(parseRoute("#/?vp=4&vs=32").videoPageSize).toBe(
        DEFAULT_VIDEO_PAGE_SIZE,
      );
    });

    test("a hand-mangled page number falls back rather than breaking", () => {
      // `0` and negatives are not pages anyone can be on, and `abc` is not a
      // number; all of them mean "the app decides".
      const parsed = parseRoute("#/unlisted?pp=0&vp=-3&ps=abc&vs=");
      expect(parsed).toEqual(route({ playlistUrl: UNLISTED }));
    });

    test("a fractional page is not a page", () => {
      expect(parseRoute("#/unlisted?vp=2.5").videoPage).toBe(0);
    });
  });

  test("format always produces something parse accepts", () => {
    const routes = [
      route({}),
      route({ playlistUrl: UNLISTED }),
      route({ playlistUrl: UNLISTED, videoUrl: VIDEO }),
      route({ playlistUrl: PLAYLIST }),
      route({ playlistUrl: PLAYLIST, videoUrl: VIDEO }),
      route({ playlistUrl: PLAYLIST, playlistPage: 25, videoPage: 3 }),
      route({
        playlistUrl: PLAYLIST,
        videoUrl: VIDEO,
        playlistPage: 7,
        playlistPageSize: 50,
        videoPage: 2,
        videoPageSize: 64,
      }),
      route({ playlistPage: 12 }),
      route({ playlistUrl: "https://x.com/a b/c#frag", videoUrl: "a&b=c" }),
    ];
    for (const original of routes) {
      expect(parseRoute(formatRoute(original))).toEqual(original);
    }
  });
});
