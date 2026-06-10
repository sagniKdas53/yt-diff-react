import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import PlayerPlaylistDrawer from "../../src/components/PlayerPlaylistDrawer.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("PlayerPlaylistDrawer Component (Desktop)", () => {
  const theme = createTheme();
  
  const mockItems = [
    {
      positionInPlaylist: 1,
      video_metadatum: {
        videoUrl: "url_downloaded",
        title: "Downloaded Video",
        downloadStatus: true,
        fileName: "file1.mp4",
        saveDirectory: "/dir",
      },
    },
    {
      positionInPlaylist: 2,
      video_metadatum: {
        videoUrl: "url_queued",
        title: "Queued Video",
        downloadStatus: false,
        fileName: "file2.mp4",
        saveDirectory: "/dir",
      },
    },
    {
      positionInPlaylist: 3,
      video_metadatum: {
        videoUrl: "url_ready",
        title: "Ready to Download Video",
        downloadStatus: false,
        fileName: "file3.mp4",
        saveDirectory: "/dir",
      },
    },
    {
      positionInPlaylist: 4,
      video_metadatum: {
        videoUrl: "url_downloading",
        title: "Downloading Video",
        downloadStatus: false,
        fileName: "file4.mp4",
        saveDirectory: "/dir",
      },
    },
  ];

  const defaultProps = {
    drawerOpen: true,
    setDrawerOpen: vi.fn(),
    items: mockItems,
    itemCount: 4,
    page: 0,
    start: 0,
    currentPlayerIndex: 0,
    setPage: vi.fn(),
    openPlayer: vi.fn(),
    playlistDirectory: "/dir",
    thumbUrls: {},
    activeDownloads: {
      url_downloading: 45.0, // downloading at 45%
    },
    queuedItems: {
      url_queued: { queuePosition: 3 }, // queued at #3
    },
    queueDownloads: vi.fn(),
    loadedPlayList: "playlist_url",
    backEnd: "/ytdiff",
    baseUrl: "http://localhost:8888",
    rowsPerPage: 2, // triggers pagination since itemCount is 4
  };

  test("renders all items in drawer list with correct states", () => {
    render(
      <ThemeProvider theme={theme}>
        <PlayerPlaylistDrawer {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByText("Downloaded Video")).toBeInTheDocument();
    expect(screen.getByText("Queued Video")).toBeInTheDocument();
    expect(screen.getByText("Ready to Download Video")).toBeInTheDocument();
    expect(screen.getByText("Downloading Video")).toBeInTheDocument();

    // Check queued text state
    expect(screen.getByText("Queued #3")).toBeInTheDocument();
    
    // Check not downloaded state
    expect(screen.getByText("Not Downloaded")).toBeInTheDocument();

    // Check download progress bar exists for downloading item
    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("aria-valuenow", "45");
  });

  test("calls openPlayer when clicking a downloaded item", () => {
    render(
      <ThemeProvider theme={theme}>
        <PlayerPlaylistDrawer {...defaultProps} />
      </ThemeProvider>
    );

    const downloadedItem = screen.getByText("Downloaded Video");
    fireEvent.click(downloadedItem);

    expect(defaultProps.openPlayer).toHaveBeenCalledWith(
      "/dir",
      "file1.mp4",
      "Downloaded Video",
      0,
      null
    );
  });

  test("does not call openPlayer when clicking a non-downloaded item", () => {
    const openPlayer = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <PlayerPlaylistDrawer {...defaultProps} openPlayer={openPlayer} />
      </ThemeProvider>
    );

    const queuedItem = screen.getByText("Queued Video");
    fireEvent.click(queuedItem);

    expect(openPlayer).not.toHaveBeenCalled();
  });

  test("triggers queueDownloads when clicking the download button", () => {
    render(
      <ThemeProvider theme={theme}>
        <PlayerPlaylistDrawer {...defaultProps} />
      </ThemeProvider>
    );

    const downloadButtons = screen.getAllByRole("button");
    // Find download button by looking for tooltip or clicking the icon button (it has DownloadIcon)
    // The download button is only present for "Ready to Download Video" (third item)
    const btn = screen.getByTooltip ? screen.getByTooltip("Download video") : screen.getByLabelText("Download video");
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(defaultProps.queueDownloads).toHaveBeenCalledWith([
      {
        url: "url_ready",
        playlistUrl: "playlist_url",
        positionInPlaylist: 3,
      },
    ]);
  });

  test("renders pagination controls and handles page navigation", () => {
    render(
      <ThemeProvider theme={theme}>
        <PlayerPlaylistDrawer {...defaultProps} items={mockItems.slice(0, 2)} />
      </ThemeProvider>
    );

    // Displays page 1 / 2
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    // Next page button is active, click it
    const nextBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='NavigateNextIcon']"));
    expect(nextBtn).toBeEnabled();
    
    fireEvent.click(nextBtn);
    expect(defaultProps.setPage).toHaveBeenCalledWith(1);
  });
});
