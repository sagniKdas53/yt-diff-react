import { useEffect, useRef, useCallback } from "react";

/**
 * A hook to automatically poll for signed URL refreshes.
 * @param {Function} refreshFn - The function to call to perform the refresh.
 * @param {number} intervalMs - Polling interval in milliseconds.
 * @param {boolean} enabled - Whether polling should be active.
 */
export function useSignedUrlRefresh(
  refreshFn,
  intervalMs = 24 * 60 * 60 * 1000 - 300000,
  enabled = true,
) {
  const timerRef = useRef(null);
  const refreshFnRef = useRef(refreshFn);

  useEffect(() => {
    refreshFnRef.current = refreshFn;
  }, [refreshFn]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (enabled) {
      timerRef.current = setTimeout(async () => {
        try {
          await refreshFnRef.current();
        } catch (error) {
          console.error("Failed to refresh URL", error);
        }
        startPolling();
      }, intervalMs);
    }
  }, [enabled, intervalMs, stopPolling]);

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);
}
