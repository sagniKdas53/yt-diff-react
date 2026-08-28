import { useCallback, useEffect, useRef } from "react";

/**
 * Previous/next navigation across a paged playlist for the player.
 *
 * Skips to the nearest downloaded video on this page; when the page runs out,
 * requests the adjacent page and resumes from its first (or last) downloaded
 * video once the new items arrive. That resume used to be open-coded in the
 * player as two mirrored pending-flags and one 50-line effect.
 *
 * @param {Object} deps
 * @param {(saveDir: string, fileName: string, title: string, index: number, subTitleFile: ?string) => void} deps.openPlayer
 * @param {Array<{video_metadatum?: Object}>} deps.items - Current page rows.
 * @param {number} deps.itemCount - Total rows across all pages.
 * @param {number} deps.page
 * @param {number} deps.start - First row index of the current page.
 * @param {number} deps.currentPlayerIndex - Index of the row now playing.
 * @param {?string} deps.playlistDirectory - Fallback save directory for rows
 *   that do not carry their own.
 * @param {((newPage: number) => void) | null} deps.setPage
 * @returns {{handleNext: () => void, handlePrev: () => void}}
 */
export function usePlaylistNavigation({
  openPlayer,
  items,
  itemCount,
  page,
  start,
  currentPlayerIndex,
  playlistDirectory,
  setPage,
}) {
  // The item snapshot taken when a page turn was requested. Non-null means
  // "waiting for the rows that replaced this list"; they never render, so
  // plain refs do instead of state.
  const pendingNextFrom = useRef(null);
  const pendingPrevFrom = useRef(null);

  /** Opens the nearest downloaded row at or after `from` (before, for prev). */
  const skipToDownloaded = useCallback(
    (from, step) => {
      if (!openPlayer) return false;
      for (let i = from; i >= 0 && i < items.length; i += step) {
        const meta = items.at(i).video_metadatum || {};
        if (meta.downloadStatus) {
          openPlayer(
            meta.saveDirectory ?? playlistDirectory,
            meta.fileName,
            meta.title,
            i,
            meta.subTitleFile || null,
          );
          return true;
        }
      }
      return false;
    },
    [items, openPlayer, playlistDirectory],
  );

  const handleNext = useCallback(() => {
    if (!openPlayer) return;
    if (skipToDownloaded(currentPlayerIndex + 1, 1)) return;

    // Hit the end of current page, request next page if available
    if (start + items.length < itemCount && setPage) {
      setPage(page + 1);
      pendingNextFrom.current = items;
    }
  }, [
    currentPlayerIndex,
    items,
    itemCount,
    openPlayer,
    page,
    setPage,
    skipToDownloaded,
    start,
  ]);

  const handlePrev = useCallback(() => {
    if (!openPlayer) return;
    if (skipToDownloaded(currentPlayerIndex - 1, -1)) return;

    // If we reach the beginning of the page, request the previous page if available
    if (page > 0 && setPage) {
      setPage(page - 1);
      pendingPrevFrom.current = items;
    }
  }, [
    currentPlayerIndex,
    items,
    openPlayer,
    page,
    setPage,
    skipToDownloaded,
  ]);

  // Auto-resume across pagination: once the requested page's rows arrive,
  // continue from its first downloaded video (next) or last (prev).
  useEffect(() => {
    if (
      pendingNextFrom.current !== null &&
      items !== pendingNextFrom.current &&
      items &&
      items.length > 0 &&
      openPlayer
    ) {
      skipToDownloaded(0, 1);
      pendingNextFrom.current = null;
    }

    if (
      pendingPrevFrom.current !== null &&
      items !== pendingPrevFrom.current &&
      items &&
      items.length > 0 &&
      openPlayer
    ) {
      skipToDownloaded(items.length - 1, -1);
      pendingPrevFrom.current = null;
    }
  }, [items, openPlayer, skipToDownloaded]);

  return { handleNext, handlePrev };
}
