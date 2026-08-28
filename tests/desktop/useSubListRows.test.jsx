import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useSubListRows } from "../../src/hooks/useSubListRows.js";
import { ApiError } from "../../src/api/client.js";

/**
 * The rows fetch came out of `SubList.jsx` with the Q10 split. It is a hook
 * rather than eight effects in a 1,038-line component now, so its own
 * behaviour — the "init" short-circuit, the abort, and the error row — can be
 * driven directly instead of through the table.
 */

let api;
let latest;

function Harness(props) {
  latest = useSubListRows({ api, ...props });
  return null;
}

const defaults = {
  start: 0,
  stop: 10,
  sort: false,
  query: "",
  loadedPlayList: "https://e.com/playlist",
  reFetch: "0",
};

function renderRows(overrides = {}) {
  return render(<Harness {...defaults} {...overrides} />);
}

const page = (rows, extra = {}) => ({
  rows,
  count: rows.length,
  saveDirectory: "Some Playlist",
  playlistTitle: "Some Playlist",
  ...extra,
});

const row = (id, title) => ({
  id,
  positionInPlaylist: 1,
  playlistUrl: "https://e.com/playlist",
  video_metadatum: { title, videoUrl: `https://e.com/${id}` },
});

beforeEach(() => {
  api = { post: vi.fn() };
  latest = undefined;
});

describe("useSubListRows", () => {
  it("posts the window and exposes what came back", async () => {
    api.post.mockResolvedValue(page([row("a", "First")]));

    renderRows({ start: 10, stop: 20, sort: true, query: "title:x" });

    await waitFor(() => expect(latest.itemCount).toBe(1));
    expect(api.post).toHaveBeenCalledWith(
      "/getsub",
      {
        start: 10,
        stop: 20,
        sortDownloaded: true,
        query: "title:x",
        url: "https://e.com/playlist",
      },
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(latest.items).toHaveLength(1);
    expect(latest.playlistDirectory).toBe("Some Playlist");
    expect(latest.playlistTitle).toBe("Some Playlist");
  });

  it("clears without asking the server on the init playlist", async () => {
    renderRows({ loadedPlayList: "init" });

    await waitFor(() => expect(latest.playlistDirectory).toBe("init"));
    expect(api.post).not.toHaveBeenCalled();
    expect(latest.items).toEqual([]);
    expect(latest.itemCount).toBe(0);
  });

  it("still searches on init when the query is global", async () => {
    api.post.mockResolvedValue(page([row("a", "Found")]));

    renderRows({ loadedPlayList: "init", query: "global:cats" });

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).toMatchObject({ query: "global:cats" });
  });

  it("falls back to an empty title when the playlist has none", async () => {
    api.post.mockResolvedValue(page([], { playlistTitle: null }));

    renderRows();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await waitFor(() => expect(latest.playlistTitle).toBe(""));
  });

  it("renders a refusal as the single row the table can show", async () => {
    api.post.mockRejectedValue(new ApiError(500, "Database is on fire", null));

    renderRows();

    await waitFor(() => expect(latest.itemCount).toBe(1));
    expect(latest.items[0].id).toBe("error-row");
    expect(latest.items[0].video_metadatum.title).toContain("500");
    expect(latest.items[0].video_metadatum.title).toContain(
      "Database is on fire",
    );
  });

  it("leaves the previous rows alone when the request is not a refusal", async () => {
    api.post.mockResolvedValueOnce(page([row("a", "First")]));
    const { rerender } = renderRows();
    await waitFor(() => expect(latest.items).toHaveLength(1));

    // A network failure, not an ApiError: nothing to report, so nothing moves.
    api.post.mockRejectedValueOnce(new TypeError("network down"));
    await act(async () => {
      rerender(<Harness {...defaults} reFetch="1" />);
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(latest.items[0].video_metadatum.title).toBe("First");
  });

  it("aborts the in-flight request when the window moves", async () => {
    const signals = [];
    api.post.mockImplementation((_path, _body, { signal }) => {
      signals.push(signal);
      return new Promise(() => {}); // never settles
    });

    const { rerender } = renderRows();
    await waitFor(() => expect(signals).toHaveLength(1));

    await act(async () => {
      rerender(<Harness {...defaults} start={10} stop={20} />);
    });

    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("re-fetches when the change token moves", async () => {
    api.post.mockResolvedValue(page([]));
    const { rerender } = renderRows();
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    await act(async () => {
      rerender(<Harness {...defaults} reFetch="download-completed-1" />);
    });

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  });
});
