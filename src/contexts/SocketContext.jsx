import { createContext, useMemo, useContext } from "react";
import { AuthContext } from "./AuthContext";
import io from "socket.io-client";
import PropTypes from "prop-types";

export const SocketContext = createContext({ socket: null });

const base = import.meta.env.PROD ? "" : "http://localhost:8888";
const path = import.meta.env.VITE_BASE_PATH || "/ytdiff";

export const SocketProvider = ({ children }) => {
  const { token } = useContext(AuthContext);

  const socket = useMemo(() => {
    if (!token) return null;
    const sock = io(base, {
      path: path + "/socket.io",
      auth: { token },
      forceNew: true,
    });
    return sock;
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
