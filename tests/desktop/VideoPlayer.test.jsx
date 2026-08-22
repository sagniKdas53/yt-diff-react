import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import VideoPlayer from "../../src/components/VideoPlayer.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";

describe("VideoPlayer Component (Desktop)", () => {
  const defaultProps = {
    saveDirectory: "/downloads",
    fileName: "video.mp4",
    title: "Testing Video Player Title",
    subTitleFile: "video.vtt",
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
          return Promise.resolve(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));
        }
        if (body.fileName === "video.vtt") {
          return Promise.resolve(mockResponse(({ status: "success", signedUrlId: "subtitle_url_123" })));
        }
      } else {
        if (url.includes("subtitle_url_123")) {
          return Promise.resolve(mockResponse("WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nHello World"));
        }
      }
      return Promise.reject(new Error(`Unhandled mock fetch: ${url}`));
    });
    localStorage.clear();
    // Stub HTMLVideoElement prototype functions
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.pause = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches signed url on mount and loads video", async () => {
    renderPlayer();

    // Should fetch video signed URL
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/getfile",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({ saveDirectory: "/downloads", fileName: "video.mp4" }),
      })
    );

    await waitFor(() => {
      const videoEl = screen.queryByTestId("video-element") || document.querySelector("video");
      expect(videoEl).toBeInTheDocument();
      expect(videoEl.src).toContain("signed_url_123");
    });
  });

  test("displays error message if fetching signed URL fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(({ message: "Unauthorized access" }), { ok: false, statusText: "Forbidden" }));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(screen.getByText(/Unauthorized access/i)).toBeInTheDocument();
    });
  });

  test("toggles play/pause states on user trigger", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(); // Loader hides
    });

    const playBtn = screen.getByLabelText("play");
    fireEvent.click(playBtn);

    // Since videoRef is mocked, play should be triggered
    expect(HTMLVideoElement.prototype.play).toHaveBeenCalled();
  });

  test("toggles mute setting and saves in localStorage", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    const muteBtn = screen.getByLabelText("mute volume");
    fireEvent.click(muteBtn);

    expect(localStorage.getItem("ytdiff_player_muted")).toBe("true");
  });
});
