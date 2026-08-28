import PropTypes from "prop-types";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { DownloadProvider } from "./contexts/DownloadContext";
import { useTokenRefresh } from "./hooks/useTokenRefresh.js";
import { RouterProvider } from "./router/RouterProvider.jsx";

/**
 * Runs the token renewal loop. A component rather than a call inside
 * `AuthProvider` because renewal goes through `apiFetch`, which needs both
 * Auth and Notification in scope — and Auth sits above Notification, so it
 * cannot consume it itself.
 *
 * Renders nothing.
 */
function TokenRefresher() {
  useTokenRefresh();
  return null;
}

/**
 * The application's context stack, in dependency order.
 *
 * The router is outermost because it depends on nothing — it reads the
 * address bar — while what the app shows depends on it. Auth comes next
 * because the socket connects with the token and every request signs with it;
 * notifications sit above the download queue because queueing reports its own
 * outcome.
 */
export default function AppProviders({ children }) {
  return (
    <RouterProvider>
      <AuthProvider>
        <NotificationProvider>
          <TokenRefresher />
          <SocketProvider>
            <DownloadProvider>{children}</DownloadProvider>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

AppProviders.propTypes = {
  children: PropTypes.node.isRequired,
};
