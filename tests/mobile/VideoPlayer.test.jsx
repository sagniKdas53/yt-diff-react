import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import VideoPlayer from "../../src/components/VideoPlayer.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";

describe("VideoPlayer Component (Mobile)", () => {
  const defaultProps = {
    saveDirectory: "/downloads",
    fileName: "video.mp4",
    title: "Mobile Video Player",
    subTitleFile: null,
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
    loadedPlayList: "playlist_1",
    rowsPerPage: 8,
  };

  let contexts;

  const renderPlayer = () =>
    renderWithContexts(<VideoPlayer {...defaultProps} />, { contexts });

  beforeEach(() => {
    contexts = makeContexts();
    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      if (options?.method?.toLowerCase() === "post") {
        if (body.fileName === "video.mp4") {
          return Promise.resolve(mockResponse(({ status: "success", signedUrlId: "url_123", expiry: Date.now() + 3600000 })));
        }
      }
      return Promise.reject(new Error(`Unhandled mock fetch: ${url}`));
    });
    localStorage.clear();
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("single click on volume button toggles mobile volume slider overlay", async () => {
    renderPlayer();

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
    renderPlayer();

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
