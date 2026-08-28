import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import App from "../../src/components/App.jsx";
import AppProviders from "../../src/AppProviders.jsx";
import { mockResponse } from "../contextHarness.jsx";

vi.mock("socket.io-client", () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  return { default: vi.fn(() => mockSocket), io: vi.fn(() => mockSocket) };
});

vi.mock("../../src/components/Nav.jsx", () => ({
  default: () => <div data-testid="mock-nav">yt-diff</div>,
}));
vi.mock("../../src/components/PlayList.jsx", () => ({
  default: ({ onMobileLoad }) => (
    <div data-testid="mock-playlist">
      Playlists
      <button onClick={() => onMobileLoad("https://yt/list?list=PL1", "One")}>
        open PL1
      </button>
    </div>
  ),
}));
vi.mock("../../src/components/SubList.jsx", () => ({
  default: ({ loadedPlayList, onBack }) => (
    <div data-testid="mock-sublist">
      {`loaded:${loadedPlayList}`}
      <button onClick={onBack}>back arrow</button>
    </div>
  ),
}));
vi.mock("../../src/components/Login.jsx", () => ({
  default: () => <div data-testid="mock-login">Sign in</div>,
}));
vi.mock("../../src/components/Signup.jsx", () => ({
  default: () => <div data-testid="mock-signup">Sign Up</div>,
}));

const click = async (name) => {
  await act(async () => {
    screen.getByText(name).click();
  });
};

const videosPanel = () => document.querySelector(".mobile-panel-videos");

const renderApp = async () => {
  localStorage.setItem("ytdiff_token", "stored_mock_token");
  globalThis.fetch.mockResolvedValue(
    mockResponse({ queue: [], generation: "gen_1", count: 0, rows: [] }),
  );
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
  await waitFor(() => {
    expect(screen.getByText("yt-diff")).toBeInTheDocument();
  });
};

describe("App — routing (Mobile)", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("opening a playlist slides the videos panel in", async () => {
    await renderApp();
    expect(videosPanel()).toBeNull();

    await click("open PL1");

    await waitFor(() => expect(videosPanel()).not.toBeNull());
    expect(videosPanel().className).toContain("slide-in");
  });

  test("the browser's Back gesture slides back instead of leaving the app", async () => {
    // This is the finding F5 names: on a phone Back is the primary gesture,
    // and it used to exit the app from the middle of a playlist.
    await renderApp();
    await click("open PL1");
    await waitFor(() => expect(videosPanel()).not.toBeNull());

    // jsdom runs a history traversal as a task, so the assertion has to wait
    // for it rather than read the location on the next line.
    await act(async () => {
      globalThis.history.back();
    });

    await waitFor(() => expect(videosPanel().className).toContain("slide-out"));
    // The panel stays mounted for the length of its animation, then goes.
    await waitFor(() => expect(videosPanel()).toBeNull(), { timeout: 2000 });
  });

  test("the in-app arrow and Back end in the same place", async () => {
    await renderApp();
    await click("open PL1");
    await waitFor(() => expect(videosPanel()).not.toBeNull());

    await click("back arrow");

    expect(videosPanel().className).toContain("slide-out");
    await waitFor(() => expect(videosPanel()).toBeNull(), { timeout: 2000 });
    expect(globalThis.location.hash).toBe("#/");
  });
});
