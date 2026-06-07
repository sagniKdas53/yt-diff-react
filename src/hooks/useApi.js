import { useContext, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { NotificationContext } from "../contexts/NotificationContext";

export function useApi() {
  const { token, logout } = useContext(AuthContext);
  const { notify } = useContext(NotificationContext);

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set("Accept", "application/json");
      headers.set("Content-Type", "application/json");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          mode: "cors",
        });

        if (response.status === 401) {
          notify("Session expired. Please log in again.", "error");
          logout();
        }

        return response;
      } catch (error) {
        notify(`Network error: ${error.message}`, "error");
        throw error;
      }
    },
    [token, logout, notify],
  );

  return apiFetch;
}
