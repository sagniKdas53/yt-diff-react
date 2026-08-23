import { useCallback, useEffect, useRef, useState } from "react";

import { assetBase } from "../config.js";

const REFRESH_MARGIN_MS = 300000; // refresh 5 mins before expiry

/**
 * Signed-URL playback for one downloaded file.
 *
 * Owns the whole life of the video URL: minting it from `/getfile`,
 * refreshing it on a timer before the signed id expires, recovering
 * playback after a mid-stream media error at the position the viewer was
 * watching, and invalidating everything when the track changes or the
 * component unmounts.
 *
 * A monotonically increasing session counter guards every async callback:
 * a response that arrives after the track changed must not set state, and
 * a timer left over from the previous file must not refresh its id.
 *
 * @param {Object} deps
 * @param {import("../api/client.js").ApiClient} deps.api
 * @param {string} deps.saveDirectory - Directory of the video being played.
 * @param {string} deps.fileName - File of the video being played.
 * @param {{current: HTMLVideoElement | null}} deps.videoRef - The element the
 *   component renders; used to pause during remint and resume on recovery.
 * @returns {{
 *   videoUrl: string | null,
 *   loading: boolean,
 *   errorMsg: string | null,
 *   reload: (isRecovery?: boolean, resumeTime?: number) => Promise<void>,
 * }}
 */
export function useSignedPlayback({ api, saveDirectory, fileName, videoRef }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileIdRef = useRef(null);
  const expiryRef = useRef(null);
  const timerRef = useRef(null);
  const recoveryTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const playerSessionRef = useRef(0);

  const clearRefreshTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (
      scheduledFileId = fileIdRef.current,
      scheduledSessionId = playerSessionRef.current,
      scheduledExpiry = expiryRef.current,
    ) => {
      clearRefreshTimer();
      if (!scheduledExpiry || !scheduledFileId) return;

      const timeUntilExpiry = scheduledExpiry - Date.now();
      const refreshTime = Math.max(0, timeUntilExpiry - REFRESH_MARGIN_MS);

      timerRef.current = setTimeout(async () => {
        if (
          !isMountedRef.current ||
          playerSessionRef.current !== scheduledSessionId ||
          fileIdRef.current !== scheduledFileId
        ) {
          return;
        }
        try {
          const data = await api.post("/refreshfile", {
            fileId: scheduledFileId,
          });

          if (
            data.status === "success" &&
            isMountedRef.current &&
            playerSessionRef.current === scheduledSessionId &&
            fileIdRef.current === scheduledFileId
          ) {
            expiryRef.current = data.expiry;
            scheduleRefresh(scheduledFileId, scheduledSessionId, data.expiry);
          }
        } catch (err) {
          if (
            isMountedRef.current &&
            playerSessionRef.current === scheduledSessionId
          ) {
            console.error("Auto-refresh failed", err);
          }
        }
      }, refreshTime);
    },
    [api, clearRefreshTimer],
  );

  const reload = useCallback(
    async (isRecovery = false, resumeTime = 0) => {
      const sessionId = playerSessionRef.current;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearRecoveryTimer();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setErrorMsg(null);
        if (!isRecovery) {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
        // A refusal throws with the server's own message, which is what the
        // player surfaces to the viewer.
        const data = await api.post(
          "/getfile",
          { saveDirectory, fileName },
          { signal: controller.signal },
        );

        if (!isMountedRef.current || playerSessionRef.current !== sessionId) {
          return;
        }
        if (data.status === "success" && data.signedUrlId) {
          fileIdRef.current = data.signedUrlId;
          expiryRef.current = data.expiry;

          const newUrl =
            assetBase + "/getfile?fileId=" + data.signedUrlId + "&inline=true";
          setVideoUrl(newUrl);
          setErrorMsg(null);
          scheduleRefresh(data.signedUrlId, sessionId, data.expiry);

          if (isRecovery && videoRef.current) {
            recoveryTimerRef.current = setTimeout(() => {
              if (
                isMountedRef.current &&
                playerSessionRef.current === sessionId &&
                fileIdRef.current === data.signedUrlId &&
                videoRef.current
              ) {
                videoRef.current.currentTime = resumeTime;
                videoRef.current
                  .play()
                  .catch((e) => console.error("Auto-resume failed", e));
              }
            }, 100);
          }
        } else {
          throw new Error("Failed to get download URL");
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("fetchSignedUrl error:", error);
        if (!isMountedRef.current || playerSessionRef.current !== sessionId) {
          return;
        }
        setErrorMsg(error.message);
        setVideoUrl(null);
      } finally {
        if (isMountedRef.current && playerSessionRef.current === sessionId) {
          setLoading(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [api, clearRecoveryTimer, saveDirectory, fileName, scheduleRefresh, videoRef],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Dependency on saveDirectory/fileName forces refresh on track change
  useEffect(() => {
    playerSessionRef.current += 1;
    clearRefreshTimer();
    clearRecoveryTimer();
    fileIdRef.current = null;
    expiryRef.current = null;
    void reload();
    const videoElement = videoRef.current;

    return () => {
      playerSessionRef.current += 1;
      clearRefreshTimer();
      clearRecoveryTimer();
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = null;
      fileIdRef.current = null;
      expiryRef.current = null;

      // Clean up the video element
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
  }, [clearRecoveryTimer, clearRefreshTimer, reload, videoRef]);

  return { videoUrl, loading, errorMsg, reload };
}
