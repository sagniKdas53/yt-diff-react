import { describe, it, expect } from "vitest";
import { formatTime, parseSubtitleText } from "../../src/lib/subtitles.js";
import autoSubVtt from "../fixtures/yt-auto-subs.en.vtt?raw";

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

/**
 * A real `--write-auto-subs` track, fetched with the same flags
 * `pipeline/types.ts` passes, and truncated after the first 24 blocks.
 *
 * YouTube's generated captions roll: every line appears once with karaoke word
 * timings, again as the 10 ms echo carrying the plain text, and once more as
 * the first line of the next cue with the following words appended. Reading it
 * verbatim double-renders every line in the overlay and triples it in a
 * transcript, which is what these pin.
 */
const autoSubFixture = autoSubVtt;

describe("parseSubtitleText with YouTube auto-captions", () => {
  it("never emits the same line twice", () => {
    const texts = parseSubtitleText(autoSubFixture).map((cue) => cue.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("drops the 10 ms echo the plain-text line is repeated in", () => {
    const cues = parseSubtitleText(autoSubFixture);
    // Every echo is 10 ms long; none may survive into the cue list.
    const echoes = cues.filter((cue) => cue.end - cue.start <= 0.05);
    expect(echoes).toEqual([]);
  });

  it("gives each line the timings of its completed cue", () => {
    const cues = parseSubtitleText(autoSubFixture);
    const first = cues[0];
    // The grown line spans from when it starts being spoken to when it is
    // finished, not the first fragment of it.
    expect(first.end - first.start).toBeGreaterThan(1);
    for (const cue of cues) {
      expect(cue.end).toBeGreaterThan(cue.start);
    }
  });

  it("keeps the words, in order, once each", () => {
    const texts = parseSubtitleText(autoSubFixture).map((cue) => cue.text);
    // The fixture opens on a music cue, then the speech starts.
    expect(texts[0]).toBe("[Music]");
    expect(texts[1]).toBe("This is a three. It's sloppily written");
    expect(texts[2]).toBe("and rendered at an extremely low");
    expect(texts[3]).toBe("resolution of 28x 28 pixels. But your");
  });

  it("reads as one cue per spoken line, in order, with no gaps in time", () => {
    const cues = parseSubtitleText(autoSubFixture);
    // 23 blocks of raw cues collapse to one per line of speech plus the
    // music cue; a transcript that has not collapsed reads three times this.
    expect(cues).toHaveLength(12);
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].start).toBeGreaterThan(cues[i - 1].start);
    }
  });

  it("leaves a human-authored file alone", () => {
    const cues = parseSubtitleText(
      [
        "WEBVTT",
        "",
        "00:00:01.000 --> 00:00:02.000",
        "The first line",
        "",
        "00:00:02.000 --> 00:00:03.000",
        "The second line",
        "",
        "00:00:03.000 --> 00:00:04.000",
        "The second line",
      ].join("\n"),
    );
    // Real subtitles do repeat a line occasionally; that is a deliberate
    // re-display, not a rolling artifact, so it is not collapsed.
    expect(cues.map((cue) => cue.text)).toEqual([
      "The first line",
      "The second line",
      "The second line",
    ]);
  });

  it("keeps an authored cue that starts with the previous one whole", () => {
    const cues = parseSubtitleText(
      [
        "WEBVTT",
        "",
        "00:00:01.000 --> 00:00:03.000",
        "The first line",
        "",
        "00:00:03.000 --> 00:00:05.000",
        "The first line, spoken again",
        "",
        "00:00:05.000 --> 00:00:07.000",
        "The first line",
        "and it carries on",
      ].join("\n"),
    );
    // A shared prefix is only a rolling caption's growth if the 10 ms echo is
    // there in front of it. Nothing here has one, so the second and third cues
    // are the author writing a sentence that starts like the one before —
    // wrapped or not, both keep every word they were given.
    expect(cues.map((cue) => cue.text)).toEqual([
      "The first line",
      "The first line, spoken again",
      "The first line\nand it carries on",
    ]);
  });
});
