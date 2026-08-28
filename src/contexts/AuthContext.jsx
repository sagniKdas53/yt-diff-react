import { createContext, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

/**
 * The shape `useContext(AuthContext)` returns.
 *
 * Declared for the same reason `NotificationContext` declares one: without a
 * type here, each zero-arg arrow in the default value is what every consumer's
 * call is checked against, so `setToken(token, {persist})` reads as passing
 * two arguments to a function that takes none.
 *
 * @typedef {Object} AuthContextValue
 * @property {string | null} token - The live bearer token, if any.
 * @property {number | null} expiresAt - The token's `exp` claim, in seconds.
 * @property {(token: string | null, options?: {persist?: boolean, expiresAt?: number | null}) => void} setToken
 *   Installs or clears the session. `persist` decides whether it outlives the
 *   tab; clearing ignores both options.
 * @property {() => void} logout - Clears the session.
 */

/** @type {AuthContextValue} */
const defaultValue = {
  token: null,
  expiresAt: null,
  setToken: () => {},
  logout: () => {},
};

export const AuthContext = createContext(defaultValue);

const TOKEN_KEY = "ytdiff_token";
const EXPIRY_KEY = "ytdiff_token_expires_at";

/**
 * Retires the sentinel builds before the provider refactor wrote.
 *
 * Those builds recorded an expired session as the *string* `"null"` rather
 * than removing the key, so every reader had to know about it. Nothing writes
 * it any more, but a browser that has not loaded a newer build since still
 * holds one — so it is deleted here rather than guarded against on every read.
 *
 * Runs once per provider mount, which is the first moment storage is looked
 * at. Once a browser has been through it there is nothing left to find, and
 * the whole function can go.
 */
const clearLegacyTokenSentinel = () => {
  if (localStorage.getItem(TOKEN_KEY) === "null") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }
};

const getStoredToken = () => {
  clearLegacyTokenSentinel();
  return localStorage.getItem(TOKEN_KEY) || null;
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
  const setToken = useCallback(
    (newToken, { persist = true, expiresAt: nextExpiry = null } = {}) => {
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
    },
    [],
  );

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
