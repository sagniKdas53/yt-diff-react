import { screen, waitFor } from "@testing-library/react";
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
  default: ({ title, fileName }) => (
    <div data-testid="mock-player">{`playing:${title}:${fileName}`}</div>
  ),
}));

const DOWNLOADED = "https://youtube.com/watch?v=1";
const NOT_DOWNLOADED = "https://youtube.com/watch?v=2";
const ABSENT = "https://youtube.com/watch?v=999";

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

describe("SubList — the player follows the location", () => {
  let contexts;
  let setPlayerVideoUrl;

  const propsFor = (playerVideoUrl) => ({
    setPlayListUrl: vi.fn(),
    loadedPlayList: "https://youtube.com/playlist?list=best",
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
  });

  const renderAt = (playerVideoUrl) =>
    renderWithContexts(<SubList {...propsFor(playerVideoUrl)} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(response));
    setPlayerVideoUrl = vi.fn();
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

  test("no video in the location means no player", async () => {
    renderAt(null);

    await waitFor(() =>
      expect(screen.getByText("Video Song One")).toBeTruthy(),
    );
    expect(screen.queryByTestId("mock-player")).toBeNull();
  });

  test("a link to a video that is not on the page drops the parameter", async () => {
    // Rather than leave the address bar naming something the app is not
    // showing. It waits for rows first: no rows yet is not yet an answer.
    renderAt(ABSENT);

    await waitFor(() =>
      expect(setPlayerVideoUrl).toHaveBeenCalledWith(null, { replace: true }),
    );
    expect(screen.queryByTestId("mock-player")).toBeNull();
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
