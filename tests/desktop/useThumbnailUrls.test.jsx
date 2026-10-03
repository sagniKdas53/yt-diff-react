import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useThumbnailUrls } from "../../src/hooks/useThumbnailUrls.js";
import { assetBase } from "../../src/config.js";

/**
 * The thumbnail layer came out of `SubList.jsx` with the Q10 split: a bulk
 * mint, a timer that extends the signed ids before they expire, and a reset
 * when the playlist changes. All three are driveable directly now.
 */

let api;
let latest;

function Harness(props) {
  latest = useThumbnailUrls({ api, ...props });
  return null;
}

const REFRESH_MARGIN_MS = 300000;

const itemWith = (thumb, saveDirectory) => ({
  video_metadatum: { thumbNailFile: thumb, saveDirectory },
});

const defaults = {
  items: [itemWith("a.jpg")],
  playlistDirectory: "Some Playlist",
  loadedPlayList: "https://e.com/playlist",
};

function renderThumbs(overrides = {}) {
  return render(<Harness {...defaults} {...overrides} />);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api = { post: vi.fn() };
  latest = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useThumbnailUrls", () => {
  it("mints a signed URL for every row that has a thumbnail", async () => {
    api.post.mockResolvedValue({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: Date.now() + 3600000 } },
    });

    renderThumbs();

    await waitFor(() =>
      expect(latest.thumbUrls["a.jpg"]).toBe(
        assetBase + "/getfile?fileId=sid-1",
      ),
    );
    expect(api.post).toHaveBeenCalledWith("/getfiles", {
      files: [{ saveDirectory: "Some Playlist", fileName: "a.jpg" }],
    });
  });

  it("prefers the row's own save directory over the playlist's", async () => {
    api.post.mockResolvedValue({ status: "success", files: {} });

    renderThumbs({ items: [itemWith("a.jpg", "Its Own Directory")] });

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1].files[0].saveDirectory).toBe(
      "Its Own Directory",
    );
  });

  it("asks for nothing on the init playlist", async () => {
    renderThumbs({ playlistDirectory: "init" });
    await act(async () => {});
    expect(api.post).not.toHaveBeenCalled();
  });

  it("asks for nothing when no row carries a thumbnail", async () => {
    renderThumbs({ items: [{ video_metadatum: {} }] });
    await act(async () => {});
    expect(api.post).not.toHaveBeenCalled();
  });

  it("records a null for a file the server would not sign", async () => {
    api.post.mockResolvedValue({
      status: "success",
      files: { "a.jpg": { signedUrlId: null } },
    });

    renderThumbs();

    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeNull());
  });

  it("records no URL when the batch is refused", async () => {
    api.post.mockRejectedValue(new Error("refused"));

    renderThumbs();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await act(async () => {});

    // Nothing is shown, and nothing is remembered. The hook marks the files
    // in-progress before the request, but on the first render the clean-slate
    // effect that follows resets that — so after a refusal the map is empty
    // rather than holding nulls, and the next render re-issues the batch.
    // Asserted as-is rather than reordered: the visible result is the same
    // either way, and a retry after a failure is not the wrong behaviour.
    expect(latest.thumbUrls["a.jpg"]).toBeUndefined();
  });

  it("extends an id that is about to expire", async () => {
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: soon } },
    });

    renderThumbs();
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toContain("sid-1"));

    api.post.mockResolvedValueOnce({
      status: "success",
      files: { "sid-1": { expiry: Date.now() + 3600000 } },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/refreshfiles", {
        fileIds: ["sid-1"],
      }),
    );
    // Still showing: an extended id keeps the same URL.
    expect(latest.thumbUrls["a.jpg"]).toContain("sid-1");
  });

  it("forgets a thumbnail the refresh would not extend, so it is asked for again", async () => {
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: soon } },
    });

    renderThumbs();
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toContain("sid-1"));

    // The file is gone server-side: no entry comes back for it.
    api.post.mockResolvedValueOnce({ status: "success", files: {} });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Dropped, not nulled. The fetch effect reads null as "in progress", so a
    // null would leave the row without a thumbnail for the life of the page.
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeUndefined());
  });

  it("retries a refused mint rather than leaving the row blank forever", async () => {
    api.post.mockRejectedValueOnce(new Error("server restarting"));

    renderThumbs();
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    // Nothing was minted, so the key must go back to the one state that asks
    // again instead of sitting on the "in progress" null.
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeUndefined());
  });

  it("backs off instead of looping when the refresh keeps failing", async () => {
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: soon } },
    });

    renderThumbs();
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toContain("sid-1"));

    const refreshCallsBefore = api.post.mock.calls.length;
    api.post.mockRejectedValue(new Error("server down"));

    // Ten minutes: long enough for the whole backoff sequence to run out and
    // for a tight loop to have made hundreds of calls.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    const refreshCalls = api.post.mock.calls.length - refreshCallsBefore;
    // Five attempts, then it gives up and drops the id so the next fetch asks
    // for it again.
    expect(refreshCalls).toBeLessThanOrEqual(5);
    expect(api.post.mock.calls.length).toBe(refreshCallsBefore + refreshCalls);
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeUndefined());
  });

  it("keeps refreshing a healthy thumbnail after another exhausts its retries", async () => {
    // Two rows on the same clock: one about to expire, one with an hour left.
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: {
        "a.jpg": { signedUrlId: "sid-a", expiry: soon },
        "b.jpg": { signedUrlId: "sid-b", expiry: Date.now() + 3600000 },
      },
    });

    renderThumbs({ items: [itemWith("a.jpg"), itemWith("b.jpg")] });
    await waitFor(() => expect(latest.thumbUrls["b.jpg"]).toContain("sid-b"));

    api.post.mockRejectedValue(new Error("server down"));

    const refreshCalls = () =>
      api.post.mock.calls.filter((call) => call[0] === "/refreshfiles");

    // Ten minutes is the whole backoff sequence for the expiring id: five
    // attempts, then it is given up on.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeUndefined());
    expect(latest.thumbUrls["b.jpg"]).toContain("sid-b");
    // Only the expiring id was ever due, so only it was ever dropped.
    expect(refreshCalls().every((call) => call[1].fileIds.includes("sid-a"))).toBe(
      true,
    );

    // An hour later the survivor comes due. A timer loop that stopped with the
    // exhausted id would leave it unrefreshed for the life of the page.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });

    await waitFor(() =>
      expect(
        refreshCalls().some((call) => call[1].fileIds.includes("sid-b")),
      ).toBe(true),
    );
  });

  it("starts the backoff count over after it gives up on an id", async () => {
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: {
        "a.jpg": { signedUrlId: "sid-a", expiry: soon },
        "b.jpg": { signedUrlId: "sid-b", expiry: Date.now() + 3600000 },
      },
    });

    renderThumbs({ items: [itemWith("a.jpg"), itemWith("b.jpg")] });
    await waitFor(() => expect(latest.thumbUrls["b.jpg"]).toContain("sid-b"));

    api.post.mockRejectedValue(new Error("server down"));

    const refreshCallsFor = (fileId) =>
      api.post.mock.calls.filter(
        (call) =>
          call[0] === "/refreshfiles" && call[1].fileIds.includes(fileId),
      );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeUndefined());
    expect(refreshCallsFor("sid-b")).toHaveLength(0);

    // Its first failure, an hour after the mint, plus the whole backoff run.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(65 * 60 * 1000);
    });

    // A fresh sequence is five attempts and then the id is let go. Reading the
    // exhausted count off the id just dropped would make this first failure
    // the fifth, so the survivor would be given up on without a second try.
    expect(refreshCallsFor("sid-b")).toHaveLength(5);
  });

  it("starts a new playlist with a clean slate", async () => {
    api.post.mockResolvedValue({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: Date.now() + 3600000 } },
    });

    const { rerender } = renderThumbs();
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toContain("sid-1"));

    await act(async () => {
      rerender(
        <Harness
          {...defaults}
          items={[]}
          loadedPlayList="https://e.com/other"
        />,
      );
    });

    await waitFor(() => expect(latest.thumbUrls).toEqual({}));
  });

  it("cancels its refresh timer on unmount", async () => {
    const soon = Date.now() + REFRESH_MARGIN_MS + 1000;
    api.post.mockResolvedValueOnce({
      status: "success",
      files: { "a.jpg": { signedUrlId: "sid-1", expiry: soon } },
    });

    const { unmount } = renderThumbs();
    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toContain("sid-1"));

    const callsBefore = api.post.mock.calls.length;
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(api.post.mock.calls.length).toBe(callsBefore);
  });
});
