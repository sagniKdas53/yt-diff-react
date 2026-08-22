import { createContext, useMemo, useState, useContext } from "react";
import { AuthContext } from "./AuthContext";
import io from "socket.io-client";
import PropTypes from "prop-types";
import { socketPath } from "../config.js";

export const SocketContext = createContext({
  socket: null,
  connectionId: "",
  setConnectionId: () => {},
});

const base = import.meta.env.PROD ? "" : "http://localhost:8888";

export const SocketProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  // Assigned from the backend's "init" frame; the Nav shows it.
  const [connectionId, setConnectionId] = useState("");

  const socket = useMemo(() => {
    if (!token) return null;
    return io(base, {
      path: socketPath,
      auth: { token },
      forceNew: true,
    });
  }, [token]);

  const value = useMemo(
    () => ({ socket, connectionId, setConnectionId }),
    [socket, connectionId],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
