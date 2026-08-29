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
  default: ({
    playListUrl,
    setPlayListUrl,
    initialPage,
    initialRowsPerPage,
    playListIndex,
    onPaginationChange,
  }) => (
    <div data-testid="mock-playlist">
      {`current:${playListUrl}`}
      <span data-testid="pl-seed">
        {`page:${initialPage} size:${initialRowsPerPage} index:${playListIndex}`}
      </span>
      <button onClick={() => setPlayListUrl("https://yt/list?list=PL1")}>
        open PL1
      </button>
      <button onClick={() => setPlayListUrl("https://yt/list?list=PL2")}>
        open PL2
      </button>
      <button onClick={() => onPaginationChange(25, 10)}>
        playlists page 26
      </button>
    </div>
  ),
}));
vi.mock("../../src/components/SubList.jsx", () => ({
  default: ({
    loadedPlayList,
    initialPage,
    rowsPerPage,
    subListIndex,
    onPaginationChange,
  }) => (
    <div data-testid="mock-sublist">
      {`loaded:${loadedPlayList}`}
      <span data-testid="sub-seed">
        {`page:${initialPage} size:${rowsPerPage} index:${subListIndex}`}
      </span>
      <button onClick={() => onPaginationChange(3, 8)}>videos page 4</button>
    </div>
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
const playlistSeed = () => screen.getByTestId("pl-seed").textContent;
const videoSeed = () => screen.getByTestId("sub-seed").textContent;

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

  describe("pagination in the location", () => {
    test("a link to a playlist on page 26 opens the list on page 26", async () => {
      // The bug this covers: the right panel honoured the link and the left
      // panel stayed on page 1, so "resume" only half worked.
      globalThis.history.replaceState(
        null,
        "",
        "#/playlist/" +
          encodeURIComponent("https://yt/list?list=PL1") +
          "?pp=26",
      );
      await renderApp();

      // Seeded as a page for the first fetch, and as the index the existing
      // seek already understands: 25 * 10.
      expect(playlistSeed()).toBe("page:25 size:10 index:250");
    });

    test("a link carries the video page and page size too", async () => {
      globalThis.history.replaceState(null, "", "#/unlisted?vp=4&vs=32");
      await renderApp();

      expect(videoSeed()).toBe("page:3 size:32 index:96");
    });

    test("paging records where you are without stacking history", async () => {
      // Paging replaces rather than pushes: Back has to keep meaning "leave
      // this playlist", not "undo the last page turn".
      await renderApp();
      await click("open PL1");
      const afterOpen = globalThis.history.length;

      await click("videos page 4");

      expect(globalThis.location.hash).toContain("vp=4");
      expect(globalThis.history.length).toBe(afterOpen);
    });

    test("the playlist list keeps its page when a playlist is opened", async () => {
      // You picked that row from page 26; snapping the list back to page 1
      // would undo the navigation you just made.
      await renderApp();
      await click("playlists page 26");
      expect(globalThis.location.hash).toContain("pp=26");

      await click("open PL1");

      expect(globalThis.location.hash).toContain("pp=26");
      expect(current()).toContain("current:https://yt/list?list=PL1");
    });

    test("opening another playlist starts its videos at page 1", async () => {
      // A position in the previous playlist means nothing in this one.
      await renderApp();
      await click("open PL1");
      await click("videos page 4");
      expect(globalThis.location.hash).toContain("vp=4");

      await click("open PL2");

      expect(globalThis.location.hash).not.toContain("vp=");
    });
  });
});
