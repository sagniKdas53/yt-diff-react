import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import SubList from "../../src/components/SubList.jsx";
import {
  ContextHarness,
  makeContexts,
  mockResponse,
  renderWithContexts,
} from "../contextHarness.jsx";

// The real player pulls signed URLs and mounts a <video>; none of that is what
// these tests are about, which is whether the location decides that it opens.
vi.mock("../../src/components/VideoPlayer.jsx", () => ({
  default: ({ title, fileName, startAt, onStartAtChange }) => (
    <div data-testid="mock-player">
      {`playing:${title}:${fileName}`}
      <button
        type="button"
        data-testid="mock-player-seek"
        onClick={() => onStartAtChange && onStartAtChange(42)}
      >
        seek
      </button>
      <span data-testid="mock-player-start-at">{startAt ?? 0}</span>
    </div>
  ),
}));

const DOWNLOADED = "https://youtube.com/watch?v=1";
const NOT_DOWNLOADED = "https://youtube.com/watch?v=2";
const ABSENT = "https://youtube.com/watch?v=999";

const PLAYLIST = "https://youtube.com/playlist?list=best";

const response = {
  count: 2,
  saveDirectory: "/downloads/play_1",
  playlistTitle: "Best Songs Playlist",
  rows: [
    {
      id: "mapping_1",
      positionInPlaylist: 1,
      video_metadatum: {
        videoUrl: DOWNLOADED,
        title: "Video Song One",
        downloadStatus: true,
        fileName: "v1.mp4",
        saveDirectory: "/downloads/play_1",
      },
    },
    {
      id: "mapping_2",
      positionInPlaylist: 2,
      video_metadatum: {
        videoUrl: NOT_DOWNLOADED,
        title: "Video Song Two",
        downloadStatus: false,
        fileName: "v2.mp4",
        saveDirectory: "/downloads/play_1",
      },
    },
  ],
};

/**
 * The same first page, in a list long enough for page 1 to be a different page
 * from the one a link is followed on. `count` is the size of the whole list,
 * which is what the seek pages against — a two-row list would clamp the seek
 * back to the page it started on, and the link would never arrive.
 */
const longList = { ...response, count: 20 };

/** That list's second page, with the video the link named on it. */
const longListPageOne = {
  ...longList,
  rows: [
    {
      id: "mapping_9",
      positionInPlaylist: 9,
      video_metadatum: {
        videoUrl: ABSENT,
        title: "Video Song Nine",
        downloadStatus: true,
        fileName: "v9.mp4",
        saveDirectory: "/downloads/play_1",
      },
    },
  ],
};

describe("SubList — the player follows the location", () => {
  let contexts;
  let setPlayerVideoUrl;
  let setPlayerStartAt;

  const propsFor = (playerVideoUrl, playerStartAt = 0) => ({
    setPlayListUrl: vi.fn(),
    loadedPlayList: PLAYLIST,
    subListIndex: 0,
    setSubListIndex: vi.fn(),
    downloadedItem: { url: null, title: null },
    reFetch: "init_refetch",
    setReFetch: vi.fn(),
    tableContainerHeight: "600px",
    rowsPerPage: 8,
    setRowsPerPage: vi.fn(),
    playerVideoUrl,
    setPlayerVideoUrl,
    playerStartAt,
    setPlayerStartAt,
  });

  /**
   * SubList with the paging state the app owns around it.
   *
   * `subListIndex` is what a `/locate` answer is fed through — the same seek
   * the socket's `seekSubListTo` uses — so a test that leaves it a `vi.fn()`
   * can never watch the list reach the page the answer named.
   */
  function SubListWithPaging(props) {
    const [subListIndex, setSubListIndex] = useState(0);
    return (
      <SubList
        {...props}
        subListIndex={subListIndex}
        setSubListIndex={setSubListIndex}
      />
    );
  }

  /** Routes each request to the endpoint it names, the way the app does. */
  const fetchRouting = (located) =>
    vi.fn((url, options) => {
      const path = String(url);
      const body = JSON.parse(options?.body ?? "{}");
      if (path.endsWith("/locate")) {
        return Promise.resolve(mockResponse(located));
      }
      // The window the answer asked for: the video is on the second page of a
      // twenty-row list at eight to a page.
      if (body.start >= 8) {
        return Promise.resolve(mockResponse(longListPageOne));
      }
      return Promise.resolve(mockResponse(longList));
    });

  const renderLinked = (playerVideoUrl) =>
    renderWithContexts(
      <SubListWithPaging {...propsFor(playerVideoUrl)} />,
      { contexts },
    );

  const renderAt = (playerVideoUrl, playerStartAt = 0) =>
    renderWithContexts(
      <SubList {...propsFor(playerVideoUrl, playerStartAt)} />,
      { contexts },
    );

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(response));
    setPlayerVideoUrl = vi.fn();
    setPlayerStartAt = vi.fn();
    contexts = makeContexts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a video named in the location opens the player on it", async () => {
    renderAt(DOWNLOADED);

    await waitFor(() =>
      expect(screen.getByTestId("mock-player")).toHaveTextContent(
        "playing:Video Song One:v1.mp4",
      ),
    );
  });

  test("the position in the location reaches the player", async () => {
    renderAt(DOWNLOADED, 133);

    await waitFor(() =>
      expect(screen.getByTestId("mock-player-start-at")).toHaveTextContent(
        "133",
      ),
    );
  });

  test("the player's position is handed back to the location", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    renderAt(DOWNLOADED);

    await waitFor(() => expect(screen.getByTestId("mock-player")).toBeTruthy());
    await userEvent.click(screen.getByTestId("mock-player-seek"));

    expect(setPlayerStartAt).toHaveBeenCalledWith(42);
  });

  test("no video in the location means no player", async () => {
    renderAt(null);

    await waitFor(() =>
      expect(screen.getByText("Video Song One")).toBeTruthy(),
    );
    expect(screen.queryByTestId("mock-player")).toBeNull();
  });

  test("a video on another page of this list is found and opened", async () => {
    // The failure this fixes: the link named a real video on page 1, the list
    // was showing page 0, and the parameter was dropped as though the video
    // did not exist.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: PLAYLIST,
      page: 1,
    });
    renderLinked(ABSENT);

    await waitFor(() =>
      expect(screen.getByTestId("mock-player")).toHaveTextContent(
        "playing:Video Song Nine:v9.mp4",
      ),
    );
    expect(setPlayerVideoUrl).not.toHaveBeenCalledWith(null, {
      replace: true,
    });
  });

  test("the page is asked for at the size this list pages by", async () => {
    // The page number means nothing without the window it was counted in: at
    // the wrong size it lands on a different page of the same list.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: PLAYLIST,
      page: 1,
    });
    renderLinked(ABSENT);

    await waitFor(() => expect(screen.getByTestId("mock-player")).toBeTruthy());
    const [, options] = globalThis.fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/locate"),
    );
    expect(JSON.parse(options.body)).toEqual({
      videoUrl: ABSENT,
      pageSize: 8,
      sortDownloaded: false,
    });
  });

  test("a video /locate cannot place has its parameter dropped", async () => {
    // It belongs to no list, so no page of this one holds it. Dropping is
    // better than leaving the address bar naming a video nothing will open —
    // but only after the rows have arrived: no rows yet is not yet an answer.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: null,
      page: null,
    });
    renderAt(ABSENT);

    await waitFor(() =>
      expect(setPlayerVideoUrl).toHaveBeenCalledWith(null, { replace: true }),
    );
    expect(screen.queryByTestId("mock-player")).toBeNull();
  });

  test("a video in another list has its parameter dropped", async () => {
    // The location names the list this app is showing; switching lists would
    // drop the very parameter being opened.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: `${PLAYLIST}2`,
      page: 1,
    });
    renderAt(ABSENT);

    await waitFor(() =>
      expect(setPlayerVideoUrl).toHaveBeenCalledWith(null, { replace: true }),
    );
  });

  test("an answer naming the page already showing drops the link", async () => {
    // Rows the answer contradicts — a search filter narrowing the list, or a
    // `/getsub` that failed and rendered its error row. Paging there would
    // fetch the same rows again and never finish.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: PLAYLIST,
      page: 0,
    });
    renderAt(ABSENT);

    await waitFor(() =>
      expect(setPlayerVideoUrl).toHaveBeenCalledWith(null, { replace: true }),
    );
    expect(
      globalThis.fetch.mock.calls.filter(([url]) =>
        String(url).endsWith("/locate"),
      ),
    ).toHaveLength(1);
  });

  test("a link is asked about once, not once per pass", async () => {
    // Asking again would page the list to the page it is already on and keep
    // asking: the answer, not the rows, is what stops it.
    globalThis.fetch = fetchRouting({
      videoUrl: ABSENT,
      playlistUrl: PLAYLIST,
      page: 1,
    });
    renderLinked(ABSENT);

    await waitFor(() =>
      expect(screen.getByTestId("mock-player")).toBeTruthy(),
    );
    const locateCalls = globalThis.fetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/locate"),
    );
    expect(locateCalls).toHaveLength(1);
  });

  test("a link to a video that was never downloaded drops it too", async () => {
    renderAt(NOT_DOWNLOADED);

    await waitFor(() =>
      expect(setPlayerVideoUrl).toHaveBeenCalledWith(null, { replace: true }),
    );
    expect(screen.queryByTestId("mock-player")).toBeNull();
  });

  test("the location going empty closes the player", async () => {
    // This is Back: the entry the player was opened with is popped, the
    // parameter goes with it, and the player closes instead of the app exiting.
    const { rerender } = renderAt(DOWNLOADED);
    await waitFor(() => expect(screen.getByTestId("mock-player")).toBeTruthy());

    // Re-rendered inside the same harness, so this is one component seeing the
    // parameter disappear rather than a fresh mount without it.
    rerender(
      <ContextHarness contexts={contexts}>
        <SubList {...propsFor(null)} />
      </ContextHarness>,
    );

    await waitFor(() => expect(screen.queryByTestId("mock-player")).toBeNull());
  });
});
