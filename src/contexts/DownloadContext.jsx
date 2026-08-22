import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useContext,
} from "react";
import PropTypes from "prop-types";
import { useApi } from "../hooks/useApi.js";
import { AuthContext } from "./AuthContext";
import { NotificationContext } from "./NotificationContext";

export const DownloadContext = createContext({
  activeDownloads: {},
  queuedItems: {},
  queueDownloads: async () => [],
  addToDownloadQueue: () => {},
  rollbackDownloadQueueRequest: () => {},
  removeFromQueueAndRenumber: () => {},
  setQueuePosition: () => {},
  updateActiveDownloads: () => {},
  removeActiveDownload: () => {},
  clearDownloadState: () => {},
  syncQueueFromBackend: async () => null,
});

/**
 * Owns the download queue: what the backend is working on, what is waiting,
 * and the request that puts things there.
 *
 * The queue lives above the playlist views so it survives switching playlists,
 * and above the socket handlers so a completion event can arrive before or
 * after the POST that caused it resolves.
 *
 * Shape of `queuedItems`:
 *   { [videoUrl]: { playlistUrl, positionInPlaylist, queuePosition, requestId } }
 */
export const DownloadProvider = ({ children }) => {
  const [activeDownloads, setActiveDownloads] = useState({});
  const [queuedItems, setQueuedItems] = useState({});
  const apiFetch = useApi();
  const { token } = useContext(AuthContext);
  const { setSnack, notify } = useContext(NotificationContext);

  const updateActiveDownloads = useCallback((updater) => {
    setActiveDownloads((prev) =>
      typeof updater === "function" ? updater(prev) : updater,
    );
  }, []);

  const removeActiveDownload = useCallback((url) => {
    setActiveDownloads((prev) => {
      if (!Reflect.has(prev, url)) return prev;
      const next = { ...prev };
      Reflect.deleteProperty(next, url);
      return next;
    });
  }, []);

  const removeFromQueueAndRenumber = useCallback((url) => {
    setQueuedItems((prev) => {
      if (!Reflect.has(prev, url)) return prev;
      const removedPosition = prev[url].queuePosition;
      const next = {};

      Object.entries(prev).forEach(([itemUrl, data]) => {
        if (itemUrl === url) return;
        Reflect.set(
          next,
          itemUrl,
          data.queuePosition > removedPosition
            ? { ...data, queuePosition: data.queuePosition - 1 }
            : data,
        );
      });

      return next;
    });
  }, []);

  /** Applies a queue position the backend reported for an item already queued. */
  const setQueuePosition = useCallback((url, queuePosition) => {
    if (!queuePosition) return;
    setQueuedItems((prev) => {
      if (!prev[url] || prev[url].queuePosition === queuePosition) return prev;
      return { ...prev, [url]: { ...prev[url], queuePosition } };
    });
  }, []);

  const addToDownloadQueue = useCallback((entries, requestId) => {
    setQueuedItems((prev) => {
      const next = { ...prev };
      let counter = Object.keys(prev).length;
      let changed = false;

      entries.forEach((entry) => {
        if (!Reflect.has(next, entry.url)) {
          counter++;
          changed = true;
          Reflect.set(next, entry.url, {
            playlistUrl: entry.playlistUrl,
            positionInPlaylist: entry.positionInPlaylist,
            queuePosition: entry.queuePosition ?? counter,
            requestId,
          });
        } else if (
          entry.queuePosition &&
          next[entry.url].queuePosition !== entry.queuePosition
        ) {
          changed = true;
          Reflect.set(next, entry.url, {
            ...next[entry.url],
            queuePosition: entry.queuePosition,
          });
        }
      });

      return changed ? next : prev;
    });
  }, []);

  /**
   * Drops the items of `requestId` the backend did not accept and closes the
   * gaps their positions left behind.
   */
  const rollbackDownloadQueueRequest = useCallback(
    (requestId, acceptedUrls) => {
      const accepted = new Set(acceptedUrls);

      setQueuedItems((prev) => {
        const rejectedUrls = Object.entries(prev)
          .filter(
            ([url, data]) => data.requestId === requestId && !accepted.has(url),
          )
          .map(([url]) => url);

        if (rejectedUrls.length === 0) return prev;

        const rejected = new Set(rejectedUrls);
        const remaining = Object.entries(prev)
          .filter(([url]) => !rejected.has(url))
          .sort(([, a], [, b]) => a.queuePosition - b.queuePosition);
        const next = {};

        remaining.forEach(([url, data], index) => {
          const queuePosition = index + 1;
          Reflect.set(
            next,
            url,
            data.queuePosition === queuePosition
              ? data
              : { ...data, queuePosition },
          );
        });

        return next;
      });
    },
    [],
  );

  const clearDownloadState = useCallback(() => {
    setActiveDownloads((prev) => (Object.keys(prev).length ? {} : prev));
    setQueuedItems((prev) => (Object.keys(prev).length ? {} : prev));
  }, []);

  /**
   * Replaces local queue state with the backend's snapshot, which is the only
   * thing that survives a reconnect or a tab returning to the foreground.
   *
   * @returns the backend's connection generation, or null if unavailable.
   */
  const syncQueueFromBackend = useCallback(async () => {
    if (!token) return null;
    try {
      const response = await apiFetch("/queuestatus", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (!response.ok) return null;

      const result = await response.json();
      const newActiveDownloads = {};
      const newQueuedItems = {};

      result.queue.forEach((item) => {
        if (item.status === "downloading" || item.status === "running") {
          newActiveDownloads[item.url] = item.percentage ?? 0;
        }
        newQueuedItems[item.url] = {
          // Unknown from the snapshot alone, but sufficient for the queue UI.
          playlistUrl: "",
          positionInPlaylist: null,
          queuePosition: item.queuePosition,
          requestId: "backend-sync",
        };
      });

      setActiveDownloads(newActiveDownloads);
      setQueuedItems(newQueuedItems);
      return result.generation ?? null;
    } catch (_error) {
      // Nothing to recover: the next sync or socket frame will correct us.
      return null;
    }
  }, [apiFetch, token]);

  // A backgrounded tab misses socket frames, so re-read the snapshot whenever
  // it comes back. Held in a ref so the listener is registered once.
  const syncQueueRef = useRef(syncQueueFromBackend);
  syncQueueRef.current = syncQueueFromBackend;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncQueueRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /**
   * Queues `entries` for download and returns the urls the backend accepted.
   *
   * The optimistic insert happens before the request so a fast completion
   * event cannot arrive for an item the queue has never heard of; anything the
   * backend rejects is rolled back on the response.
   */
  const queueDownloads = useCallback(
    async (entries) => {
      if (entries.length === 0) return [];

      const requestId =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const urls = entries.map((entry) => entry.url);

      addToDownloadQueue(entries, requestId);

      try {
        const response = await apiFetch("/download", {
          method: "post",
          body: JSON.stringify({
            urlList: urls,
            playListUrl: entries[0].playlistUrl,
          }),
        });

        if (response.ok) {
          try {
            const result = await response.json();
            const acceptedUrls = (result.items || []).map((item) => item.url);
            rollbackDownloadQueueRequest(requestId, acceptedUrls);
            setSnack("Initiated download…", "success");
            return acceptedUrls;
          } catch (_error) {
            rollbackDownloadQueueRequest(requestId, []);
            setSnack("Could not confirm the download queue.", "error");
            return [];
          }
        }

        rollbackDownloadQueueRequest(requestId, []);

        // 401 is already reported and logged out by apiFetch.
        if (response.status === 429) {
          notify("Too many downloads requested. Please wait.", "error");
        } else if (response.status !== 401) {
          notify(
            `Failed to queue downloads: ${response.status} ${response.statusText}`,
            "error",
          );
        }
      } catch (error) {
        rollbackDownloadQueueRequest(requestId, []);
        notify(`Failed to queue downloads: ${error.message}`, "error");
      }

      return [];
    },
    [
      apiFetch,
      addToDownloadQueue,
      rollbackDownloadQueueRequest,
      setSnack,
      notify,
    ],
  );

  const value = useMemo(
    () => ({
      activeDownloads,
      queuedItems,
      queueDownloads,
      addToDownloadQueue,
      rollbackDownloadQueueRequest,
      removeFromQueueAndRenumber,
      setQueuePosition,
      updateActiveDownloads,
      removeActiveDownload,
      clearDownloadState,
      syncQueueFromBackend,
    }),
    [
      activeDownloads,
      queuedItems,
      queueDownloads,
      addToDownloadQueue,
      rollbackDownloadQueueRequest,
      removeFromQueueAndRenumber,
      setQueuePosition,
      updateActiveDownloads,
      removeActiveDownload,
      clearDownloadState,
      syncQueueFromBackend,
    ],
  );

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};

DownloadProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
