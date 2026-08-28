import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import App from "../../src/components/App.jsx";
import AppProviders from "../../src/AppProviders.jsx";
import { mockResponse } from "../contextHarness.jsx";

const { mockSocket } = vi.hoisted(() => ({
  mockSocket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock("socket.io-client", () => ({
  default: () => mockSocket,
  io: () => mockSocket,
}));

vi.mock("../../src/components/Nav.jsx", () => ({
  default: ({ setPlayListUrl }) => (
    <div data-testid="mock-nav">
      yt-diff
      <button onClick={() => setPlayListUrl("None")}>Unlisted</button>
    </div>
  ),
}));

// Surfaces the playlist it was handed, and offers a way to select one, so the
// tests can drive selection the way a click does.
vi.mock("../../src/components/PlayList.jsx", () => ({
  default: ({ playListUrl, setPlayListUrl }) => (
    <div data-testid="mock-playlist">
      {`current:${playListUrl}`}
      <button onClick={() => setPlayListUrl("https://yt/list?list=PL1")}>
        open PL1
      </button>
    </div>
  ),
}));
vi.mock("../../src/components/SubList.jsx", () => ({
  default: ({ loadedPlayList }) => (
    <div data-testid="mock-sublist">{`loaded:${loadedPlayList}`}</div>
  ),
}));
vi.mock("../../src/components/Login.jsx", () => ({
  default: () => <div data-testid="mock-login">Sign in</div>,
}));
vi.mock("../../src/components/Signup.jsx", () => ({
  default: () => <div data-testid="mock-signup">Sign Up</div>,
}));

const handlerFor = (event) => {
  const calls = mockSocket.on.mock.calls.filter(([name]) => name === event);
  if (calls.length === 0) throw new Error(`No handler registered for ${event}`);
  return calls[calls.length - 1][1];
};

const fire = async (event, payload) => {
  await act(async () => {
    handlerFor(event)(payload);
  });
};

const click = async (name) => {
  await act(async () => {
    screen.getByText(name).click();
  });
};

const current = () => screen.getByTestId("mock-playlist").textContent;

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

describe("App — routing (Desktop)", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("selecting a playlist puts it in the address bar", async () => {
    await renderApp();
    expect(current()).toContain("current:init");

    await click("open PL1");

    expect(current()).toContain("current:https://yt/list?list=PL1");
    expect(globalThis.location.hash).toBe(
      "#/playlist/" + encodeURIComponent("https://yt/list?list=PL1"),
    );
  });

  test("a link opens the playlist it names", async () => {
    // The whole point of F5: this is a bookmark, or a link someone was sent.
    globalThis.history.replaceState(
      null,
      "",
      "#/playlist/" + encodeURIComponent("https://yt/list?list=PLdeep"),
    );
    await renderApp();

    expect(current()).toContain("current:https://yt/list?list=PLdeep");
    expect(screen.getByTestId("mock-sublist").textContent).toContain(
      "loaded:https://yt/list?list=PLdeep",
    );
  });

  test("Back returns to the previous playlist", async () => {
    await renderApp();
    await click("open PL1");
    await click("Unlisted");
    expect(current()).toContain("current:None");

    // jsdom runs a history traversal as a task and dispatches `popstate` from
    // it, so the assertion waits rather than reading the next line.
    await act(async () => {
      globalThis.history.back();
    });

    await waitFor(() =>
      expect(current()).toContain("current:https://yt/list?list=PL1"),
    );
  });

  test("an auto-navigation leaves no entry to press Back through", async () => {
    // A listing finishing is not a place the user asked to be. It should move
    // the view without becoming a stop on the way back out.
    await renderApp();
    const before = globalThis.history.length;

    await fire("listing-playlist-complete", {
      url: "https://yt/list?list=PLauto",
      playlistTitle: "Auto",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });

    expect(current()).toContain("current:https://yt/list?list=PLauto");
    expect(globalThis.history.length).toBe(before);
  });
});
