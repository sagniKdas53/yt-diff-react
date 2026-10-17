import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import JobDrawer from "../../src/components/JobDrawer.jsx";
import { mockResponse, renderWithContexts, makeContexts } from "../contextHarness.jsx";

/**
 * A queue shaped like the one `/queuestatus` answers with.
 *
 * One of every state the drawer has to tell apart, so a single render covers
 * what each control set should be.
 */
const QUEUE = {
  status: "success",
  generation: 3,
  queue: [
    {
      id: "dl_running",
      kind: "download",
      url: "https://www.youtube.com/watch?v=running",
      title: "Running video",
      state: "running",
      queuePosition: 0,
      startedAt: 1,
      progress: {
        downloadedBytes: 25_000_000,
        totalBytes: 100_000_000,
        bytesPerSecond: 5_000_000,
        etaSeconds: 15,
      },
    },
    {
      id: "dl_queued",
      kind: "download",
      url: "https://www.youtube.com/watch?v=queued",
      title: "Queued video",
      state: "queued",
      queuePosition: 2,
      startedAt: 2,
      progress: null,
    },
    {
      id: "dl_paused",
      kind: "download",
      url: "https://www.youtube.com/watch?v=paused",
      title: "Paused video",
      state: "paused",
      queuePosition: 0,
      startedAt: 3,
      progress: null,
    },
    {
      id: "dl_unknown_total",
      kind: "download",
      url: "https://www.youtube.com/watch?v=stream",
      title: "Streamed video",
      state: "running",
      queuePosition: 0,
      startedAt: 4,
      progress: {
        downloadedBytes: 4_000_000,
        totalBytes: null,
        bytesPerSecond: null,
        etaSeconds: null,
      },
    },
  ],
  listings: [
    {
      id: "ls_running",
      kind: "listing",
      url: "https://www.youtube.com/playlist?list=PL1",
      title: "A long playlist",
      state: "running",
      queuePosition: 0,
      startedAt: 5,
      itemsIndexed: 412,
    },
  ],
};

function emptyQueue() {
  return {
    status: "success",
    generation: 3,
    queue: [],
    listings: [],
  };
}

describe("JobDrawer", () => {
  let fetchMock;
  let contexts;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn(async (url) => {
      if (String(url).includes("/queuestatus")) {
        return mockResponse(QUEUE);
      }
      if (String(url).includes("/jobaction")) {
        return mockResponse({
          status: "success",
          id: "dl_running",
          action: "pause",
          outcome: "paused",
          partialDeleted: false,
        });
      }
      return mockResponse({});
    });
    globalThis.fetch = fetchMock;
    contexts = makeContexts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDrawer = () =>
    renderWithContexts(<JobDrawer enabled badgeColor="secondary" />, {
      contexts,
    });

  const openDrawer = async () => {
    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: /Downloads/i }));
    return screen.findByText("Running video");
  };

  test("renders no button without a session to poll with", () => {
    renderWithContexts(<JobDrawer enabled={false} />, { contexts });

    expect(
      screen.queryByRole("button", { name: /Downloads/i }),
    ).not.toBeInTheDocument();
  });

  test("badges the number of running and queued jobs", async () => {
    renderDrawer();

    await waitFor(() =>
      expect(screen.getByText("5")).toBeInTheDocument(),
    );
  });

  test("lists downloads and listings with running work first", async () => {
    await openDrawer();

    const headings = screen
      .getAllByText(/^(Listings|Videos)$/)
      .map((node) => node.textContent);
    expect(headings).toEqual(["Listings", "Videos"]);
    expect(screen.getByText("A long playlist")).toBeInTheDocument();
    expect(screen.getByText("Running video")).toBeInTheDocument();
  });

  test("shows a real progress bar for a download with a known total", async () => {
    await openDrawer();

    const bar = await screen.findByRole("progressbar", {
      name: "Running video progress",
    });
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(
      screen.getByText("Running · 25.0 MB of 100.0 MB · 5.0 MB/s · 15s left"),
    ).toBeInTheDocument();
  });

  test("falls back to an indeterminate bar when the total is unknown", async () => {
    await openDrawer();

    const bar = await screen.findByRole("progressbar", {
      name: "Streamed video progress",
    });
    // No aria-valuenow is what MUI omits for an indeterminate bar, and it is
    // the difference between "25%" and "some of an unknown amount".
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText("Running · 4.0 MB")).toBeInTheDocument();
  });

  test("shows an indeterminate bar for a running listing", async () => {
    await openDrawer();

    const bar = await screen.findByRole("progressbar", {
      name: "A long playlist progress",
    });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText("Running · 412 items indexed")).toBeInTheDocument();
  });

  test("offers only cancel for a queued job, and says it is free", async () => {
    await openDrawer();

    const row = (await screen.findByText("Queued video")).closest("[data-job]");
    const controls = within(row);
    expect(controls.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(controls.queryByRole("button", { name: /Pause/i })).toBeNull();
    expect(
      controls.getByText(/cancelling this one costs nothing/i),
    ).toBeInTheDocument();
    expect(controls.getByText("Queued · position 2")).toBeInTheDocument();
  });

  test("offers pause and cancel for a running job", async () => {
    await openDrawer();

    const row = (await screen.findByText("Running video")).closest("[data-job]");
    const controls = within(row);
    expect(controls.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    expect(controls.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(controls.queryByRole("button", { name: /Resume/i })).toBeNull();
  });

  test("offers resume and cancel for a paused job, and says the file is kept", async () => {
    await openDrawer();

    const row = (await screen.findByText("Paused video")).closest("[data-job]");
    const controls = within(row);
    expect(
      controls.getByRole("button", { name: /Resume/i }),
    ).toBeInTheDocument();
    expect(controls.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(controls.queryByRole("button", { name: /Pause/i })).toBeNull();
    expect(controls.getByText("Kept on disk")).toBeInTheDocument();
    // Paused is stopped, so it must not be drawn as work in flight.
    expect(
      controls.queryByRole("progressbar", { name: "Paused video progress" }),
    ).toBeNull();
  });

  test("posts the action and reads the queue back", async () => {
    await openDrawer();

    const row = (await screen.findByText("Running video")).closest("[data-job]");
    fireEvent.click(within(row).getByRole("button", { name: /Pause/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/jobaction"),
      );
      expect(call).toBeDefined();
      expect(JSON.parse(call[1].body)).toEqual({
        id: "dl_running",
        action: "pause",
      });
    });
    // The re-read is what makes a pause that became something else show as
    // what it is, rather than as what the click asked for.
    const reads = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/queuestatus"),
    );
    expect(reads.length).toBeGreaterThan(1);
  });

  test("says so when the job action is refused, instead of swallowing it", async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes("/jobaction")) {
        return mockResponse(
          { message: "That job is already paused" },
          { ok: false, status: 400 },
        );
      }
      return String(url).includes("/queuestatus")
        ? mockResponse(QUEUE)
        : mockResponse({});
    });

    await openDrawer();

    const row = (await screen.findByText("Running video")).closest("[data-job]");
    fireEvent.click(within(row).getByRole("button", { name: /Pause/i }));

    // The server's own refusal, so the user learns which action failed on
    // which job rather than that something somewhere failed.
    await waitFor(() => {
      expect(contexts.notification.setSnack).toHaveBeenCalledWith(
        expect.stringContaining("already paused"),
        "error",
      );
    });
    expect(contexts.notification.setSnack).toHaveBeenCalledWith(
      expect.stringContaining("pause dl_running"),
      "error",
    );
    // A refused action must not leave the row spinning forever.
    await waitFor(() =>
      expect(within(row).getByRole("button", { name: /Pause/i })).toBeEnabled(),
    );
  });

  test("shows an empty queue plainly", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).includes("/queuestatus") ? mockResponse(emptyQueue()) : mockResponse({})
    );

    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: /Downloads/i }));

    expect(
      await screen.findByText("Nothing running or queued."),
    ).toBeInTheDocument();
  });

  test("reports a failed read instead of pretending the queue is empty", async () => {
    fetchMock.mockImplementation(async () =>
      mockResponse({ message: "queue unavailable" }, { ok: false, status: 503 }),
    );

    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: /Downloads/i }));

    expect(await screen.findByText(/queue unavailable/i)).toBeInTheDocument();
  });

  test("orders a queue whose states and positions the drawer does not know", async () => {
    // A server that grows a state, or a job that arrives without a position,
    // must not make the order depend on which order the jobs happened to be
    // sent in. So the input below is deliberately not the answer: the unknown
    // state is first and the known running job is third.
    fetchMock.mockImplementation(async (url) =>
      String(url).includes("/queuestatus")
        ? mockResponse({
            status: "success",
            generation: 9,
            queue: [
              {
                id: "dl_mystery",
                kind: "download",
                url: "https://www.youtube.com/watch?v=mystery",
                title: "Mystery video",
                state: "stalled",
                queuePosition: 0,
                startedAt: 1,
                progress: null,
              },
              {
                id: "dl_unpositioned",
                kind: "download",
                url: "https://www.youtube.com/watch?v=unpositioned",
                title: "Unpositioned video",
                state: "queued",
                startedAt: 2,
                progress: null,
              },
              {
                id: "dl_busy",
                kind: "download",
                url: "https://www.youtube.com/watch?v=busy",
                title: "Busy video",
                state: "running",
                queuePosition: 1,
                startedAt: 3,
                progress: null,
              },
              {
                id: "dl_held",
                kind: "download",
                url: "https://www.youtube.com/watch?v=held",
                title: "Held video",
                state: "paused",
                queuePosition: 0,
                startedAt: 4,
                progress: null,
              },
            ],
            listings: [],
          })
        : mockResponse({})
    );

    renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: /Downloads/i }));
    await screen.findByText("Busy video");

    // Running first; the queued job with no position stands in for position 0
    // and so leads the queue; paused next; the state the drawer does not know
    // sorts after every state it does.
    const rendered = screen
      .getAllByText(/(Mystery|Unpositioned|Busy|Held) video/)
      .map((node) => node.textContent);
    expect(rendered).toEqual([
      "Busy video",
      "Unpositioned video",
      "Held video",
      "Mystery video",
    ]);
  });
});