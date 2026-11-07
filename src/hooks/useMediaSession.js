import { useEffect } from "react";

import { useLatest } from "./useLatest.js";

/** Browsers throw on actions they do not know, so each is set on its own. */
function setHandler(action, handler) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // An unsupported action is not worth losing the others over.
  }
}

/**
 * Lock-screen, headset and notification-shade controls for the player.
 *
 * Sets the "now playing" metadata and routes the system's play, pause,
 * previous, next and seek buttons to the player. Does nothing where
 * `navigator.mediaSession` does not exist, which is older browsers, so the
 * player works the same there without it.
 *
 * Callbacks are read through a ref so a new closure each render does not tear
 * the handlers down and rebuild them. Passing `onPrev` or `onNext` as
 * `undefined` leaves that button off, which is how a first or last track says
 * so.
 *
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.posterUrl] - Artwork for the lock screen.
 * @param {() => void} options.onPlay
 * @param {() => void} options.onPause
 * @param {(() => void) | undefined} [options.onPrev]
 * @param {(() => void) | undefined} [options.onNext]
 * @param {(seconds: number) => void} options.onSeekBy - Signed seconds.
 */
export function useMediaSession({
  title,
  posterUrl,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSeekBy,
}) {
  const latest = useLatest({ onPlay, onPause, onPrev, onNext, onSeekBy });
  const hasPrev = Boolean(onPrev);
  const hasNext = Boolean(onNext);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return undefined;
    }
    const session = navigator.mediaSession;
    if (typeof MediaMetadata !== "undefined") {
      session.metadata = new MediaMetadata({
        title: title ?? "",
        artwork: posterUrl ? [{ src: posterUrl }] : [],
      });
    }

    setHandler("play", () => latest.current.onPlay());
    setHandler("pause", () => latest.current.onPause());
    setHandler("seekbackward", (details) =>
      latest.current.onSeekBy(-(details?.seekOffset || 10)),
    );
    setHandler("seekforward", (details) =>
      latest.current.onSeekBy(details?.seekOffset || 10),
    );
    setHandler("previoustrack", hasPrev ? () => latest.current.onPrev?.() : null);
    setHandler("nexttrack", hasNext ? () => latest.current.onNext?.() : null);

    return () => {
      for (const action of [
        "play",
        "pause",
        "seekbackward",
        "seekforward",
        "previoustrack",
        "nexttrack",
      ]) {
        setHandler(action, null);
      }
      session.metadata = null;
    };
  }, [title, posterUrl, hasPrev, hasNext, latest]);
}
