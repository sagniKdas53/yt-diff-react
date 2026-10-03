import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseSubtitleText } from "../lib/subtitles.js";
import { assetBase } from "../config.js";

/**
 * How far back the active-cue walk looks.
 *
 * Subtitle files do contain overlapping cues — a rolling auto-caption starts
 * its next line before the previous one ends, and an extractor can repeat a
 * cue — so the cue that started last is not the only one on screen. Finding
 * the rest means walking back past every cue that has ended since, which is
 * capped here: no cue a person wrote runs for half a minute, and an uncapped
 * walk on a track with one 10 ms cue per word would undo the point of not
 * filtering.
 */
const MAX_ACTIVE_CUE_WINDOW_SECONDS = 30;

/**
 * Subtitles for the track currently playing.
 *
 * Fetches the .vtt through a signed URL, parses it into plain-text cues, and
 * exposes the cues active at the playhead. Availability (`subtitleUrl`) gates
 * the CC button; `activeCues` drives the overlay.
 *
 * The playhead arrives as `currentTime` rather than being pushed in through
 * `reportTime`: the player already owns the time — it drives the seek bar, the
 * buffer bar and the chapter title — and holding a second copy of it here
 * meant every `timeupdate` set two pieces of state and rendered twice for one
 * tick.
 *
 * Like `useSignedPlayback`, a session counter guards async callbacks: a
 * subtitle fetch that lands after the track changed must not attach its cues
 * to the new video.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {string} deps.saveDirectory - Directory of the video being played.
 * @param {string | null} deps.subTitleFile - The track's subtitle file, if any.
 * @param {number} deps.currentTime - The playhead, in seconds.
 *
 * `subtitleCues` is the whole parsed track, not just the cue on screen: it is
 * what the transcript list renders, and re-parsing it there would mean
 * fetching the file a second time. It is sorted by `start` on the way out,
 * because a .vtt is free to list its blocks out of order and both the
 * transcript and the search below need them in time order.
 * @returns {{
 *   subtitleUrl: string | null,
 *   subtitleCues: Array<{start: number, end: number, text: string}>,
 *   activeCues: Array<{start: number, end: number, text: string}>,
 *   subtitlesEnabled: boolean,
 *   toggleSubtitles: () => void,
 * }}
 */
export function useSubtitleTrack({ api, saveDirectory, subTitleFile, currentTime }) {
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitleCues, setSubtitleCues] = useState([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    const saved = localStorage.getItem("ytdiff_player_subtitles");
    return saved !== null ? saved === "true" : true; // default ON
  });

  const playerSessionRef = useRef(0);

  const toggleSubtitles = useCallback(() => {
    setSubtitlesEnabled((prev) => {
      const newVal = !prev;
      localStorage.setItem("ytdiff_player_subtitles", String(newVal));
      return newVal;
    });
  }, []);

  useEffect(() => {
    const sessionId = ++playerSessionRef.current;
    setSubtitleUrl(null);
    setSubtitleCues([]);

    if (!subTitleFile) return;

    (async () => {
      try {
        const data = await api.post("/getfile", {
          saveDirectory,
          fileName: subTitleFile,
        });

        if (
          playerSessionRef.current !== sessionId ||
          data.status !== "success" ||
          !data.signedUrlId
        ) {
          return;
        }

        const signedSubtitleUrl =
          assetBase + "/getfile?fileId=" + data.signedUrlId + "&inline=true";

        // Always fetch text content to parse cues for custom overlay
        const subtitleResponse = await fetch(signedSubtitleUrl);
        if (!subtitleResponse.ok) {
          throw new Error("Failed to load subtitle contents");
        }

        const subtitleText = await subtitleResponse.text();
        if (playerSessionRef.current !== sessionId) {
          return;
        }

        setSubtitleCues(parseSubtitleText(subtitleText));
        // Set subtitleUrl as a flag that subtitles are available
        setSubtitleUrl(signedSubtitleUrl);
      } catch (error) {
        if (playerSessionRef.current === sessionId) {
          console.warn("Subtitle loading failed", error);
          setSubtitleUrl(null);
          setSubtitleCues([]);
        }
      }
    })();

    return () => {
      // Invalidate any in-flight fetch for this track.
      playerSessionRef.current += 1;
    };
  }, [api, saveDirectory, subTitleFile]);

  // Cues in time order. A track is usually already listed in order, but not
  // always, and both the transcript and the search below assume it.
  const sortedCues = useMemo(
    () => [...subtitleCues].sort((a, b) => a.start - b.start),
    [subtitleCues],
  );

  // The cues active right now.
  //
  // Binary search rather than a filter: `timeupdate` fires about four times a
  // second, and a filter walked the whole cue list each time — on a long video
  // with auto-captions that is thousands of comparisons per tick to find the
  // one or two cues on screen. Cues are sorted by start, so the last cue that
  // has already started is the only place to start looking.
  //
  // That cue is not necessarily the only one on screen: overlapping cues are
  // normal in real files, and returning just it hid the earlier line for the
  // length of the overlap. So the walk continues backwards over everything
  // that has ended since, up to the window that bounds it.
  const activeCues = useMemo(() => {
    if (!sortedCues.length || !subtitlesEnabled) return [];

    let low = 0;
    let high = sortedCues.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (sortedCues[mid].start <= currentTime) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (found === -1) return [];

    const active = [];
    const oldestActiveStart = currentTime - MAX_ACTIVE_CUE_WINDOW_SECONDS;
    for (let i = found; i >= 0 && sortedCues[i].start >= oldestActiveStart; i--) {
      const cue = sortedCues[i];
      if (currentTime <= cue.end) active.push(cue);
    }
    // Collected newest first; the overlay reads top to bottom, so the line
    // that started earlier goes above the one that covered it.
    return active.reverse();
  }, [sortedCues, currentTime, subtitlesEnabled]);

  return {
    subtitleUrl,
    subtitleCues: sortedCues,
    activeCues,
    subtitlesEnabled,
    toggleSubtitles,
  };
}
