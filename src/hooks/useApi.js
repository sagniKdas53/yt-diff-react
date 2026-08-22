import { useContext, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { NotificationContext } from "../contexts/NotificationContext";
import { backEnd } from "../config.js";

/**
 * The single authenticated entry point to the backend.
 *
 * Takes a path relative to the backend ("/getplay") or a fully-qualified URL,
 * attaches the JSON headers and the bearer token, and owns the one response
 * code every caller used to re-handle by hand: a 401 means the session died,
 * so say so once and log out.
 *
 * Network failures are re-thrown untouched. Callers own their own failure copy
 * — some report it, some (thumbnail refreshes) deliberately stay silent — so
 * this hook must not speak for them.
 */
export function useApi() {
  const { token, logout } = useContext(AuthContext);
  const { notify } = useContext(NotificationContext);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const url = /^https?:\/\//.test(path) ? path : backEnd + path;

      // JSON is the default on both sides, but a caller asking for something
      // else (a file download) keeps its own Accept.
      const headers = new Headers(options.headers || {});
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
        mode: "cors",
      });

      // Only a request that actually carried a token can have its session
      // expire — a 401 from /login is a wrong password, not a dead token.
      if (response.status === 401 && token) {
        notify("Session expired. Please log in again.", "error");
        logout();
      }

      return response;
    },
    [token, logout, notify],
  );

  return apiFetch;
}
