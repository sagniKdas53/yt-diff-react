import { act, waitFor } from "@testing-library/react";
import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { renderHook } from "@testing-library/react";
import {
  POLL_CLOSED_MS,
  POLL_OPEN_MS,
  useJobQueue,
} from "../../src/hooks/useJobQueue.js";
import { mockResponse, makeContexts } from "../contextHarness.jsx";
import { ContextHarness } from "../contextHarness.jsx";

/** Counts reads of the queue, so a test can assert on cadence rather than DOM. */
function queueReads() {
  const calls = [];
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/queuestatus")) {
      calls.push(Date.now());
      return mockResponse({
        status: "success",
        generation: 1,
        queue: [],
        listings: [],
      });
    }
    return mockResponse({});
  });
  globalThis.fetch = fetchMock;
  return { calls, fetchMock };
}

describe("useJobQueue", () => {
  let contexts;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    contexts = makeContexts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // renderHook's `wrapper` takes an element, so the context providers are
  // built here rather than through renderWithContexts, which renders itself.
  const mount = (initialProps) =>
    renderHook(({ options }) => useJobQueue(options), {
      initialProps: { options: initialProps },
      wrapper: ({ children }) => (
        <ContextHarness contexts={contexts}>{children}</ContextHarness>
      ),
    });

  test("reads the queue once on mount when there is a session", async () => {
    const { calls } = queueReads();
    mount({ enabled: true, open: false });

    await waitFor(() => expect(calls).toHaveLength(1));
  });

  test("sends a body the endpoint's validator will accept", async () => {
    // `/queuestatus` rejects a request with no body at all, and "Empty
    // Request Body" renders as an empty queue — which is indistinguishable
    // from the server having nothing to do.
    const { fetchMock } = queueReads();
    mount({ enabled: true, open: false });
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(0));

    const [url, init] = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/queuestatus")
    );
    expect(String(url)).toContain("/queuestatus");
    expect(init?.body).toBe("{}");
  });

  test("never reads without a session", async () => {
    const { calls } = queueReads();
    mount({ enabled: false, open: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_OPEN_MS * 3);
    });
    expect(calls).toHaveLength(0);
  });

  test("polls slowly while closed and quickly once open", async () => {
    const { calls } = queueReads();
    const { rerender } = mount({ enabled: true, open: false });
    await waitFor(() => expect(calls).toHaveLength(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_CLOSED_MS * 3);
    });
    // 3 closed intervals have gone by, so three more reads are due — but not
    // the thirty a 2s cadence would have spent on the same span.
    expect(calls).toHaveLength(4);

    // renderHook's rerender takes new props, so the hook is read through them
    // rather than closed over a local options object.
    rerender({ options: { enabled: true, open: true } });
    const before = calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_OPEN_MS * 2);
    });
    expect(calls.length - before).toBeGreaterThanOrEqual(2);
  });

  test("does not poll a hidden tab", async () => {
    const { calls } = queueReads();
    mount({ enabled: true, open: true });
    await waitFor(() => expect(calls).toHaveLength(1));

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(POLL_OPEN_MS * 4);
    });

    expect(calls).toHaveLength(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  test("does not stack reads when one is slower than the interval", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let reads = 0;
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes("/queuestatus")) {
        reads += 1;
        await gate;
        return mockResponse({
          status: "success",
          generation: 1,
          queue: [],
          listings: [],
        });
      }
      return mockResponse({});
    });

    mount({ enabled: true, open: true });
    await waitFor(() => expect(reads).toBe(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_OPEN_MS * 5);
    });
    // Five intervals elapsed while the first read was still open. Firing each
    // one would have five responses racing to set state out of order.
    expect(reads).toBe(1);

    await act(async () => {
      release();
      await gate;
    });
  });

  test("reads straight back after an action", async () => {
    const { calls, fetchMock } = queueReads();
    const { result } = mount({ enabled: true, open: false });
    await waitFor(() => expect(calls).toHaveLength(1));

    await act(async () => {
      await result.current.act("job_1", "pause");
    });

    const action = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/jobaction")
    );
    expect(JSON.parse(action[1].body)).toEqual({ id: "job_1", action: "pause" });
    // The read-back is what makes a pause that turned into something else
    // show as what it is rather than as what the click asked for.
    expect(calls.length).toBeGreaterThan(1);
  });

  test("surfaces a failed read rather than showing an empty queue", async () => {
    globalThis.fetch = vi.fn(async () =>
      mockResponse({ message: "queue unavailable" }, { ok: false, status: 503 })
    );
    const { result } = mount({ enabled: true, open: false });

    await waitFor(() =>
      expect(result.current.error).toBe("queue unavailable")
    );
  });

  test("keeps the last good queue when a later read fails", async () => {
    let fail = false;
    globalThis.fetch = vi.fn(async (url) => {
      if (!String(url).includes("/queuestatus")) return mockResponse({});
      if (fail) {
        return mockResponse({ message: "gone" }, { ok: false, status: 503 });
      }
      return mockResponse({
        status: "success",
        generation: 1,
        queue: [
          {
            id: "dl_1",
            url: "https://example.test/v",
            title: "Still here",
            state: "running",
            queuePosition: 0,
          },
        ],
        listings: [],
      });
    });
    const { result } = mount({ enabled: true, open: false });
    await waitFor(() => expect(result.current.jobs.downloads).toHaveLength(1));

    fail = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_CLOSED_MS + 50);
    });

    await waitFor(() => expect(result.current.error).toBe("gone"));
    // Wiping the list on a transient failure would make a hiccup look like the
    // queue emptying.
    expect(result.current.jobs.downloads).toHaveLength(1);
  });

  test("reads back after an action even when a poll is already open", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let reads = 0;
    globalThis.fetch = vi.fn(async (url) => {
      if (!String(url).includes("/queuestatus")) return mockResponse({});
      reads += 1;
      // The poll that was already open answers with the queue as it was
      // before the pause; only a second read can report it as paused.
      if (reads === 1) await gate;
      const paused = reads > 1;
      return mockResponse({
        status: "success",
        generation: reads,
        queue: [
          {
            id: "dl_1",
            url: "https://example.test/v",
            title: "Paused by click",
            state: paused ? "paused" : "running",
            queuePosition: 0,
          },
        ],
        listings: [],
      });
    });
    const { result } = mount({ enabled: true, open: false });
    await waitFor(() => expect(reads).toBe(1));

    // The action's read-back lands while the poll is still open, so it is
    // owed rather than dropped: dropping it leaves the row reading "Running"
    // until the next tick, up to 10 s away and only while the drawer is open.
    await act(async () => {
      await result.current.act("dl_1", "pause");
      expect(reads).toBe(1);
    });

    await act(async () => {
      release();
      await gate;
    });

    // Bounded rather than the default 5 s: with the read dropped this is a
    // missing fetch, and it should say so quickly instead of timing out.
    await waitFor(() => expect(reads).toBe(2), { timeout: 1000 });
    // The read that arrives last is the one held, which is the whole point:
    // the stale poll's answer must not be what the drawer renders.
    await waitFor(
      () => expect(result.current.jobs.downloads[0].state).toBe("paused"),
      { timeout: 1000 }
    );
  });
});