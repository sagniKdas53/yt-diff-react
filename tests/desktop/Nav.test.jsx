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
    // Routed by URL rather than filled from a queue of one-off values: the
    // toolbar's job drawer polls /queuestatus on mount, so "the next response"
    // would be the drawer's, not the re-index the test is about.
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes("/reindexall")) {
        return mockResponse({ message: "Batch re-index started successfully" });
      }
      return mockResponse({
        status: "success",
        generation: 1,
        queue: [],
        listings: [],
      });
    });
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

  test("puts the job manager beside the notification manager", () => {
    renderNav();

    const connected = screen.getByRole("button", { name: /Connected/i });
    const jobs = screen.getByRole("button", { name: /Downloads/i });

    expect(jobs).toBeInTheDocument();
    // Adjacency is the requirement, not decoration: both answer "what is the
    // server doing for me", so they sit together rather than at opposite ends
    // of the toolbar.
    expect(connected.compareDocumentPosition(jobs) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(jobs.compareDocumentPosition(connected) &
      Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
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
