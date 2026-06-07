import { createContext, useState } from "react";
import PropTypes from "prop-types";

export const AuthContext = createContext({
  token: null,
  setToken: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const getStoredToken = () => {
    const stored = localStorage.getItem("ytdiff_token");
    return stored && stored !== "null" ? stored : null;
  };

  const [token, setTokenState] = useState(getStoredToken);

  const setToken = (newToken) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("ytdiff_token", newToken);
    } else {
      localStorage.removeItem("ytdiff_token");
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
