import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import Navigation from "../../src/components/Nav.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("Nav Component (Desktop)", () => {
  const theme = createTheme();
  
  const defaultProps = {
    themeSwitcher: vi.fn(),
    theme: false, // dark mode by default (theme matches dark = false, light = true in App.jsx logic)
    connectionId: "socket_conn_1",
    setPlayListUrl: vi.fn(),
    token: "mock_token",
    setToken: vi.fn(),
    setConnectionId: vi.fn(),
    notifications: [
      { id: "note_1", message: "Download completed successfully", type: "success" },
      { id: "note_2", message: "Re-indexing failed", type: "error" },
    ],
    onDismissNotification: vi.fn(),
    backEnd: "http://localhost:8888/ytdiff",
    setSnack: vi.fn(),
    addNotification: vi.fn(),
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
    vi.clearAllMocks();
  });

  test("renders desktop navigation buttons and connection status", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByText("yt-diff")).toBeInTheDocument();
    
    // Verifies button elements exist
    expect(screen.getByRole("button", { name: /Re-Index/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlisted/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connected/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Light/i })).toBeInTheDocument(); // theme false -> dark. Button says Light
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  test("triggers setPlayListUrl when clicking Unlisted button", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    const unlistedBtn = screen.getByRole("button", { name: /Unlisted/i });
    fireEvent.click(unlistedBtn);

    expect(defaultProps.setPlayListUrl).toHaveBeenCalledWith("None");
  });

  test("toggles theme mode and saves in localStorage", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    const themeBtn = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(themeBtn);

    expect(defaultProps.themeSwitcher).toHaveBeenCalledWith(true);
    expect(localStorage.getItem("ytdiff_theme")).toBe("true");
  });

  test("opens logout confirmation dialog and handles logout", async () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutBtn);

    // Dialog opens
    expect(screen.getByText("Confirm Logout")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Logout" });
    fireEvent.click(confirmBtn);

    expect(defaultProps.setToken).toHaveBeenCalledWith(null);
    expect(defaultProps.setConnectionId).toHaveBeenCalledWith("");
    expect(localStorage.getItem("ytdiff_token")).toBe("null");
  });

  test("opens batch re-index dialog and submits config settings", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Batch re-index started successfully" }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    const reindexBtn = screen.getByRole("button", { name: /Re-Index/i });
    fireEvent.click(reindexBtn);

    expect(screen.getByText("Batch Re-index Playlists")).toBeInTheDocument();

    // Inputs inside dialog
    const startInput = screen.getByLabelText("Start (Exclusive)");
    const stopInput = screen.getByLabelText("Stop (Inclusive)");
    const filterInput = screen.getByLabelText("Site Filter (Optional)");

    fireEvent.change(startInput, { target: { value: "5" } });
    fireEvent.change(stopInput, { target: { value: "20" } });
    fireEvent.change(filterInput, { target: { value: "youtube.com" } });

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/reindexall",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          start: 5,
          stop: 20,
          siteFilter: "youtube.com",
          chunkSize: 8,
        }),
      })
    );

    await waitFor(() => {
      expect(defaultProps.setSnack).toHaveBeenCalledWith(
        "Batch re-index started successfully",
        "success"
      );
      expect(defaultProps.addNotification).toHaveBeenCalledWith(
        "Batch re-index started successfully",
        "success"
      );
    });
  });
});
