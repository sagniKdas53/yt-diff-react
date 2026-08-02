import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../../src/components/App.jsx";

// Hoisted so the socket.io mock factory (which vitest lifts above imports) can
// close over the same object the tests inspect.
const { mockSocket } = vi.hoisted(() => ({
  mockSocket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock("socket.io-client", () => ({
  default: () => mockSocket,
  io: () => mockSocket,
}));

// Nav renders the notification log so assertions can read it from the DOM.
vi.mock("../../src/components/Nav.jsx", () => ({
  default: ({ notifications = [] }) => (
    <div data-testid="mock-nav">
      yt-diff
      <ul data-testid="notifications">
        {notifications.map((n) => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </div>
  ),
}));
// PlayList surfaces the currently loaded playlist so the tests can prove the
// batch never auto-navigates.
vi.mock("../../src/components/PlayList.jsx", () => ({
  default: ({ playListUrl }) => (
    <div data-testid="mock-playlist">{`current:${playListUrl}`}</div>
  ),
}));
vi.mock("../../src/components/SubList.jsx", () => ({
  default: () => <div data-testid="mock-sublist">SubList</div>,
}));
vi.mock("../../src/components/Login.jsx", () => ({
  default: () => (
    <div data-testid="mock-login">
      <h1>Sign in</h1>
    </div>
  ),
}));
vi.mock("../../src/components/Signup.jsx", () => ({
  default: () => <div data-testid="mock-signup">Sign Up</div>,
}));

/** Latest handler registered for an event via socket.on. */
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

const notificationTexts = () =>
  Array.from(screen.getByTestId("notifications").querySelectorAll("li")).map(
    (li) => li.textContent,
  );

const progressBar = () => screen.getByRole("progressbar");

const BATCH_ID = "batch-abc";

const renderApp = async () => {
  localStorage.setItem("ytdiff_token", "stored_mock_token");
  globalThis.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ queue: [], generation: "gen_1" }),
    text: async () => JSON.stringify({ count: 0, rows: [] }),
  });

  render(<App />);
  await waitFor(() => {
    expect(screen.getByText("yt-diff")).toBeInTheDocument();
  });
};

describe("App — batch re-index signalling (Desktop)", () => {
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

  test("registers the batch lifecycle listeners", async () => {
    await renderApp();

    const registered = mockSocket.on.mock.calls.map(([name]) => name);
    expect(registered).toContain("reindex-batch-started");
    expect(registered).toContain("reindex-batch-complete");
    expect(registered).toContain("reindex-batch-failed");
  });

  test("batch start notifies and switches the bar to determinate zero", async () => {
    await renderApp();

    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 4 });

    expect(notificationTexts()).toContain(
      "Batch re-index started — 4 playlist(s)",
    );
    expect(progressBar()).toHaveAttribute("aria-valuenow", "0");
  });

  test("each completed playlist advances the n/x counter and the bar", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 4 });

    await fire("listing-playlist-complete", {
      url: "url_1",
      playlistTitle: "Lofi Beats",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });
    expect(notificationTexts()).toContain("Lofi Beats re-indexed — 1/4");
    expect(progressBar()).toHaveAttribute("aria-valuenow", "25");

    await fire("listing-playlist-complete", {
      url: "url_2",
      playlistTitle: "Synthwave",
      processedChunks: 1,
      seekPlaylistListTo: 1,
    });
    expect(notificationTexts()).toContain("Synthwave re-indexed — 2/4");
    expect(progressBar()).toHaveAttribute("aria-valuenow", "50");
  });

  test("a failed playlist counts toward the batch total", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 2 });

    await fire("listing-error", { url: "url_bad", error: "No items found" });

    expect(notificationTexts()).toContain(
      "Failed re-indexing url_bad — 1/2",
    );
    expect(progressBar()).toHaveAttribute("aria-valuenow", "50");
  });

  test("does not auto-navigate to a playlist that finishes during a batch", async () => {
    await renderApp();
    // Nothing is loaded yet, which is exactly when the non-batch handler would
    // auto-load the finished playlist.
    expect(screen.getByTestId("mock-playlist")).toHaveTextContent(
      "current:init",
    );

    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 2 });
    await fire("listing-playlist-complete", {
      url: "url_1",
      playlistTitle: "Lofi Beats",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });

    expect(screen.getByTestId("mock-playlist")).toHaveTextContent(
      "current:init",
    );
  });

  test("outside a batch a completed playlist still auto-loads", async () => {
    await renderApp();

    await fire("listing-playlist-complete", {
      url: "url_1",
      playlistTitle: "Lofi Beats",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });

    expect(screen.getByTestId("mock-playlist")).toHaveTextContent(
      "current:url_1",
    );
  });

  test("batch completion reports the tally and clears batch state", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 200 });

    await fire("reindex-batch-complete", {
      batchId: BATCH_ID,
      total: 200,
      completed: 198,
      failed: 2,
      durationMs: 1000,
    });

    expect(notificationTexts()).toContain(
      "Batch re-index complete — 198/200 (2 failed)",
    );
    // Batch cleared: a later playlist completion behaves normally again.
    await fire("listing-playlist-complete", {
      url: "url_9",
      playlistTitle: "After Batch",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });
    expect(screen.getByTestId("mock-playlist")).toHaveTextContent(
      "current:url_9",
    );
  });

  test("batch failure surfaces the error and clears batch state", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 5 });

    await fire("reindex-batch-failed", {
      batchId: BATCH_ID,
      total: 5,
      error: "database exploded",
    });

    expect(notificationTexts()).toContain(
      "Batch re-index failed: database exploded",
    );
    // Batch cleared: a later playlist completion takes the normal path again.
    await fire("listing-playlist-complete", {
      url: "url_9",
      playlistTitle: "After Failure",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });
    expect(notificationTexts()).toContain(
      "Successfully imported playlist: After Failure",
    );
  });

  test("ignores lifecycle events from a different batch", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 3 });

    await fire("reindex-batch-complete", {
      batchId: "some-other-batch",
      total: 9,
      completed: 9,
      failed: 0,
    });

    expect(notificationTexts()).not.toContain(
      "Batch re-index complete — 9/9",
    );
    // Still tracking the original batch.
    await fire("listing-playlist-complete", {
      url: "url_1",
      playlistTitle: "Lofi Beats",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });
    expect(notificationTexts()).toContain("Lofi Beats re-indexed — 1/3");
  });

  test("a backend restart clears a batch left in flight", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 10 });
    expect(progressBar()).toHaveAttribute("aria-valuenow", "0");

    // Different generation => backend restarted, so the batch is gone.
    await fire("init", { id: "sock_2", generation: "gen_2" });

    await fire("listing-playlist-complete", {
      url: "url_1",
      playlistTitle: "Lofi Beats",
      processedChunks: 1,
      seekPlaylistListTo: 0,
    });
    expect(notificationTexts()).toContain(
      "Successfully imported playlist: Lofi Beats",
    );
  });

  test("an x.com entry reclassified as a single item still counts and does not navigate", async () => {
    await renderApp();
    await fire("reindex-batch-started", { batchId: BATCH_ID, queued: 2 });

    await fire("listing-single-item-complete", {
      url: "https://x.com/someone/status/1",
      title: "A Post",
      itemLabel: "A Post",
      seekSubListTo: 3,
    });

    expect(notificationTexts()).toContain("A Post re-indexed — 1/2");
    expect(screen.getByTestId("mock-playlist")).toHaveTextContent(
      "current:init",
    );
  });
});
