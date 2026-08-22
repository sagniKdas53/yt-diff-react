import { vi } from "vitest";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render } from "@testing-library/react";

import { AuthContext } from "../src/contexts/AuthContext";
import { NotificationContext } from "../src/contexts/NotificationContext";
import { SocketContext } from "../src/contexts/SocketContext";
import { DownloadContext } from "../src/contexts/DownloadContext";

/**
 * A stand-in for a `fetch` Response, with every reader a real one has.
 *
 * Mocks used to be written out by hand per test, each supplying only the
 * reader the component under test happened to call -- some `json`, some
 * `text`, and none of them `status`. That made a mock's shape a statement
 * about the component's internals, so moving a call onto the shared API client
 * broke tests that were not testing anything about the change.
 *
 * @param body - Parsed to JSON for `json()`, serialized for `text()`.
 * @param init - `ok` defaults to true; `status` follows it unless given.
 */
export function mockResponse(body, { ok = true, status, statusText = "" } = {}) {
  const serialized = JSON.stringify(body ?? null);
  return {
    ok,
    status: status ?? (ok ? 200 : 500),
    statusText,
    json: async () => JSON.parse(serialized),
    text: async () => serialized,
  };
}

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
