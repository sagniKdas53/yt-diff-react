import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useSubtitleTrack } from "../../src/hooks/useSubtitleTrack";

/**
 * `useSubtitleTrack` is the player's subtitle state: it fetches the .vtt
 * through a signed URL, parses it, and works out which cues are on screen at
 * the playhead. These pin the last of those — the fetching is stubbed to a
 * fixed track so the cue list is the only moving part.
 */

/** A .vtt body from cue blocks, each block its timing line plus text lines. */
const vtt = (blocks) => ["WEBVTT", "", ...blocks].join("\n");

/** Points the hook at `trackText` and renders it at `currentTime`. */
function renderTrack(trackText, currentTime) {
  const api = {
    post: vi
      .fn()
      .mockResolvedValue({ status: "success", signedUrlId: "subtitle_url_1" }),
  };
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => trackText,
  });

  return renderHook(() =>
    useSubtitleTrack({
      api,
      saveDirectory: "/downloads",
      subTitleFile: "video.vtt",
      currentTime,
    }),
  );
}

const OVERLAPPING = vtt([
  "00:00:00.000 --> 00:00:06.000",
  "The opening line",
  "",
  "00:00:01.000 --> 00:00:07.000",
  "A line that starts over it",
]);

describe("useSubtitleTrack (Desktop)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("returns every cue covering the playhead, not just the last one that started", async () => {
    const { result } = renderTrack(OVERLAPPING, 3);

    await waitFor(() => expect(result.current.subtitleCues).toHaveLength(2));
    // Both cues cover 3s. Returning only the last one to have started left the
    // opening line blank for the length of the overlap.
    expect(result.current.activeCues.map((cue) => cue.text)).toEqual([
      "The opening line",
      "A line that starts over it",
    ]);
  });

  test("sorts a track whose blocks are not listed in time order", async () => {
    const { result } = renderTrack(
      vtt([
        "00:00:05.000 --> 00:00:06.000",
        "The later line",
        "",
        "00:00:00.000 --> 00:00:02.000",
        "The earlier line",
      ]),
      0.5,
    );

    await waitFor(() => expect(result.current.subtitleCues).toHaveLength(2));
    expect(result.current.subtitleCues.map((cue) => cue.start)).toEqual([0, 5]);
    // Searching the file's own order finds nothing started by 0.5s at all, so
    // this cue is only found because the track is sorted before the search.
    expect(result.current.activeCues.map((cue) => cue.text)).toEqual([
      "The earlier line",
    ]);
  });

  test("stops looking for overlaps once a cue is longer than any written line", async () => {
    const { result } = renderTrack(
      vtt([
        "00:00:00.000 --> 00:02:00.000",
        "A cue nobody wrote that long",
        "",
        "00:00:20.000 --> 00:01:00.000",
        "A cue within the window",
      ]),
      45,
    );

    await waitFor(() => expect(result.current.subtitleCues).toHaveLength(2));
    // The walk back stops at the window that bounds it, so the cue started at
    // 0s is out of reach even though it has not ended.
    expect(result.current.activeCues.map((cue) => cue.text)).toEqual([
      "A cue within the window",
    ]);
  });

  test("renders nothing while subtitles are off", async () => {
    const { result } = renderTrack(OVERLAPPING, 3);

    await waitFor(() => expect(result.current.subtitleCues).toHaveLength(2));
    act(() => result.current.toggleSubtitles());

    await waitFor(() => expect(result.current.subtitlesEnabled).toBe(false));
    expect(result.current.activeCues).toEqual([]);
  });
});