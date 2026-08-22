import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import SubList from "../../src/components/SubList.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";

describe("SubList Component (Mobile)", () => {
  const mockSubListResponse = {
    count: 1,
    saveDirectory: "/downloads/play_1",
    playlistTitle: "Mobile Videos List",
    rows: [
      {
        id: "mapping_1",
        positionInPlaylist: 1,
        video_metadatum: {
          videoUrl: "https://youtube.com/watch?v=1",
          title: "Mobile Video Item",
          downloadStatus: true,
          fileName: "v1.mp4",
          saveDirectory: "/downloads/play_1",
        },
      },
    ],
  };

  const defaultProps = {
    setPlayListUrl: vi.fn(),
    loadedPlayList: "https://youtube.com/playlist?list=mobile",
    subListIndex: 0,
    setSubListIndex: vi.fn(),
    downloadedItem: { url: null, title: null },
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    tableContainerHeight: "600px",
    rowsPerPage: 8,
    setRowsPerPage: vi.fn(),
    isMobile: true,
    onBack: vi.fn(),
    onOpenAddDialog: vi.fn(),
    activePlaylistTitle: "Mobile Playlist",
  };

  let contexts;

  const renderSubList = () =>
    renderWithContexts(<SubList {...defaultProps} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    contexts = makeContexts();
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("triggers onBack callback when back button is clicked on mobile", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(mockSubListResponse));

    renderSubList();

    await waitFor(() => {
      expect(screen.getByText("Mobile Video Item")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: "back to playlists" });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
