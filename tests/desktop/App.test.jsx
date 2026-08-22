import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import App from "../../src/components/App.jsx";
import AppProviders from "../../src/AppProviders.jsx";
import { mockResponse } from "../contextHarness.jsx";

// Mock socket.io-client
vi.mock("socket.io-client", () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    // The provider tears the connection down on token change and unmount.
    disconnect: vi.fn(),
  };
  return {
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket),
  };
});

// Mock lazy-loaded subcomponents eagerly for fast & deterministic testing
vi.mock("../../src/components/Nav.jsx", () => ({
  default: (props) => <div data-testid="mock-nav">yt-diff</div>
}));
vi.mock("../../src/components/PlayList.jsx", () => ({
  default: (props) => <div data-testid="mock-playlist">Playlists</div>
}));
vi.mock("../../src/components/SubList.jsx", () => ({
  default: (props) => <div data-testid="mock-sublist">SubList</div>
}));
vi.mock("../../src/components/Login.jsx", () => ({
  default: (props) => <div data-testid="mock-login"><h1>Sign in</h1></div>
}));
vi.mock("../../src/components/Signup.jsx", () => ({
  default: (props) => <div data-testid="mock-signup">Sign Up</div>
}));

describe("App Component (Desktop)", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders Login screen if no token is stored", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ registrationAllowed: true }),
    );

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    // Renders the Login panel title
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  test("renders Main dashboard if token is stored", async () => {
    localStorage.setItem("ytdiff_token", "stored_mock_token");
    
    // Mount fetch checks
    globalThis.fetch
      // syncQueueFromBackend
      .mockResolvedValueOnce(mockResponse({ queue: [], generation: "gen_1" }))
      // fetchPlaylists in PlayList.jsx
      .mockResolvedValueOnce(mockResponse({ count: 0, rows: [] }));

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    // Renders the Navigation app header title
    await waitFor(() => {
      expect(screen.getByText("yt-diff")).toBeInTheDocument();
    });
  });
});
