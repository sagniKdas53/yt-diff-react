import { useCallback, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useApiClient } from "./useApiClient.js";

/**
 * The largest delay `setTimeout` accepts — its argument is a signed 32-bit
 * int, and anything past this fires immediately instead of never. The same
 * clamp appears in the signed-URL refresh timers and in the backend's socket
 * expiry timer.
 */
const MAX_TIMEOUT = 2147483647;

/** Renew once the token is this far through its life. */
const RENEW_AFTER = 0.5;

/** Never schedule a wake-up tighter than this, so a clock skew cannot spin. */
const MIN_DELAY_MS = 30 * 1000;

/**
 * Keeps the session alive by re-stamping the token before it expires.
 *
 * Tokens used to last 31 days precisely so that nothing had to do this. They
 * last a day now, which only works if the client renews — so this is the half
 * of that change that keeps people logged in.
 *
 * Two triggers, because neither is sufficient alone:
 *
 * - A timer at the halfway mark, for a tab left open and visible.
 * - `visibilitychange`, for a tab that was backgrounded or a laptop that was
 *   asleep. Timers do not fire reliably across suspend, and browsers throttle
 *   them hard in background tabs, so a tab woken after its timer should have
 *   fired must not wait for a timer that already missed.
 *
 * Renewal runs through the API client, so a token that died while the machine was
 * asleep gets the ordinary 401 path — one "Session expired" and a logout —
 * rather than a special case here.
 */
export function useTokenRefresh() {
  const { token, expiresAt, setToken } = useContext(AuthContext);
  const api = useApiClient();
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);

  // Read by the scheduler without re-subscribing it on every token change.
  const stateRef = useRef({ token, expiresAt });
  stateRef.current = { token, expiresAt };

  const refresh = useCallback(async () => {
    // One renewal at a time: the timer and a visibility change can land
    // together, and two in flight would have the loser store a token the
    // winner already replaced.
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    try {
      // The body has to be a JSON object, not nothing: the server's
      // `parseRequestJson` rejects an empty body with a 400 before the handler
      // runs. `/isregallowed` takes the same empty `{}` for the same reason.
      const data = await api.post("/refresh", {});
      if (!data?.token) return null;

      // Renewal never upgrades a memory-only session to a persisted one: if
      // the token is not in localStorage now, the replacement does not go
      // there either.
      const persist = localStorage.getItem("ytdiff_token") !== null;
      setToken(data.token, { persist, expiresAt: data.expiresAt ?? null });
      return data.expiresAt ?? null;
    } catch {
      // A refused renewal, or the server is unreachable. The existing token is
      // still valid for now; the next trigger tries again.
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [api, setToken]);

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (!token) {
      clear();
      return undefined;
    }

    /** Milliseconds until the token is `RENEW_AFTER` through its life. */
    const msUntilRenewal = () => {
      const { expiresAt: exp } = stateRef.current;
      // No expiry to work from — the server did not send one, or this token
      // predates the change. Fall back to a fixed hourly check rather than
      // guessing at a lifetime.
      if (!exp) return 60 * 60 * 1000;
      const remainingMs = exp * 1000 - Date.now();
      return remainingMs * RENEW_AFTER;
    };

    const schedule = () => {
      clear();
      const delay = Math.min(
        Math.max(msUntilRenewal(), MIN_DELAY_MS),
        MAX_TIMEOUT,
      );
      timerRef.current = setTimeout(async () => {
        await refresh();
        // Reschedule off whatever the new token says, rather than assuming
        // the lifetime did not change under us.
        if (stateRef.current.token) schedule();
      }, delay);
    };

    const onWake = () => {
      if (document.visibilityState !== "visible") return;
      if (!stateRef.current.token) return;
      // Past the halfway mark — the timer either already missed or is about
      // to. Renew now and start a fresh schedule from the new expiry.
      if (msUntilRenewal() <= 0) {
        void refresh().then(() => {
          if (stateRef.current.token) schedule();
        });
      } else {
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onWake);

    return () => {
      clear();
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [token, refresh]);

  return refresh;
}
