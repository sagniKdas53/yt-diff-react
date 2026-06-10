import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import PlayList from "../../src/components/PlayList.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("PlayList Component (Desktop)", () => {
  const theme = createTheme();
  
  const mockPlaylists = {
    count: 2,
    rows: [
      {
        playlistUrl: "url_1",
        title: "Awesome Playlist 1",
        sortOrder: 0,
        monitoringType: "Full",
        lastUpdatedByScheduler: Date.now() - 3600000,
      },
      {
        playlistUrl: "url_2",
        title: "Awesome Playlist 2",
        sortOrder: 1,
        monitoringType: "Start",
        lastUpdatedByScheduler: Date.now() - 7200000,
      },
    ],
  };

  const defaultProps = {
    setPlayListUrl: vi.fn(),
    playListUrl: "url_1",
    backEnd: "http://localhost:8888/ytdiff",
    setSnack: vi.fn(),
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    setSubListIndex: vi.fn(),
    tableContainerHeight: "500px",
    rowsPerPageSubList: 8,
    setRowsPerPageSubList: vi.fn(),
    token: "mock_token",
    setToken: vi.fn(),
    playListIndex: 0,
    setPlayListIndex: vi.fn(),
    addNotification: vi.fn(),
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches and renders playlists on mount", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockPlaylists),
    });

    render(
      <ThemeProvider theme={theme}>
        <PlayList {...defaultProps} />
      </ThemeProvider>
    );

    // Should fetch playlists
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/getplay",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({
          start: 0,
          stop: 10,
          sort: "1",
          order: "1",
          query: "",
        }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Awesome Playlist 1")).toBeInTheDocument();
      expect(screen.getByText("Awesome Playlist 2")).toBeInTheDocument();
    });
  });

  test("opens Add Dialog on clicking FAB, and submits url list", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockPlaylists),
    }).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: "success" }),
    });

    render(
      <ThemeProvider theme={theme}>
        <PlayList {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Awesome Playlist 1")).toBeInTheDocument();
    });

    const fabBtn = screen.getByRole("button", { name: "action" });
    fireEvent.click(fabBtn);

    // Dialog should display
    expect(screen.getByText("Add")).toBeInTheDocument();

    const inputField = screen.getByLabelText("Url List");
    fireEvent.change(inputField, { target: { value: "https://youtube.com/playlist?list=new_id" } });

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    // Wait for input field to clear (indicating async submission process is complete)
    await waitFor(() => {
      expect(inputField.value).toBe("");
    });

    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "http://localhost:8888/ytdiff/list",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({
          urlList: ["https://youtube.com/playlist?list=new_id"],
          chunkSize: 9,
          monitoringType: "N/A",
          sleep: true,
        }),
      })
    );
  });
});
