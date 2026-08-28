import { describe, it, expect } from "vitest";
import { formatTime, parseSubtitleText } from "../../src/lib/subtitles.js";

/**
 * `src/lib/subtitles.js` came out of `VideoPlayer.jsx` with the Q10 split. It
 * is the pure half of subtitle handling — no fetch, no state — so it is the
 * part of that component that can be tested directly, which is the point of
 * having extracted it.
 */

describe("formatTime", () => {
  it("drops the hour below an hour", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(75)).toBe("01:15");
  });

  it("keeps the hour once there is one", () => {
    expect(formatTime(3600)).toBe("01:00:00");
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("truncates rather than rounds", () => {
    expect(formatTime(59.9)).toBe("00:59");
  });
});

describe("parseSubtitleText", () => {
  it("reads cues with hour, minute and second timings", () => {
    const cues = parseSubtitleText(
      [
        "WEBVTT",
        "",
        "00:00:01.000 --> 00:00:03.500",
        "First line",
        "",
        "00:01:00.000 --> 00:01:02.000",
        "Second line",
      ].join("\n"),
    );

    expect(cues).toEqual([
      { start: 1, end: 3.5, text: "First line" },
      { start: 60, end: 62, text: "Second line" },
    ]);
  });

  it("accepts comma milliseconds", () => {
    const cues = parseSubtitleText(
      ["WEBVTT", "", "00:01:00,000 --> 00:01:02,500", "Text"].join("\n"),
    );
    expect(cues).toEqual([{ start: 60, end: 62.5, text: "Text" }]);
  });

  it("reads the hourless timings ffmpeg writes for short videos", () => {
    // WebVTT makes the hour optional and ffmpeg's writer omits it below an
    // hour, so `--convert-subs vtt` produces this for most videos whose
    // subtitles were not already VTT. The old pattern required the hour and
    // silently returned no cues for the whole file.
    const cues = parseSubtitleText(
      [
        "WEBVTT",
        "",
        "00:01.000 --> 00:03.500",
        "First line",
        "",
        "01:05.000 --> 01:07.500",
        "Second line",
      ].join("\n"),
    );

    expect(cues).toEqual([
      { start: 1, end: 3.5, text: "First line" },
      { start: 65, end: 67.5, text: "Second line" },
    ]);
  });

  it("reads a one-digit hour", () => {
    const cues = parseSubtitleText(
      ["WEBVTT", "", "1:00:01.000 --> 1:00:03.500", "Text"].join("\n"),
    );
    expect(cues).toEqual([{ start: 3601, end: 3603.5, text: "Text" }]);
  });

  it("does not read a bare second count as a timing", () => {
    // The hour being optional must not make the minute optional too.
    const cues = parseSubtitleText(
      ["WEBVTT", "", "01.000 --> 03.500", "Text"].join("\n"),
    );
    expect(cues).toEqual([]);
  });

  it("tolerates a BOM and CRLF line endings", () => {
    const cues = parseSubtitleText(
      "﻿WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nText\r\n",
    );
    expect(cues).toEqual([{ start: 1, end: 2, text: "Text" }]);
  });

  it("strips inline markup and karaoke timestamp tags", () => {
    const cues = parseSubtitleText(
      [
        "WEBVTT",
        "",
        "00:00:01.000 --> 00:00:02.000",
        "<00:00:01.500><c>Hello</c> <b>there</b>",
      ].join("\n"),
    );
    expect(cues[0].text).toBe("Hello there");
  });

  it("joins a cue's multiple lines", () => {
    const cues = parseSubtitleText(
      ["WEBVTT", "", "00:00:01.000 --> 00:00:02.000", "One", "Two"].join("\n"),
    );
    expect(cues[0].text).toContain("One");
    expect(cues[0].text).toContain("Two");
  });

  it("ignores blocks with no timing line", () => {
    const cues = parseSubtitleText(
      ["WEBVTT", "", "NOTE just a comment", "", "STYLE", "::cue { color: red }"].join(
        "\n",
      ),
    );
    expect(cues).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(parseSubtitleText("")).toEqual([]);
  });
});
