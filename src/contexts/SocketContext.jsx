import { createContext, useEffect, useMemo, useState, useContext } from "react";
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
  const [socket, setSocket] = useState(null);

  // Opening a connection is a side effect, not a computation. This lived in a
  // `useMemo` keyed on `token`, which meant logging out only made the memo
  // return null — the old socket was dropped on the floor with its connection
  // still open and still authenticated. The server had no reason to close it,
  // so it survived until its token expired or the process restarted, and every
  // login/logout cycle leaked one more signed-out session still receiving
  // events.
  useEffect(() => {
    // No token means no connection; the previous effect's cleanup has already
    // cleared whatever was there.
    if (!token) return undefined;

    const sock = io(base, {
      path: socketPath,
      auth: { token },
      forceNew: true,
    });
    // The rule's own carve-out: this effect subscribes to an external system,
    // and the object children need in order to talk to it only exists once the
    // effect has run. The cost is one extra render per token change, which is
    // the price of the cleanup below actually running.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(sock);

    return () => {
      sock.disconnect();
      setSocket((current) => (current === sock ? null : current));
    };
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
