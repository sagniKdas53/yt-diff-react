import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import SubList from "../../src/components/SubList.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("SubList Component (Mobile)", () => {
  const theme = createTheme();
  
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
    backEnd: "http://localhost:8888/ytdiff",
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    tableContainerHeight: 600,
    rowsPerPage: 8,
    setRowsPerPage: vi.fn(),
    token: "mock_token",
    setToken: vi.fn(),
    setSnack: vi.fn(),
    addNotification: vi.fn(),
    activeDownloads: {},
    queuedItems: {},
    queueDownloads: vi.fn(),
    isMobile: true,
    onBack: vi.fn(),
    onOpenAddDialog: vi.fn(),
    activePlaylistTitle: "Mobile Playlist",
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("triggers onBack callback when back button is clicked on mobile", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSubListResponse),
    });

    render(
      <ThemeProvider theme={theme}>
        <SubList {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Mobile Video Item")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: "back to playlists" });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
