import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useSignedPlayback } from "../../src/hooks/useSignedPlayback.js";

/**
 * The refresh timer keeps a playing video's signed id alive. The bug these
 * cover is the loop: a failed refresh rescheduled at `max(0, expiry - margin)`
 * — zero, once the id had expired — so it retried immediately and forever.
 */

const REFRESH_MARGIN_MS = 300000;

let api;
let latest;

// Stable across renders: `reload` depends on the ref object itself, so a fresh
// literal each render would re-run the mint effect forever.
const videoRef = { current: null };

function Harness(props) {
  latest = useSignedPlayback({
    api,
    saveDirectory: "Some Playlist",
    fileName: "video.mp4",
    videoRef,
    ...props,
  });
  return null;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api = { post: vi.fn() };
  latest = undefined;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mintOk(expiry) {
  return {
    status: "success",
    signedUrlId: "sid-1",
    expiry,
  };
}

describe("useSignedPlayback", () => {
  it("mints a URL for the file and schedules a refresh before it expires", async () => {
    api.post.mockResolvedValueOnce(mintOk(Date.now() + REFRESH_MARGIN_MS + 1000));

    render(<Harness />);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/getfile",
      { saveDirectory: "Some Playlist", fileName: "video.mp4" },
      expect.anything(),
    ));
    expect(latest.videoUrl).toContain("sid-1");

    api.post.mockResolvedValueOnce({
      status: "success",
      expiry: Date.now() + 3600000,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/refreshfile", { fileId: "sid-1" })
    );
  });

  it("backs off instead of looping when the refresh keeps failing", async () => {
    api.post.mockResolvedValueOnce(mintOk(Date.now() + REFRESH_MARGIN_MS + 1000));

    render(<Harness />);
    await waitFor(() => expect(latest.videoUrl).toContain("sid-1"));

    const callsBefore = api.post.mock.calls.length;
    api.post.mockRejectedValue(new Error("server restarting"));

    // Ten minutes covers the whole backoff sequence (5 s, 15 s, 60 s, then
    // repeated to the cap) and would be several hundred calls for a tight loop.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    const refreshCalls = api.post.mock.calls.length - callsBefore;
    expect(refreshCalls).toBeGreaterThan(0);
    expect(refreshCalls).toBeLessThanOrEqual(5);
    // Playback is untouched: the id is still what was minted, so the element's
    // own error recovery can remint from a known state.
    expect(latest.videoUrl).toContain("sid-1");
    expect(latest.errorMsg).toBeNull();
  });

  it("resets the backoff after a refresh succeeds", async () => {
    const expiring = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce(mintOk(expiring));

    render(<Harness />);
    await waitFor(() => expect(latest.videoUrl).toContain("sid-1"));

    const callsBefore = api.post.mock.calls.length;
    // Two failures, then a success, then another failure. If the counter had
    // not reset, that last failure would be the fourth and stop the retries.
    api.post.mockRejectedValueOnce(new Error("down"));
    api.post.mockRejectedValueOnce(new Error("down"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000 + 15000);
    });
    // The success has to return an expiry that is due again shortly, or the
    // next refresh is scheduled an hour out and never runs inside the test.
    api.post.mockResolvedValueOnce(mintOk(Date.now() + REFRESH_MARGIN_MS + 1000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    const callsAfterReset = api.post.mock.calls.length;
    expect(callsAfterReset).toBeGreaterThan(callsBefore + 1);

    api.post.mockRejectedValue(new Error("down again"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    // Still retrying rather than having given up at the cap.
    expect(api.post.mock.calls.length).toBeGreaterThan(callsAfterReset);
  });

  it("reports a mint that the server refuses", async () => {
    api.post.mockRejectedValueOnce(new Error("no such file"));

    render(<Harness />);
    await waitFor(() => expect(latest.errorMsg).toBe("no such file"));
    expect(latest.videoUrl).toBeNull();
  });

  it("drops a pending refresh when the track changes", async () => {
    api.post.mockResolvedValueOnce(mintOk(Date.now() + REFRESH_MARGIN_MS + 1000));

    const { rerender } = render(<Harness />);
    await waitFor(() => expect(latest.videoUrl).toContain("sid-1"));

    const callsBefore = api.post.mock.calls.length;
    await act(async () => {
      rerender(<Harness fileName="other.mp4" />);
    });
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/getfile",
        { saveDirectory: "Some Playlist", fileName: "other.mp4" },
        expect.anything(),
      )
    );

    const mintCalls = api.post.mock.calls.length - callsBefore;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    // Only the new mint; the old id's timer went with the track.
    expect(api.post.mock.calls.length - callsBefore).toBe(mintCalls);
  });
});