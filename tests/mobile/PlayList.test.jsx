import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import PlayList from "../../src/components/PlayList.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("PlayList Component (Mobile)", () => {
  const theme = createTheme();
  
  const mockPlaylists = {
    count: 1,
    rows: [
      {
        playlistUrl: "url_1",
        title: "Mobile Playlist 1",
        sortOrder: 0,
        monitoringType: "Full",
        lastUpdatedByScheduler: Date.now() - 3600000,
      },
    ],
  };

  const defaultProps = {
    setPlayListUrl: vi.fn(),
    playListUrl: "none",
    backEnd: "http://localhost:8888/ytdiff",
    setSnack: vi.fn(),
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    setSubListIndex: vi.fn(),
    tableContainerHeight: 500,
    rowsPerPageSubList: 8,
    setRowsPerPageSubList: vi.fn(),
    token: "mock_token",
    setToken: vi.fn(),
    playListIndex: 0,
    setPlayListIndex: vi.fn(),
    addNotification: vi.fn(),
    isMobile: true,
    onMobileLoad: vi.fn(),
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("triggers onMobileLoad instead of setPlayListUrl when LOAD button is clicked on mobile", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockPlaylists),
    });

    render(
      <ThemeProvider theme={theme}>
        <PlayList {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Mobile Playlist 1")).toBeInTheDocument();
    });

    const listBtn = screen.getByRole("button", { name: "LIST" });
    fireEvent.click(listBtn);

    expect(defaultProps.onMobileLoad).toHaveBeenCalledWith("url_1", "Mobile Playlist 1");
    expect(defaultProps.setPlayListUrl).not.toHaveBeenCalled();
  });
});
