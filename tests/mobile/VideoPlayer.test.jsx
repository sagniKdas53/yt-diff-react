import React from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
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
  const originalMatchMedia = window.matchMedia;

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
    window.matchMedia = originalMatchMedia;
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

  test("a touch tablet wider than sm gets the mobile control bar", async () => {
    // A 900px touch screen is past the `sm` breakpoint, so a width-only check
    // calls it a desktop. The pointer media query is what says "fingers".
    const widePhone = (query) => {
      const max = query.match(/\(max-width:\s*([0-9.]+)px\)/);
      const min = query.match(/\(min-width:\s*([0-9.]+)px\)/);
      let matches = false;
      if (query.includes("pointer: coarse") || query.includes("hover: none")) {
        matches = true;
      } else if (max) {
        matches = 900 <= parseFloat(max[1]);
      } else if (min) {
        matches = 900 >= parseFloat(min[1]);
      }
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };
    window.matchMedia = vi.fn().mockImplementation(widePhone);

    renderPlayer();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    // Single tap opens the overlay on mobile; on "desktop" it would mute.
    fireEvent.click(screen.getByLabelText("mute volume"));
    expect(screen.getByLabelText("mobile volume slider")).toBeInTheDocument();

    expect(
      window.getComputedStyle(screen.getByLabelText("play")).minWidth,
    ).toBe("44px");
  });

  describe("tapping the picture", () => {
    // On touch, `pointerdown` comes first and `mousemove` follows it just
    // before `click`, so by the time `click` runs the controls are always
    // already showing. These stage that order.
    const tap = (target) => {
      fireEvent.pointerDown(target);
      fireEvent.mouseMove(target);
      fireEvent.click(target);
    };
    const topBarOpacity = () =>
      window.getComputedStyle(screen.getByLabelText("go back").parentElement).opacity;

    const playingPlayer = async () => {
      renderPlayer();
      await waitFor(() => expect(document.querySelector("video")).toBeInTheDocument());
      await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
      const video = document.querySelector("video");
      // jsdom starts every element paused; this one is mid-playback.
      Object.defineProperty(video, "paused", { value: false, configurable: true });
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      fireEvent.play(video);
      return video;
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    test("a tap on hidden controls reveals them without pausing", async () => {
      const video = await playingPlayer();
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(topBarOpacity()).toBe("0");

      tap(screen.getByTestId("video-tap-area"));

      expect(HTMLVideoElement.prototype.pause).not.toHaveBeenCalled();
      expect(topBarOpacity()).toBe("1");
      expect(video.paused).toBe(false);
    });

    test("a tap on visible controls pauses", async () => {
      await playingPlayer();
      expect(topBarOpacity()).toBe("1");

      tap(screen.getByTestId("video-tap-area"));

      expect(HTMLVideoElement.prototype.pause).toHaveBeenCalledTimes(1);
    });
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
