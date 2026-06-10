import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import SubListItemCard from "../../src/components/SubListItemCard.jsx";
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
});
