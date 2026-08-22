import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import PlayList from "../../src/components/PlayList.jsx";
import { makeContexts, renderWithContexts } from "../contextHarness.jsx";

describe("PlayList Component (Desktop)", () => {
  const mockPlaylists = {
    count: 2,
    rows: [
      {
        playlistUrl: "url_1",
        title: "Awesome Playlist 1",
        sortOrder: 0,
        monitoringType: "Full",
        lastUpdatedByScheduler: Date.now() - 3600000,
      },
      {
        playlistUrl: "url_2",
        title: "Awesome Playlist 2",
        sortOrder: 1,
        monitoringType: "Start",
        lastUpdatedByScheduler: Date.now() - 7200000,
      },
    ],
  };

  const defaultProps = {
    setPlayListUrl: vi.fn(),
    playListUrl: "url_1",
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    setSubListIndex: vi.fn(),
    tableContainerHeight: "500px",
    rowsPerPageSubList: 8,
    setRowsPerPageSubList: vi.fn(),
    playListIndex: 0,
    setPlayListIndex: vi.fn(),
  };

  let contexts;

  const renderPlayList = (props = defaultProps) =>
    renderWithContexts(<PlayList {...props} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    contexts = makeContexts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches and renders playlists on mount", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockPlaylists),
    });

    renderPlayList();

    // Should fetch playlists
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/getplay",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({
          start: 0,
          stop: 10,
          sort: "1",
          order: "1",
          query: "",
        }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Awesome Playlist 1")).toBeInTheDocument();
      expect(screen.getByText("Awesome Playlist 2")).toBeInTheDocument();
    });
  });

  test("opens Add Dialog on clicking FAB, and submits url list", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockPlaylists),
    }).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: "success" }),
    });

    renderPlayList();

    await waitFor(() => {
      expect(screen.getByText("Awesome Playlist 1")).toBeInTheDocument();
    });

    const fabBtn = screen.getByRole("button", { name: "action" });
    fireEvent.click(fabBtn);

    // Dialog should display
    expect(screen.getByText("Add")).toBeInTheDocument();

    const inputField = screen.getByLabelText("Url List");
    fireEvent.change(inputField, { target: { value: "https://youtube.com/playlist?list=new_id" } });

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    // Wait for input field to clear (indicating async submission process is complete)
    await waitFor(() => {
      expect(inputField.value).toBe("");
    });

    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "http://localhost:8888/ytdiff/list",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({
          urlList: ["https://youtube.com/playlist?list=new_id"],
          chunkSize: 9,
          monitoringType: "N/A",
          sleep: true,
        }),
      })
    );
  });

  /** Submits one url and resolves /list with the given backlog figure. */
  const submitWithQueueDepth = async (queueDepthBefore, props) => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPlaylists),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ status: "success", queueDepthBefore }),
      });

    renderPlayList(props);

    await waitFor(() => {
      expect(screen.getByText("Awesome Playlist 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "action" }));
    const inputField = screen.getByLabelText("Url List");
    fireEvent.change(inputField, {
      target: { value: "https://youtube.com/playlist?list=new_id" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(inputField.value).toBe("");
    });
  };

  test("warns about the listing backlog when items are already queued ahead", async () => {
    // Mirrors "submitted 10, 3 finished, submit more": 7 are still pending.
    await submitWithQueueDepth(7, defaultProps);

    expect(contexts.notification.setSnack).toHaveBeenCalledWith(
      "Added to listing queue — 7 ahead",
      "info"
    );
  });

  test("stays quiet when the listing queue is shallow", async () => {
    await submitWithQueueDepth(3, defaultProps);

    expect(contexts.notification.setSnack).not.toHaveBeenCalledWith(
      expect.stringContaining("ahead"),
      expect.anything()
    );
  });

  test("stays quiet when the backend reports no backlog field", async () => {
    await submitWithQueueDepth(undefined, defaultProps);

    expect(contexts.notification.setSnack).not.toHaveBeenCalledWith(
      expect.stringContaining("ahead"),
      expect.anything()
    );
  });
});
