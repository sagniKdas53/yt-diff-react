import { createContext, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

export const AuthContext = createContext({
  token: null,
  expiresAt: null,
  setToken: () => {},
  logout: () => {},
});

const TOKEN_KEY = "ytdiff_token";
const EXPIRY_KEY = "ytdiff_token_expires_at";

const getStoredToken = () => {
  const stored = localStorage.getItem(TOKEN_KEY);
  // The `"null"` guard is for tokens written by builds before the provider
  // refactor, which stored the string instead of removing the key. Nothing
  // writes it any more; this only has to outlive the browsers still holding
  // one.
  return stored && stored !== "null" ? stored : null;
};

const getStoredExpiry = () => {
  const stored = Number(localStorage.getItem(EXPIRY_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : null;
};

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(getStoredToken);
  // Epoch *seconds*, as the server sends it — the `exp` claim of the live
  // token. Kept beside the token so a reload can schedule the next renewal
  // without waiting for a round trip.
  const [expiresAt, setExpiresAt] = useState(getStoredExpiry);

  /**
   * Sets the live token. `persist: false` keeps it in memory only, which is
   * what an unticked "remember me" means: the session ends with the tab.
   *
   * `expiresAt` travels with the token because they are one fact: a token
   * stored without its expiry cannot be renewed on schedule, and an expiry
   * left behind by a replaced token schedules the wrong renewal.
   *
   * Memoised, because `apiFetch` and every effect that depends on it key off
   * the identity of these functions.
   */
  const setToken = useCallback((newToken, { persist = true, expiresAt: nextExpiry = null } = {}) => {
    setTokenState(newToken);
    setExpiresAt(newToken ? nextExpiry : null);

    if (newToken && persist) {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (nextExpiry) {
        localStorage.setItem(EXPIRY_KEY, String(nextExpiry));
      } else {
        localStorage.removeItem(EXPIRY_KEY);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ token, expiresAt, setToken, logout }),
    [token, expiresAt, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
