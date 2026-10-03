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
 });
