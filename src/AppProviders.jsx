import PropTypes from "prop-types";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { DownloadProvider } from "./contexts/DownloadContext";

/**
 * The application's context stack, in dependency order.
 *
 * Auth is outermost because the socket connects with the token and every
 * request signs with it; notifications sit above the download queue because
 * queueing reports its own outcome.
 */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <DownloadProvider>{children}</DownloadProvider>
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

AppProviders.propTypes = {
  children: PropTypes.node.isRequired,
};
