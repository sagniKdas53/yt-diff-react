import { createContext, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";

export const DownloadContext = createContext({
  activeDownloads: {},
  queuedItems: {},
  addToDownloadQueue: () => {},
  rollbackDownloadQueueRequest: () => {},
  removeFromQueueAndRenumber: () => {},
  updateActiveDownloads: () => {},
  removeActiveDownload: () => {},
  clearDownloadState: () => {},
});

export const DownloadProvider = ({ children }) => {
  const [activeDownloads, setActiveDownloads] = useState({});
  const [queuedItems, setQueuedItems] = useState({});
  const activeDownloadsRef = useRef(activeDownloads);

  const updateActiveDownloads = useCallback((updater) => {
    setActiveDownloads((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      activeDownloadsRef.current = next;
      return next;
    });
  }, []);

  const removeActiveDownload = useCallback(
    (url) => {
      updateActiveDownloads((prev) => {
        const next = { ...prev };
        Reflect.deleteProperty(next, url);
        return next;
      });
    },
    [updateActiveDownloads],
  );

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
            queuePosition: counter,
            requestId,
          });
        }
      });

      return changed ? next : prev;
    });
  }, []);

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
    updateActiveDownloads({});
    setQueuedItems({});
  }, [updateActiveDownloads]);

  return (
    <DownloadContext.Provider
      value={{
        activeDownloads,
        queuedItems,
        addToDownloadQueue,
        rollbackDownloadQueueRequest,
        removeFromQueueAndRenumber,
        updateActiveDownloads,
        removeActiveDownload,
        clearDownloadState,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

DownloadProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
