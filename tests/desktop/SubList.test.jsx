import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import SubList from "../../src/components/SubList.jsx";
import { makeContexts, renderWithContexts } from "../contextHarness.jsx";

describe("SubList Component (Desktop)", () => {
  const mockSubListResponse = {
    count: 3,
    saveDirectory: "/downloads/play_1",
    playlistTitle: "Best Songs Playlist",
    rows: [
      {
        id: "mapping_1",
        positionInPlaylist: 1,
        video_metadatum: {
          videoUrl: "https://youtube.com/watch?v=1",
          title: "Video Song One",
          downloadStatus: true,
          fileName: "v1.mp4",
          saveDirectory: "/downloads/play_1",
        },
      },
      {
        id: "mapping_2",
        positionInPlaylist: 2,
        video_metadatum: {
          videoUrl: "https://youtube.com/watch?v=2",
          title: "Video Song Two",
          downloadStatus: false,
          fileName: "v2.mp4",
          saveDirectory: "/downloads/play_1",
        },
      },
    ],
  };

  const defaultProps = {
    setPlayListUrl: vi.fn(),
    loadedPlayList: "https://youtube.com/playlist?list=best",
    subListIndex: 0,
    setSubListIndex: vi.fn(),
    downloadedItem: { url: null, title: null },
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    tableContainerHeight: "600px",
    rowsPerPage: 8,
    setRowsPerPage: vi.fn(),
  };

  let contexts;

  const renderSubList = () =>
    renderWithContexts(<SubList {...defaultProps} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    contexts = makeContexts({
      download: {
        queueDownloads: vi
          .fn()
          .mockResolvedValue(["https://youtube.com/watch?v=2"]),
      },
    });
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches and renders sublist items on mount", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSubListResponse),
    });

    renderSubList();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/getsub",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({
          start: 0,
          stop: 8,
          sortDownloaded: false,
          query: "",
          url: "https://youtube.com/playlist?list=best",
        }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Video Song One")).toBeInTheDocument();
      expect(screen.getByText("Video Song Two")).toBeInTheDocument();
    });
  });

  test("allows selecting items and triggers bulk queue downloads", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSubListResponse),
    });

    renderSubList();

    await waitFor(() => {
      expect(screen.getByText("Video Song Two")).toBeInTheDocument();
    });

    // Checkbox is inside SubListItemCard. Checked matches isSelected
    const checkboxes = screen.getAllByRole("checkbox");
    // 1 header select-all checkbox, plus 2 items checkboxes
    expect(checkboxes.length).toBe(3);

    // Click checkbox for Video Song Two (second item, index 2 in checkboxes array)
    fireEvent.click(checkboxes[2]);

    const downloadFAB = screen.getByRole("button", { name: "download selected" });
    expect(downloadFAB).toBeInTheDocument();
    fireEvent.click(downloadFAB);

    // Wait for selection checkbox to clear (indicating bulk download process is finished)
    await waitFor(() => {
      expect(checkboxes[2].checked).toBe(false);
    });

    expect(contexts.download.queueDownloads).toHaveBeenCalledWith([
      {
        url: "https://youtube.com/watch?v=2",
        playlistUrl: "https://youtube.com/playlist?list=best",
        positionInPlaylist: 2,
      },
    ]);
  });
});
