import { createContext, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

export const AuthContext = createContext({
  token: null,
  setToken: () => {},
  logout: () => {},
});

const getStoredToken = () => {
  const stored = localStorage.getItem("ytdiff_token");
  return stored && stored !== "null" ? stored : null;
};

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(getStoredToken);

  /**
   * Sets the live token. `persist: false` keeps it in memory only, which is
   * what an unticked "remember me" means: the session ends with the tab.
   *
   * Memoised, because `apiFetch` and every effect that depends on it key off
   * the identity of these functions.
   */
  const setToken = useCallback((newToken, { persist = true } = {}) => {
    setTokenState(newToken);
    if (newToken && persist) {
      localStorage.setItem("ytdiff_token", newToken);
    } else {
      localStorage.removeItem("ytdiff_token");
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ token, setToken, logout }),
    [token, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
