import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseSubtitleText } from "../lib/subtitles.js";
import { assetBase } from "../config.js";

/**
 * Subtitles for the track currently playing.
 *
 * Fetches the .vtt through a signed URL, parses it into plain-text cues, and
 * exposes the cues active at the playhead. Availability (`subtitleUrl`) gates
 * the CC button; `activeCues` drives the overlay.
 *
 * Like `useSignedPlayback`, a session counter guards async callbacks: a
 * subtitle fetch that lands after the track changed must not attach its cues
 * to the new video.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {string} deps.saveDirectory - Directory of the video being played.
 * @param {string | null} deps.subTitleFile - The track's subtitle file, if any.
 * @returns {{
 *   subtitleUrl: string | null,
 *   activeCues: Array<{start: number, end: number, text: string}>,
 *   subtitlesEnabled: boolean,
 *   toggleSubtitles: () => void,
 *   reportTime: (seconds: number) => void,
 * }}
 */
export function useSubtitleTrack({ api, saveDirectory, subTitleFile }) {
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitleCues, setSubtitleCues] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
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

  /** Reports the playhead so active cues can be derived. */
  const reportTime = useCallback((seconds) => {
    setCurrentTime(seconds);
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

  // Compute active subtitle cues based on current playback time
  const activeCues = useMemo(() => {
    if (!subtitleCues.length || !subtitlesEnabled) return [];
    return subtitleCues.filter(
      (cue) => currentTime >= cue.start && currentTime <= cue.end,
    );
  }, [subtitleCues, currentTime, subtitlesEnabled]);

  return { subtitleUrl, activeCues, subtitlesEnabled, toggleSubtitles, reportTime };
}
