import { useEffect, useState } from "react";

import { ApiError } from "../api/client.js";

/**
 * The rows behind one sub-list page.
 *
 * POSTs `/getsub` for the given window, exposing the rows, the total count,
 * and the playlist's own save directory and title. A refusal renders as the
 * single error row the table can show; an abort or a network failure leaves
 * the previous rows on screen.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {number} deps.start - First row index of the window.
 * @param {number} deps.stop - End (exclusive) row index of the window.
 * @param {boolean} deps.sort - Downloaded-first ordering.
 * @param {string} deps.query - Search query (`title:`, `url:`, `global:`).
 * @param {string} deps.loadedPlayList - Which playlist is open ("None"/"init"
 *   are the pseudo-playlists).
 * @param {string} deps.reFetch - Change-token that forces a re-fetch.
 * @returns {{
 *   items: Array<Object>,
 *   setItems: (updater: (prev: Array<Object>) => Array<Object>) => void,
 *   itemCount: number,
 *   playlistDirectory: string,
 *   playlistTitle: string,
 * }}
 */
export function useSubListRows({
  api,
  start,
  stop,
  sort,
  query,
  loadedPlayList,
  reFetch,
}) {
  const [items, setItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [playlistDirectory, setPlaylistDirectory] = useState("init");
  const [playlistTitle, setPlaylistTitle] = useState("");

  useEffect(() => {
    // Handle initial "init" playlist state, unless doing a global search
    if (loadedPlayList === "init" && !query.startsWith("global:")) {
      // Cleared synchronously so switching to "init" never flashes the
      // previous playlist's rows for one frame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setItemCount(0);
      setPlaylistDirectory("init");
      setPlaylistTitle("");
      return;
    }

    const abortController = new AbortController();

    (async () => {
      try {
        const json_data = await api.post(
          "/getsub",
          {
            start,
            stop,
            sortDownloaded: sort,
            query,
            url: loadedPlayList,
          },
          { signal: abortController.signal },
        );

        if (abortController.signal.aborted) return; // Don't update state if component unmounted

        setItems(json_data["rows"]);
        setPlaylistDirectory(json_data["saveDirectory"]);
        setPlaylistTitle(json_data["playlistTitle"] || "");
        // `count` is a number in the contract; the parseInt here was guarding
        // against a string nobody had checked for.
        setItemCount(json_data["count"]);
      } catch (error) {
        if (error instanceof ApiError && !abortController.signal.aborted) {
          // The table is the only place there is to say this, so the refusal
          // is rendered as the one row it can show.
          setItems([
            {
              positionInPlaylist: 1,
              id: "error-row",
              playlistUrl: loadedPlayList,
              video_metadatum: {
                title: `Error in fetching sub-lists: ${error.status} ${error.message}`,
                videoId: "",
                videoUrl: "",
                downloadStatus: false,
                isAvailable: false,
              },
            },
          ]);
          setItemCount(1);
        }
        // Anything else -- an abort, or the network -- leaves the table showing
        // what it already had.
      }
    })();

    return () => abortController.abort();
     
  }, [api, start, stop, sort, query, loadedPlayList, reFetch]);

  return { items, setItems, itemCount, playlistDirectory, playlistTitle };
}
