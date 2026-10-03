import { useCallback, useEffect, useRef, useState } from "react";

import { assetBase } from "../config.js";

/**
 * The video's description, fetched when the viewer asks for it.
 *
 * Follows the same shape as `useSubtitleTrack` — mint a signed URL with
 * `/getfile`, fetch the text through it, and refuse to set state for a track
 * that is no longer on screen — with one difference: the fetch is lazy. A
 * description is a blob nobody reads unless they open it, and the listing
 * only names the file, so it is fetched on open and then kept for the track.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {string} deps.saveDirectory - Directory of the video being played.
 * @param {string | null} deps.descriptionFile - The track's description file.
 * @returns {{
 *   available: boolean,
 *   open: boolean,
 *   loading: boolean,
 *   error: string | null,
 *   text: string,
 *   show: () => void,
 *   close: () => void,
 * }}
 */
export function useDescription({ api, saveDirectory, descriptionFile }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");

  const sessionRef = useRef(0);

  // Changing track closes the dialog and drops the text: the description on
  // screen must never be the previous video's.
  useEffect(() => {
    sessionRef.current += 1;
    setOpen(false);
    setText("");
    setError(null);
    setLoading(false);
  }, [descriptionFile]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
    };
  }, []);

  const show = useCallback(() => {
    if (!descriptionFile) {
      return;
    }
    setOpen(true);
    const sessionId = ++sessionRef.current;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post("/getfile", {
          saveDirectory,
          fileName: descriptionFile,
        });

        if (
          sessionRef.current !== sessionId ||
          data.status !== "success" ||
          !data.signedUrlId
        ) {
          return;
        }

        const response = await fetch(
          assetBase + "/getfile?fileId=" + data.signedUrlId + "&inline=true",
        );
        if (!response.ok) {
          throw new Error("Failed to load the description");
        }

        const body = await response.text();
        if (sessionRef.current !== sessionId) {
          return;
        }
        setText(body);
      } catch (caught) {
        if (sessionRef.current !== sessionId) {
          return;
        }
        setError(caught instanceof Error ? caught.message : String(caught));
        setText("");
      } finally {
        if (sessionRef.current === sessionId) {
          setLoading(false);
        }
      }
    })();
  }, [api, descriptionFile, saveDirectory]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    available: Boolean(descriptionFile),
    open,
    loading,
    error,
    text,
    show,
    close,
  };
}

/**
 * Splits a description into plain text, links and seekable timestamps.
 *
 * YouTube descriptions are where a chapter list usually lives before anyone
 * has chapters: "00:00 intro", "2:13 the bit you came for". Clicking one seeks,
 * which is the poor man's chapter list — and it costs nothing, because the
 * timestamps are already in the text.
 *
 * @param {string} text
 * @returns {Array<{kind: "text" | "link" | "time", value: string, seconds?: number}>}
 */
export function parseDescriptionSegments(text) {
  const segments = [];
  const pattern =
    /(https?:\/\/[^\s]+)|((?:\d{1,2}:)?\d{1,2}:\d{2})/g;

  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, index) });
    }

    if (match[1]) {
      // Trailing punctuation is part of the sentence, not of the URL.
      const trailing = match[1].match(/[.,;:)]+$/);
      const url = trailing ? match[1].slice(0, -trailing[0].length) : match[1];
      if (url) {
        segments.push({ kind: "link", value: url });
      }
      if (trailing) {
        segments.push({ kind: "text", value: trailing[0] });
      }
    } else {
      const parts = match[2].split(":").map(Number);
      const seconds = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
      segments.push({ kind: "time", value: match[2], seconds });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}