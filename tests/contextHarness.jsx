import { vi } from "vitest";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render } from "@testing-library/react";

import { AuthContext } from "../src/contexts/AuthContext";
import { NotificationContext } from "../src/contexts/NotificationContext";
import { SocketContext } from "../src/contexts/SocketContext";
import { DownloadContext } from "../src/contexts/DownloadContext";

/**
 * Builds a set of context values with vi.fn() in every slot, so a test can
 * assert on the calls a component makes the way it used to assert on props.
 *
 * Pass overrides per context, e.g. makeContexts({ auth: { token: null } }).
 */
export function makeContexts(overrides = {}) {
  return {
    auth: {
      token: "mock_token",
      setToken: vi.fn(),
      logout: vi.fn(),
      ...overrides.auth,
    },
    notification: {
      snackMsg: "",
      snackSeverity: "success",
      showSnackbar: false,
      setSnackVisibility: vi.fn(),
      notifications: [],
      setSnack: vi.fn(),
      addNotification: vi.fn(),
      notify: vi.fn(),
      dismissNotification: vi.fn(),
      ...overrides.notification,
    },
    socket: {
      socket: null,
      connectionId: "",
      setConnectionId: vi.fn(),
      ...overrides.socket,
    },
    download: {
      activeDownloads: {},
      queuedItems: {},
      queueDownloads: vi.fn().mockResolvedValue([]),
      addToDownloadQueue: vi.fn(),
      rollbackDownloadQueueRequest: vi.fn(),
      removeFromQueueAndRenumber: vi.fn(),
      setQueuePosition: vi.fn(),
      updateActiveDownloads: vi.fn(),
      removeActiveDownload: vi.fn(),
      clearDownloadState: vi.fn(),
      syncQueueFromBackend: vi.fn().mockResolvedValue(null),
      ...overrides.download,
    },
  };
}

/** Wraps `children` in the four contexts plus a MUI theme. */
export function ContextHarness({ contexts, theme = createTheme(), children }) {
  return (
    <AuthContext.Provider value={contexts.auth}>
      <NotificationContext.Provider value={contexts.notification}>
        <SocketContext.Provider value={contexts.socket}>
          <DownloadContext.Provider value={contexts.download}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
          </DownloadContext.Provider>
        </SocketContext.Provider>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * Renders `ui` inside the harness and hands back the contexts it was given, so
 * assertions can reach the spies.
 */
export function renderWithContexts(ui, { contexts = makeContexts(), theme } = {}) {
  const result = render(
    <ContextHarness contexts={contexts} theme={theme}>
      {ui}
    </ContextHarness>,
  );
  return { ...result, contexts };
}
