import React from "react";
import { render, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

import { useSocketEvents } from "../../src/hooks/useSocketEvents.js";

/**
 * The `download-done` frame is what tells a row it was only partly fetched, so
 * the fields that say so have to survive the trip onto `downloadedItem` — the
 * ref `SubList` patches its row from. Dropping them there is what would leave
 * the row claiming a download was complete when its subtitles never arrived.
 */

/** A socket stub that records handlers so a test can emit into them. */
function makeSocket() {
  const handlers = new Map();
  return {
    on: vi.fn((event, handler) => handlers.set(event, handler)),
    off: vi.fn((event) => handlers.delete(event)),
    emitTo: (event, payload) => handlers.get(event)?.(payload),
  };
}

let latest;
let socket;

function Harness(overrides = {}) {
  latest = useSocketEvents({
    socket,
    setConnectionId: vi.fn(),
    logout: vi.fn(),
    setSnack: vi.fn(),
    addNotification: vi.fn(),
    updateActiveDownloads: vi.fn(),
    removeActiveDownload: vi.fn(),
    removeFromQueueAndRenumber: vi.fn(),
    clearDownloadState: vi.fn(),
    setQueuePosition: vi.fn(),
    syncQueueFromBackend: vi.fn().mockResolvedValue(null),
    playListUrlRef: { current: "init" },
    setPlayListUrl: vi.fn(),
    setPlayListIndex: vi.fn(),
    setSubListIndex: vi.fn(),
    setReFetchPlaylist: vi.fn(),
    setReFetchSubList: vi.fn(),
    toggleProgressCallBackRef: { current: vi.fn() },
    disableProgressRef: { current: false },
    isMobileRef: { current: false },
    onMobileSlideNeeded: vi.fn(),
    ...overrides,
  });
  return null;
}

beforeEach(() => {
  latest = undefined;
  socket = makeSocket();
});

describe("useSocketEvents (Desktop)", () => {
  test("carries the partial verdict onto the published download", () => {
    render(<Harness />);

    act(() => {
      socket.emitTo("download-done", {
        url: "https://e.com/1",
        title: "Partial Video",
        fileName: "1.mp4",
        saveDirectory: "/downloads",
        partial: true,
        missingExtras: ["subtitles", "thumbnail"],
        reason: "rate-limited",
      });
    });

    expect(latest.downloadedItem.current).toMatchObject({
      url: "https://e.com/1",
      title: "Partial Video",
      partial: true,
      missingExtras: ["subtitles", "thumbnail"],
      reason: "rate-limited",
    });
  });

  test("reports a complete download as not partial", () => {
    render(<Harness />);

    act(() => {
      socket.emitTo("download-done", {
        url: "https://e.com/2",
        title: "Whole Video",
        partial: false,
        missingExtras: null,
        reason: null,
      });
    });

    const item = latest.downloadedItem.current;
    expect(item.partial).toBe(false);
    expect(item.missingExtras).toBeNull();
    expect(item.reason).toBeNull();
  });

  test("a frame without the new fields leaves the verdict empty", () => {
    render(<Harness />);

    act(() => {
      socket.emitTo("download-done", {
        url: "https://e.com/3",
        title: "Old Frame Video",
      });
    });

    const item = latest.downloadedItem.current;
    expect(item.partial).toBe(false);
    expect(item.missingExtras).toBeNull();
    expect(item.reason).toBeNull();
  });
});