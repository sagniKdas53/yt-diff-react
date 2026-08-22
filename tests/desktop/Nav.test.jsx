import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import Navigation from "../../src/components/Nav.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";

describe("Nav Component (Desktop)", () => {
  const defaultProps = {
    themeSwitcher: vi.fn(),
    theme: false, // dark mode by default (theme matches dark = false, light = true in App.jsx logic)
    setPlayListUrl: vi.fn(),
  };

  let contexts;

  const renderNav = () =>
    renderWithContexts(<Navigation {...defaultProps} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
    vi.clearAllMocks();
    contexts = makeContexts({
      socket: { connectionId: "socket_conn_1" },
      notification: {
        notifications: [
          {
            id: "note_1",
            message: "Download completed successfully",
            type: "success",
          },
          { id: "note_2", message: "Re-indexing failed", type: "error" },
        ],
      },
    });
  });

  test("renders desktop navigation buttons and connection status", () => {
    renderNav();

    expect(screen.getByText("yt-diff")).toBeInTheDocument();
    
    // Verifies button elements exist
    expect(screen.getByRole("button", { name: /Re-Index/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlisted/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connected/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Light/i })).toBeInTheDocument(); // theme false -> dark. Button says Light
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  test("triggers setPlayListUrl when clicking Unlisted button", () => {
    renderNav();

    const unlistedBtn = screen.getByRole("button", { name: /Unlisted/i });
    fireEvent.click(unlistedBtn);

    expect(defaultProps.setPlayListUrl).toHaveBeenCalledWith("None");
  });

  test("toggles theme mode and saves in localStorage", () => {
    renderNav();

    const themeBtn = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(themeBtn);

    expect(defaultProps.themeSwitcher).toHaveBeenCalledWith(true);
    expect(localStorage.getItem("ytdiff_theme")).toBe("true");
  });

  test("opens logout confirmation dialog and handles logout", async () => {
    renderNav();

    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutBtn);

    // Dialog opens
    expect(screen.getByText("Confirm Logout")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Logout" });
    fireEvent.click(confirmBtn);

    expect(contexts.auth.logout).toHaveBeenCalled();
    expect(contexts.socket.setConnectionId).toHaveBeenCalledWith("");
    // Clearing the stored token is AuthContext's job now — see AuthContext.test.jsx.
  });

  test("opens batch re-index dialog and submits config settings", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ message: "Batch re-index started successfully" })));

    renderNav();

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
        method: "post",
        body: JSON.stringify({
          start: 5,
          stop: 20,
          siteFilter: "youtube.com",
          chunkSize: 8,
        }),
      })
    );

    await waitFor(() => {
      expect(contexts.notification.setSnack).toHaveBeenCalledWith(
        "Batch re-index started successfully",
        "success"
      );
      expect(contexts.notification.addNotification).toHaveBeenCalledWith(
        "Batch re-index started successfully",
        "success"
      );
    });
  });
});
