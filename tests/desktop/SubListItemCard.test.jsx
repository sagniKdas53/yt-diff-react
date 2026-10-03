import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import SubListItemCard from "../../src/components/SubListItemCard.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("SubListItemCard Component (Desktop)", () => {
  const theme = createTheme();
  
  const mockElementDownloaded = {
    id: "video_123",
    isAvailable: true,
    video_metadatum: {
      videoUrl: "https://youtube.com/watch?v=123",
      title: "Downloaded Video File",
      downloadStatus: true,
      fileName: "file.mp4",
      saveDirectory: "/downloads",
    },
  };

  const mockElementNotDownloaded = {
    id: "video_456",
    isAvailable: true,
    video_metadatum: {
      videoUrl: "https://youtube.com/watch?v=456",
      title: "Online Only Video",
      downloadStatus: false,
      fileName: "file.mp4",
      saveDirectory: "/downloads",
    },
  };

  const defaultProps = {
    index: 0,
    mediaHeight: 140,
    thumbUrl: "http://localhost:8888/thumb.png",
    backEnd: "/ytdiff",
    playlistDirectory: "/downloads",
    isQueued: false,
    queuePosition: null,
    isActivelyDownloading: false,
    isSelected: false,
    loadedPlayList: "https://youtube.com/playlist?list=xyz",
    onSelect: vi.fn(),
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    onDeleteDownloaded: vi.fn(),
    onDeleteDB: vi.fn(),
    onDownloadFile: vi.fn(),
  };

  test("renders downloaded video card correctly", () => {
    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementDownloaded}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Downloaded Video File")).toBeInTheDocument();
    
    // Play overlay button should be present for downloaded video
    const playBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='PlayArrowIcon']"));
    expect(playBtn).toBeInTheDocument();

    // Delete downloaded button (DeleteSweepIcon) should be present
    const deleteDownloadedBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='DeleteSweepIcon']"));
    expect(deleteDownloadedBtn).toBeInTheDocument();

    // Checkbox is unchecked
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  test("renders non-downloaded video card correctly", () => {
    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementNotDownloaded}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("Online Only Video")).toBeInTheDocument();

    // Play overlay button should NOT be present
    const playBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='PlayArrowIcon']"));
    expect(playBtn).toBeUndefined();

    // Delete DB button (DeleteForeverIcon) should be present instead of DeleteSweepIcon
    const deleteDbBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='DeleteForeverIcon']"));
    expect(deleteDbBtn).toBeInTheDocument();
  });

  test("renders queued and actively downloading borders and badge states", () => {
    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementNotDownloaded}
          isQueued={true}
          queuePosition={5}
          isActivelyDownloading={true}
        />
      </ThemeProvider>
    );

    // Should render queue position badge
    expect(screen.getByText("#5")).toBeInTheDocument();
  });

  test("triggers checkbox selection onChange", () => {
    const onSelect = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementDownloaded}
          onSelect={onSelect}
        />
      </ThemeProvider>
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onSelect).toHaveBeenCalled();
  });

  test("triggers onPlay when clicking the play icon overlay", () => {
    const onPlay = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementDownloaded}
          onPlay={onPlay}
        />
      </ThemeProvider>
    );

    const playBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='PlayArrowIcon']"));
    fireEvent.click(playBtn);
    expect(onPlay).toHaveBeenCalledWith(0);
  });

  test("triggers action callbacks for remove, delete, and download file buttons", () => {
    const onRemove = vi.fn();
    const onDeleteDownloaded = vi.fn();
    const onDownloadFile = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <SubListItemCard
          {...defaultProps}
          element={mockElementDownloaded}
          onRemove={onRemove}
          onDeleteDownloaded={onDeleteDownloaded}
          onDownloadFile={onDownloadFile}
        />
      </ThemeProvider>
    );

    const removeBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='PlaylistRemoveIcon']"));
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(mockElementDownloaded.id);

    const deleteDownloadedBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='DeleteSweepIcon']"));
    fireEvent.click(deleteDownloadedBtn);
    expect(onDeleteDownloaded).toHaveBeenCalledWith(mockElementDownloaded.id);

    const downloadFileBtn = screen.getAllByRole("button").find(b => b.querySelector("svg[data-testid='FileDownloadIcon']"));
    fireEvent.click(downloadFileBtn);
    expect(onDownloadFile).toHaveBeenCalledWith("/downloads", "file.mp4");
  });

  describe("partial downloads", () => {
    const partialRow = (missingExtras, reason) => ({
      id: "video_789",
      isAvailable: true,
      video_metadatum: {
        videoUrl: "https://youtube.com/watch?v=789",
        title: "Partially Downloaded Video",
        downloadStatus: true,
        fileName: "partial.mp4",
        saveDirectory: "/downloads",
        missingExtras,
        reason,
      },
    });

    const renderPartial = (element) => {
      const contexts = makeContexts();
      const view = renderWithContexts(
        <SubListItemCard {...defaultProps} element={element} />,
        { contexts },
      );
      return { ...view, contexts };
    };

    const openMenu = async () => {
      fireEvent.click(screen.getByLabelText("fetch missing extras"));
      return screen.findByRole("menuitem", { name: /fetch missing extras/i });
    };

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    test("names the missing extras and a rate-limited reason on the chip", () => {
      renderPartial(
        partialRow(["subtitles", "thumbnail"], "rate-limited"),
      );

      expect(
        screen.getByText("partial: subtitles, thumbnail (rate limited)"),
      ).toBeInTheDocument();
    });

    test("renders any other reason as given, and nothing without one", () => {
      const { unmount } = renderPartial(partialRow(["comments"], "error"));
      expect(screen.getByText("partial: comments (error)")).toBeInTheDocument();
      unmount();

      renderPartial(partialRow(["description"], null));
      expect(screen.getByText("partial: description")).toBeInTheDocument();
    });

    test("shows no chip and no retry item when nothing is missing", () => {
      renderPartial(partialRow(null, null));

      expect(screen.queryByText(/^partial:/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("fetch missing extras")).toBeNull();
    });

    test("posts the row's videoUrl to /syncextras", async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse({
          url: "https://youtube.com/watch?v=789",
          status: "recovered",
          recovered: ["subtitles", "thumbnail"],
          stillMissing: [],
          reason: null,
        }),
      );
      renderPartial(partialRow(["subtitles", "thumbnail"], "rate-limited"));

      fireEvent.click(await openMenu());

      await waitFor(() =>
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "http://localhost:8888/ytdiff/syncextras",
          expect.objectContaining({ method: "post" }),
        ),
      );
      const [, options] = globalThis.fetch.mock.calls.at(-1);
      expect(JSON.parse(options.body)).toEqual({
        videoUrl: "https://youtube.com/watch?v=789",
      });
    });

    test("does not fire a second request while one is in flight", async () => {
      let release;
      renderPartial(partialRow(["subtitles"], "rate-limited"));
      globalThis.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve(
                mockResponse({
                  url: "https://youtube.com/watch?v=789",
                  status: "recovered",
                  recovered: ["subtitles"],
                  stillMissing: [],
                  reason: null,
                }),
              );
          }),
      );

      const item = await openMenu();
      fireEvent.click(item);
      // The menu closes on the first click, so the second one comes from a
      // click landing before the request lands.
      fireEvent.click(item);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("progressbar", { hidden: true }),
      ).toBeInTheDocument();

      release();
      await waitFor(() =>
        expect(
          screen.queryByRole("progressbar", { hidden: true }),
        ).toBeNull(),
      );
    });

    test("removes the chip when everything was recovered", async () => {
      const { contexts } = renderPartial(
        partialRow(["subtitles", "thumbnail"], "rate-limited"),
      );
      globalThis.fetch.mockResolvedValue(
        mockResponse({
          url: "https://youtube.com/watch?v=789",
          status: "recovered",
          recovered: ["subtitles", "thumbnail"],
          stillMissing: [],
          reason: null,
        }),
      );

      fireEvent.click(await openMenu());

      await waitFor(() =>
        expect(screen.queryByText(/^partial:/)).toBeNull(),
      );
      expect(screen.queryByLabelText("fetch missing extras")).toBeNull();
      expect(contexts.notification.addNotification).toHaveBeenCalledWith(
        expect.stringContaining("Fetched subtitles, thumbnail"),
        "success",
      );
    });

    test("keeps the chip and narrows it to what is still missing", async () => {
      renderPartial(partialRow(["subtitles", "thumbnail"], "rate-limited"));
      globalThis.fetch.mockResolvedValue(
        mockResponse({
          url: "https://youtube.com/watch?v=789",
          status: "recovered",
          recovered: ["subtitles"],
          stillMissing: ["thumbnail"],
          reason: "rate-limited",
        }),
      );

      fireEvent.click(await openMenu());

      await waitFor(() =>
        expect(
          screen.getByText("partial: thumbnail (rate limited)"),
        ).toBeInTheDocument(),
      );
      expect(screen.getByLabelText("fetch missing extras")).toBeInTheDocument();
    });

    test("reports a refused request through the notification log", async () => {
      const { contexts } = renderPartial(partialRow(["subtitles"], null));
      globalThis.fetch.mockResolvedValue(
        mockResponse({ status: "error", message: "no such video" }, {
          ok: false,
          status: 500,
        }),
      );

      fireEvent.click(await openMenu());

      await waitFor(() =>
        expect(contexts.notification.addNotification).toHaveBeenCalledWith(
          expect.stringContaining("no such video"),
          "error",
        ),
      );
      expect(screen.getByText("partial: subtitles")).toBeInTheDocument();
    });
  });

  describe("files the bot will reap", () => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    /**
     * A date that far off, as the server would send it. Every offset carries a
     * margin past the whole unit, because the chip is written from a clock
     * reading taken after the test picked the offset: an offset of exactly
     * fifteen minutes can read as fourteen.
     */
    const inMs = (ms) => new Date(Date.now() + ms).toISOString();

    const expiringRow = (botExpiresAt) => ({
      id: "video_999",
      isAvailable: true,
      video_metadatum: {
        videoUrl: "https://youtube.com/watch?v=999",
        title: "Expiring Video",
        downloadStatus: true,
        fileName: "expiring.mp4",
        saveDirectory: "/downloads",
        botExpiresAt,
      },
    });

    const renderExpiring = (botExpiresAt) => {
      const contexts = makeContexts();
      const view = renderWithContexts(
        <SubListItemCard
          {...defaultProps}
          element={expiringRow(botExpiresAt)}
        />,
        { contexts },
      );
      return { ...view, contexts };
    };

    const openKeepMenu = async () => {
      fireEvent.click(screen.getByLabelText("keep file"));
      return screen.findByRole("menuitem", { name: "Keep" });
    };

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    test("says how long is left in the largest unit that is still true", () => {
      const { unmount } = renderExpiring(inMs(30 * SECOND));
      expect(
        screen.getByText("expires in under a minute"),
      ).toBeInTheDocument();
      unmount();

      renderExpiring(inMs(15 * MINUTE + 30 * SECOND));
      expect(screen.getByText("expires in 15 min")).toBeInTheDocument();
    });

    test("counts in hours and days above an hour", () => {
      const { unmount } = renderExpiring(inMs(3 * HOUR + MINUTE));
      expect(screen.getByText("expires in 3 h")).toBeInTheDocument();
      unmount();

      renderExpiring(inMs(2 * DAY + HOUR));
      expect(screen.getByText("expires in 2 days")).toBeInTheDocument();
    });

    test("shows no chip and no Keep for a file that is not going anywhere", () => {
      renderExpiring(null);

      expect(screen.queryByText(/expires/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("keep file")).toBeNull();
    });

    test("posts the row's videoUrl to /keepfile", async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse({ status: "success", kept: 1 }),
      );
      renderExpiring(inMs(3 * HOUR + MINUTE));

      fireEvent.click(await openKeepMenu());

      await waitFor(() =>
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "http://localhost:8888/ytdiff/keepfile",
          expect.objectContaining({ method: "post" }),
        ),
      );
      const [, options] = globalThis.fetch.mock.calls.at(-1);
      expect(JSON.parse(options.body)).toEqual({
        videoUrl: "https://youtube.com/watch?v=999",
      });
    });

    test("does not fire a second request while one is in flight", async () => {
      let release;
      renderExpiring(inMs(3 * HOUR + MINUTE));
      globalThis.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve(mockResponse({ status: "success", kept: 1 }));
          }),
      );

      const item = await openKeepMenu();
      fireEvent.click(item);
      // The menu closes on the first click, so the second one comes from a
      // click landing before the request lands.
      fireEvent.click(item);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("progressbar", { hidden: true }),
      ).toBeInTheDocument();

      release();
      await waitFor(() =>
        expect(
          screen.queryByRole("progressbar", { hidden: true }),
        ).toBeNull(),
      );
    });

    test("takes the chip away and says what it kept", async () => {
      const { contexts } = renderExpiring(inMs(3 * HOUR + MINUTE));
      globalThis.fetch.mockResolvedValue(
        mockResponse({ status: "success", kept: 2 }),
      );

      fireEvent.click(await openKeepMenu());

      await waitFor(() =>
        expect(screen.queryByText(/^expires in/)).toBeNull(),
      );
      expect(screen.queryByLabelText("keep file")).toBeNull();
      expect(contexts.notification.addNotification).toHaveBeenCalledWith(
        expect.stringContaining("will not be reaped"),
        "success",
      );
    });

    test("says nothing was kept rather than claiming it was", async () => {
      // The bot never fetched this file, so there was nothing for Keep to
      // keep — and the file is still going to be reaped, so the chip stays.
      const { contexts } = renderExpiring(inMs(3 * HOUR + MINUTE));
      globalThis.fetch.mockResolvedValue(
        mockResponse({ status: "success", kept: 0 }),
      );

      fireEvent.click(await openKeepMenu());

      await waitFor(() =>
        expect(contexts.notification.addNotification).toHaveBeenCalledWith(
          expect.stringContaining("Nothing to keep"),
          "info",
        ),
      );
      expect(screen.getByText("expires in 3 h")).toBeInTheDocument();
      expect(screen.getByLabelText("keep file")).toBeInTheDocument();
    });

    test("reports a refused Keep and leaves the chip alone", async () => {
      const { contexts } = renderExpiring(inMs(3 * HOUR + MINUTE));
      globalThis.fetch.mockResolvedValue(
        mockResponse(
          { error: "Could not keep that file." },
          { ok: false, status: 500 },
        ),
      );

      fireEvent.click(await openKeepMenu());

      await waitFor(() =>
        expect(contexts.notification.addNotification).toHaveBeenCalledWith(
          expect.stringContaining("Could not keep that file."),
          "error",
        ),
      );
      expect(screen.getByText("expires in 3 h")).toBeInTheDocument();
    });

  describe("the overflow menu", () => {
    const HOUR = 60 * 60 * 1000;
    const inMs = (ms) => new Date(Date.now() + ms).toISOString();

    const menuRow = ({ missingExtras, reason, botExpiresAt }) => ({
      id: "video_555",
      isAvailable: true,
      video_metadatum: {
        videoUrl: "https://youtube.com/watch?v=555",
        title: "Menu Video",
        downloadStatus: true,
        fileName: "menu.mp4",
        saveDirectory: "/downloads",
        missingExtras,
        reason,
        botExpiresAt,
      },
    });

    const renderMenuRow = (overrides) =>
      renderWithContexts(
        <SubListItemCard
          {...defaultProps}
          element={menuRow(overrides)}
        />,
        { contexts: makeContexts() },
      );

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    test("offers neither repair when the row has neither chip", () => {
      renderMenuRow({ missingExtras: null, reason: null, botExpiresAt: null });

      expect(screen.queryByLabelText("fetch missing extras")).toBeNull();
      expect(screen.queryByLabelText("keep file")).toBeNull();
      expect(screen.queryByRole("menuitem")).toBeNull();
    });

    test("offers the repair, and only that one, for a partial row", async () => {
      renderMenuRow({
        missingExtras: ["subtitles"],
        reason: "rate-limited",
        botExpiresAt: null,
      });

      fireEvent.click(screen.getByLabelText("fetch missing extras"));

      expect(
        await screen.findByRole("menuitem", { name: /fetch missing extras/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Keep" })).toBeNull();
    });

    test("offers the repair, and only that one, for an expiring row", async () => {
      renderMenuRow({
        missingExtras: null,
        reason: null,
        botExpiresAt: inMs(3 * HOUR + HOUR / 60),
      });

      fireEvent.click(screen.getByLabelText("keep file"));

      expect(
        await screen.findByRole("menuitem", { name: "Keep" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: /fetch missing extras/i }),
      ).toBeNull();
    });

    test("never rounds an hours count up past the time that is left", () => {
      renderMenuRow({
        missingExtras: null,
        reason: null,
        botExpiresAt: inMs(23 * HOUR + 0.7 * HOUR),
      });

      expect(screen.getByText("expires in 23 h")).toBeInTheDocument();
      expect(screen.queryByText("expires in 24 h")).toBeNull();
    });
  });
  });
 });
