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

  test("starts at normal speed and applies a chosen rate to the element", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    const video = document.querySelector("video");
    expect(video.playbackRate).toBe(1);

    fireEvent.click(screen.getByLabelText("playback speed"));
    fireEvent.click(screen.getByLabelText("playback speed 1.5x"));

    expect(video.playbackRate).toBe(1.5);
    expect(localStorage.getItem("ytdiff_player_rate")).toBe("1.5");
  });

  test("restores the saved rate on the next video", async () => {
    localStorage.setItem("ytdiff_player_rate", "0.75");
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(document.querySelector("video")).toBeInTheDocument();
    });

    // Applied to the element, not just remembered in state: the element is
    // new for every track and starts at 1.
    expect(document.querySelector("video").playbackRate).toBe(0.75);
    expect(screen.getByLabelText("playback speed")).toHaveTextContent("0.75x");
  });

  test("falls back to normal speed for a saved rate that is not offered", async () => {
    localStorage.setItem("ytdiff_player_rate", "3");
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })));

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(document.querySelector("video")).toBeInTheDocument();
    });
    expect(document.querySelector("video").playbackRate).toBe(1);
  });

  test("opens the description and links what it finds in it", async () => {
    const description =
      "Chapters: 00:00 intro, 2:13 the bit you came for\nhttps://example.test/more";

    // A routing mock rather than ordered one-shots: the description costs two
    // requests (mint, then fetch) and their order relative to the player's own
    // mint is not something a test should have to know.
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
      if (url.includes("desc_url_1")) {
        // Plain text, not a JSON envelope: mockResponse serialises, and a
        // quoted description would put a stray quote inside the last URL.
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => description,
          json: async () => ({ status: "success" }),
        });
      }
      return Promise.reject(new Error(`Unhandled mock fetch: ${url}`));
    });

    const row = {
      video_metadatum: {
        videoUrl: "https://example.test/v",
        fileName: "video.mp4",
        saveDirectory: "/downloads",
        title: "A video",
        descriptionFile: "video.description",
        downloadStatus: true,
      },
    };

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        subTitleFile={null}
        items={[row]}
        currentPlayerIndex={0}
      />,
      { contexts },
    );

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("show description"));

    const dialog = await screen.findByLabelText("description dialog");
    await waitFor(() => {
      expect(dialog).toHaveTextContent("Chapters:");
    });

    // A link opens out of the player; a timestamp is a seek, which is the
    // chapter list nobody has chapters for.
    const link = dialog.querySelector("a[href='https://example.test/more']");
    expect(link).toHaveAttribute("target", "_blank");
    expect(
      dialog.querySelector("button[aria-label='seek to 2:13']"),
    ).toBeInTheDocument();
  });

  test("offers no description button when the row has no description file", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("show description")).toBeDisabled();
  });

  test("seeks to the position the link named once metadata loads", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(
      <VideoPlayer {...defaultProps} subTitleFile={null} startAt={90} />,
      { contexts },
    );

    await waitFor(() =>
      expect(document.querySelector("video")).toBeInTheDocument()
    );
    const video = document.querySelector("video");
    fireEvent.loadedMetadata(video);

    expect(video.currentTime).toBe(90);

    // A recovery remint loads the metadata again; re-seeking there would
    // throw the viewer back to the start of what they had just watched past.
    video.currentTime = 200;
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(200);
  });

  test("starts at the beginning when the link names no position", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(<VideoPlayer {...defaultProps} subTitleFile={null} />, {
      contexts,
    });

    await waitFor(() =>
      expect(document.querySelector("video")).toBeInTheDocument()
    );
    const video = document.querySelector("video");
    fireEvent.loadedMetadata(video);

    expect(video.currentTime).toBe(0);
  });

  test("writes the position back when playback pauses", async () => {
    const onStartAtChange = vi.fn();
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        subTitleFile={null}
        onStartAtChange={onStartAtChange}
      />,
      { contexts },
    );

    await waitFor(() =>
      expect(document.querySelector("video")).toBeInTheDocument()
    );
    const video = document.querySelector("video");
    fireEvent.play(video);
    fireEvent.pause(video);

    expect(onStartAtChange).toHaveBeenCalledWith(0);

    // The same position again is not worth a history entry, so it is not
    // written twice.
    const calls = onStartAtChange.mock.calls.length;
    fireEvent.pause(video);
    expect(onStartAtChange.mock.calls.length).toBe(calls);
  });

  test("marks the chapter boundaries on the seek bar", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        subTitleFile={null}
        chapters={[
          { start: 0, end: 45, title: "Opening" },
          { start: 45, end: 132, title: "The part everyone came for" },
          { start: 132, end: 180, title: "Wrap-up" },
        ]}
      />,
      { contexts },
    );

    const video = await waitFor(() => {
      const element = document.querySelector("video");
      expect(element).toBeInTheDocument();
      return element;
    });

    // The seek bar has no length until the file says how long it is, and a
    // mark past the end is not a place anyone can seek to.
    Object.defineProperty(video, "duration", { value: 180, writable: true });
    fireEvent.loadedMetadata(video);

    // One fewer mark than chapters: the first boundary is zero, where the
    // slider already starts.
    await waitFor(() => {
      const marks = document.querySelectorAll(".MuiSlider-mark");
      expect(marks).toHaveLength(2);
      // 45 s and 132 s of a 180 s file, positioned as the fractions of the
      // bar they are.
      expect([...marks].map((mark) => mark.style.left)).toEqual([
        "25%",
        `${(132 / 180) * 100}%`,
      ]);
    });

    Object.defineProperty(video, "currentTime", { value: 60, writable: true });
    fireEvent.timeUpdate(video);

    await waitFor(() => {
      expect(screen.getByTestId("current-chapter")).toHaveTextContent(
        "The part everyone came for",
      );
    });
  });

  test("seeks when a chapter is clicked in the drawer", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      if (options?.method?.toLowerCase() === "post") {
        return Promise.resolve(
          mockResponse(
            ({
              status: "success",
              signedUrlId: "signed_url_123",
              expiry: Date.now() + 3600000,
            }),
          ),
        );
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => "WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nHello",
        json: async () => ({ status: "success" }),
      });
    });

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        chapters={[
          { start: 0, end: 45, title: "Opening" },
          { start: 45, end: 132, title: "The part everyone came for" },
        ]}
      />,
      { contexts },
    );

    await waitFor(() =>
      expect(document.querySelector("video")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText("toggle playlist drawer"));
    fireEvent.click(screen.getByRole("tab", { name: "Chapters" }));
    fireEvent.click(
      screen.getByLabelText("go to chapter The part everyone came for"),
    );

    expect(document.querySelector("video").currentTime).toBe(45);
  });

  test("says no chapter before the first one starts", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
    );

    renderWithContexts(
      <VideoPlayer
        {...defaultProps}
        subTitleFile={null}
        chapters={[{ start: 30, end: 90, title: "Later" }]}
      />,
      { contexts },
    );

    await waitFor(() => {
      expect(document.querySelector("video")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("current-chapter")).toBeNull();
  });

  describe("keyboard shortcuts", () => {
    const renderForKeys = async (props = {}) => {
      globalThis.fetch.mockResolvedValueOnce(
        mockResponse(({ status: "success", signedUrlId: "signed_url_123", expiry: Date.now() + 3600000 })),
      );
      const utils = renderWithContexts(
        <VideoPlayer {...defaultProps} subTitleFile={null} {...props} />,
        { contexts },
      );
      await waitFor(() =>
        expect(document.querySelector("video")).toBeInTheDocument(),
      );
      return utils;
    };

    beforeEach(() => {
      HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue();
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        writable: true,
        configurable: true,
      });
    });

    test("space and k play and pause", async () => {
      await renderForKeys();
      const video = document.querySelector("video");

      // jsdom's `paused` is a getter, so the playing state has to be set on
      // the instance for the second keypress to mean "pause".
      Object.defineProperty(video, "paused", {
        value: true,
        configurable: true,
      });
      fireEvent.keyDown(document, { key: " " });
      expect(HTMLVideoElement.prototype.play).toHaveBeenCalled();

      Object.defineProperty(video, "paused", {
        value: false,
        configurable: true,
      });
      fireEvent.keyDown(document, { key: "k" });
      expect(HTMLVideoElement.prototype.pause).toHaveBeenCalled();
    });

    test("the arrows seek and change the volume", async () => {
      await renderForKeys();
      const video = document.querySelector("video");
      video.currentTime = 30;

      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(video.currentTime).toBe(40);

      fireEvent.keyDown(document, { key: "ArrowLeft" });
      expect(video.currentTime).toBe(30);

      // Volume starts at full, so the first meaningful step is down.
      fireEvent.keyDown(document, { key: "ArrowDown" });
      expect(localStorage.getItem("ytdiff_player_volume")).toBe("0.9");

      fireEvent.keyDown(document, { key: "ArrowUp" });
      expect(localStorage.getItem("ytdiff_player_volume")).toBe("1");
    });

    test("m mutes and f goes full screen", async () => {
      await renderForKeys();

      fireEvent.keyDown(document, { key: "m" });
      expect(localStorage.getItem("ytdiff_player_muted")).toBe("true");

      fireEvent.keyDown(document, { key: "f" });
      expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled();
    });

    test("angle brackets step the speed and stop at the ends", async () => {
      await renderForKeys();

      fireEvent.keyDown(document, { key: ">" });
      expect(localStorage.getItem("ytdiff_player_rate")).toBe("1.25");
      fireEvent.keyDown(document, { key: ">" });
      expect(localStorage.getItem("ytdiff_player_rate")).toBe("1.5");
      fireEvent.keyDown(document, { key: "<" });
      fireEvent.keyDown(document, { key: "<" });
      fireEvent.keyDown(document, { key: "<" });
      fireEvent.keyDown(document, { key: "<" });
      fireEvent.keyDown(document, { key: "<" });
      // 0.5x is the slowest there is; it cannot go slower.
      expect(localStorage.getItem("ytdiff_player_rate")).toBe("0.5");
    });

    test("c toggles subtitles only when there are any", async () => {
      await renderForKeys({ subTitleFile: "video.vtt" });
      fireEvent.keyDown(document, { key: "c" });
      expect(localStorage.getItem("ytdiff_player_subtitles")).toBe("false");
    });

    test("a keystroke in a field is the field's, not the player's", async () => {
      await renderForKeys();
      const input = document.createElement("input");
      document.body.appendChild(input);

      fireEvent.keyDown(input, { key: " " });
      fireEvent.keyDown(input, { key: "ArrowRight" });

      expect(HTMLVideoElement.prototype.pause).not.toHaveBeenCalled();
      expect(localStorage.getItem("ytdiff_player_rate")).toBeNull();
      input.remove();
    });
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
