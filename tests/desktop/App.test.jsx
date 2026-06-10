import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import App from "../../src/components/App.jsx";

// Mock socket.io-client
vi.mock("socket.io-client", () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  return {
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket),
  };
});

describe("App Component (Desktop)", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders Login screen if no token is stored", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    render(<App />);

    // Renders the Login panel title
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  test("renders Main dashboard if token is stored", async () => {
    localStorage.setItem("ytdiff_token", "stored_mock_token");
    
    // Mount fetch checks
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ queue: [], generation: "gen_1" }), // syncQueueFromBackend
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, rows: [] }), // fetchPlaylists in PlayList.jsx
      });

    render(<App />);

    // Renders the Navigation app header title
    await waitFor(() => {
      expect(screen.getByText("yt-diff")).toBeInTheDocument();
    });
  });
});
