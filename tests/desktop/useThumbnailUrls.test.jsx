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

  it("drops a thumbnail the refresh would not extend", async () => {
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

    await waitFor(() => expect(latest.thumbUrls["a.jpg"]).toBeNull());
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
