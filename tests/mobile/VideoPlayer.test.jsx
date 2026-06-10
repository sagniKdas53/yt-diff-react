import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import VideoPlayer from "../../src/components/VideoPlayer.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("VideoPlayer Component (Mobile)", () => {
  const theme = createTheme();

  const defaultProps = {
    saveDirectory: "/downloads",
    fileName: "video.mp4",
    title: "Mobile Video Player",
    subTitleFile: null,
    backEnd: "/ytdiff",
    token: "mock_token",
    onClose: vi.fn(),
    items: [],
    itemCount: 0,
    page: 0,
    start: 0,
    currentPlayerIndex: -1,
    setPage: vi.fn(),
    openPlayer: vi.fn(),
    playlistDirectory: "/downloads",
    thumbUrls: {},
    activeDownloads: {},
    queuedItems: {},
    queueDownloads: vi.fn(),
    loadedPlayList: "playlist_1",
    rowsPerPage: 8,
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("single click on volume button toggles mobile volume slider overlay", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", signedUrlId: "url_123", expiry: Date.now() + 100000 }),
    });

    render(
      <ThemeProvider theme={theme}>
        <VideoPlayer {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    // Check volume slider overlay is NOT visible by default on mobile
    expect(screen.queryByLabelText("volume slider overlay")).not.toBeInTheDocument();

    const volumeBtn = screen.getByLabelText("mute volume");
    
    // Simulate single click
    fireEvent.click(volumeBtn);

    // The mobile volume slider should now be rendered
    const slider = screen.getByLabelText("mobile volume slider");
    expect(slider).toBeInTheDocument();
  });

  test("double click on volume button toggles mute state", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", signedUrlId: "url_123", expiry: Date.now() + 100000 }),
    });

    render(
      <ThemeProvider theme={theme}>
        <VideoPlayer {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    const volumeBtn = screen.getByLabelText("mute volume");
    
    // Simulate double click (two click events in < 300ms)
    fireEvent.click(volumeBtn);
    fireEvent.click(volumeBtn);

    // Muted state should toggle in localStorage
    expect(localStorage.getItem("ytdiff_player_muted")).toBe("true");
  });
});
