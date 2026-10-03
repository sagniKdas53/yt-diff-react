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

  test("shows the description full-screen on mobile", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      if (options?.method?.toLowerCase() === "post") {
        return Promise.resolve(
          mockResponse(
            ({
              status: "success",
              signedUrlId:
                body.fileName === "video.description"
                  ? "desc_url_1"
                  : "signed_url_123",
              expiry: Date.now() + 3600000,
            }),
          ),
        );
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => "A short description",
        json: async () => ({ status: "success" }),
      });
    });

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        subTitleFile={null}
        items={[{
          video_metadatum: {
            videoUrl: "https://example.test/v",
            fileName: "video.mp4",
            saveDirectory: "/downloads",
            descriptionFile: "video.description",
            downloadStatus: true,
          },
        }]}
        currentPlayerIndex={0}
      />,
      { contexts },
    );

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("show description"));

    // The same dialog, sized for the screen: on a phone a width-limited
    // paper is unreadable and the close button is off-screen.
    const dialog = await screen.findByLabelText("description dialog");
    await waitFor(() => {
      expect(dialog).toHaveTextContent("A short description");
    });
    expect(
      dialog.querySelector(".MuiDialog-paperFullScreen"),
    ).not.toBeNull();
  });

  test("changes the playback speed from the control bar", async () => {
    renderPlayer();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    // The rate control sits beside the volume control, which on mobile is a
    // tap target rather than a slider — the menu itself is unchanged.
    fireEvent.click(screen.getByLabelText("playback speed"));
    fireEvent.click(screen.getByLabelText("playback speed 2x"));

    expect(document.querySelector("video").playbackRate).toBe(2);
    expect(localStorage.getItem("ytdiff_player_rate")).toBe("2");
  });
});
