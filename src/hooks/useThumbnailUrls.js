import { useCallback, useEffect, useRef, useState } from "react";

import { assetBase } from "../config.js";
import { nextBackoffDelay } from "../lib/refreshBackoff.js";

const REFRESH_MARGIN_MS = 300000; // refresh 5 mins before expiry

/**
 * Signed thumbnail URLs for the visible sub-list rows.
 *
 * Bulk-mints them from `/getfiles` for every row that has a thumbnail file
 * and no URL yet, then keeps the minted ids alive: a timer fires before the
 * earliest expiry and extends whatever is due through `/refreshfiles`.
 *
 * The metadata (which signed id belongs to which file, and when each
 * expires) lives in a ref rather than state — it changes alongside
 * `thumbUrls`, and nothing renders it directly.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {Array<{video_metadatum?: Object}> | []} deps.items - Current rows.
 * @param {string} deps.playlistDirectory - Fallback save directory.
 * @param {string} deps.loadedPlayList - Switching playlists resets everything.
 * @returns {{thumbUrls: Record<string, ?string>}}
 */
export function useThumbnailUrls({ api, items, playlistDirectory, loadedPlayList }) {
  const [thumbUrls, setThumbUrls] = useState({});
  const thumbMetaRef = useRef({});
  const thumbRefreshTimerRef = useRef(null);
  // Consecutive failed refreshes. Cleared by any success, so a single blip
  // does not start the count over.
  const refreshFailuresRef = useRef(0);

  const clearThumbnailRefreshTimer = useCallback(() => {
    if (thumbRefreshTimerRef.current) {
      clearTimeout(thumbRefreshTimerRef.current);
      thumbRefreshTimerRef.current = null;
    }
  }, []);

  /**
   * Forgets a thumbnail entirely rather than recording it as a null.
   *
   * A null entry reads as "in progress" to the fetch effect, so a thumbnail
   * the retry gave up on was never fetched again for the life of the page.
   * Deleting the key puts it back to `undefined`, which is the one state that
   * asks again.
   */
  const forgetThumbnails = useCallback((fileNames) => {
    for (const fileName of fileNames) {
      Reflect.deleteProperty(thumbMetaRef.current, fileName);
    }
    setThumbUrls((prev) => {
      const next = { ...prev };
      for (const fileName of fileNames) {
        Reflect.deleteProperty(next, fileName);
      }
      return next;
    });
  }, []);

  const scheduleThumbnailRefresh = useCallback((retryInMs = null) => {
    clearThumbnailRefreshTimer();

    if (retryInMs !== null) {
      thumbRefreshTimerRef.current = setTimeout(() => {
        scheduleThumbnailRefresh();
      }, retryInMs);
      return;
    }

    const activeEntries = Object.values(thumbMetaRef.current).filter(
      (entry) => entry?.fileId && entry?.expiry,
    );
    if (activeEntries.length === 0) return;

    const nextExpiry = Math.min(...activeEntries.map((entry) => entry.expiry));
    const timeUntilExpiry = nextExpiry - Date.now();
    // Never 0: an id that has already expired would otherwise schedule the
    // next attempt immediately, forever.
    const refreshTime = Math.max(1000, timeUntilExpiry - REFRESH_MARGIN_MS);

    thumbRefreshTimerRef.current = setTimeout(async () => {
      const entries = Object.entries(thumbMetaRef.current).filter(
        ([, entry]) => entry?.fileId && entry?.expiry,
      );
      const dueEntries = entries.filter(
        ([, entry]) => entry.expiry - Date.now() <= REFRESH_MARGIN_MS,
      );
      if (dueEntries.length === 0) {
        scheduleThumbnailRefresh();
        return;
      }

      try {
        const data = await api.post("/refreshfiles", {
          fileIds: dueEntries.map(([, entry]) => entry.fileId),
        });

        refreshFailuresRef.current = 0;

        if (data.status === "success" && data.files) {
          const dropped = [];
          dueEntries.forEach(([fileName, entry]) => {
            const refreshed = Reflect.get(data.files, entry.fileId);
            if (refreshed?.expiry) {
              Reflect.set(thumbMetaRef.current, fileName, {
                ...Reflect.get(thumbMetaRef.current, fileName),
                expiry: refreshed.expiry,
              });
            } else {
              dropped.push(fileName);
            }
          });
          forgetThumbnails(dropped);
        }
      } catch (_error) {
        refreshFailuresRef.current += 1;
        const retryIn = nextBackoffDelay(refreshFailuresRef.current);
        // Out of budget: give up on the ids and let the fetch effect ask for
        // them again. Retrying an expired id is what looped forever.
        if (retryIn === null) {
          forgetThumbnails(dueEntries.map(([fileName]) => fileName));
          return;
        }
        scheduleThumbnailRefresh(retryIn);
        return;
      }

      scheduleThumbnailRefresh();
    }, refreshTime);
  }, [api, clearThumbnailRefreshTimer, forgetThumbnails]);

  // Bulk-fetch URLs for rows whose thumbnails are not resolved yet.
  useEffect(() => {
    if (!items || items.length === 0 || playlistDirectory === "init") return;

    const fetchThumbnails = async () => {
      const filesToFetch = items
        .map((item) => {
          const thumb = item.video_metadatum?.thumbNailFile;
          if (thumb && thumbUrls[thumb] === undefined) {
            return {
              saveDirectory:
                item.video_metadatum?.saveDirectory ?? playlistDirectory,
              fileName: thumb,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (filesToFetch.length === 0) return;

      // Mark as in-progress
      const newThumbUrls = {};
      filesToFetch.forEach((f) => Reflect.set(newThumbUrls, f.fileName, null));
      setThumbUrls((prev) => ({ ...prev, ...newThumbUrls }));

      try {
        const data = await api.post("/getfiles", { files: filesToFetch });

        if (data.status === "success" && data.files) {
          const updates = {};
          Object.entries(data.files).forEach(([fileName, fileData]) => {
            if (fileData?.signedUrlId) {
              Reflect.set(
                updates,
                fileName,
                assetBase + "/getfile?fileId=" + fileData.signedUrlId,
              );
              Reflect.set(thumbMetaRef.current, fileName, {
                fileId: fileData.signedUrlId,
                expiry: fileData.expiry,
              });
            } else {
              Reflect.set(updates, fileName, null);
              Reflect.deleteProperty(thumbMetaRef.current, fileName);
            }
          });
          setThumbUrls((prev) => ({ ...prev, ...updates }));
          scheduleThumbnailRefresh();
        }
      } catch (_error) {
        // The batch is marked null while it runs, which the next fetch reads as
        // "in progress". Clearing the keys puts them back to undefined so a
        // later pass over `items` tries again instead of skipping them forever.
        forgetThumbnails(filesToFetch.map((f) => f.fileName));
      }
    };

    void fetchThumbnails();
    // thumbUrls is read to decide what to fetch, but including it would loop:
    // each response writes urls, and only newly appearing files matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, playlistDirectory, api, forgetThumbnails]);

  // A new playlist starts with a clean slate.
  useEffect(() => {
    clearThumbnailRefreshTimer();
    thumbMetaRef.current = {};
    refreshFailuresRef.current = 0;
    setThumbUrls({});
  }, [clearThumbnailRefreshTimer, loadedPlayList]);

  useEffect(() => {
    return () => {
      clearThumbnailRefreshTimer();
    };
  }, [clearThumbnailRefreshTimer]);

  return { thumbUrls };
}
