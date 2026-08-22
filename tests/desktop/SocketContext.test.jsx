import React, { useContext } from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";

const sockets = [];

vi.mock("socket.io-client", () => ({
  default: vi.fn((base, options) => {
    const sock = {
      base,
      options,
      connected: true,
      disconnect: vi.fn(() => {
        sock.connected = false;
        return sock;
      }),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };
    sockets.push(sock);
    return sock;
  }),
}));

import {
  SocketContext,
  SocketProvider,
} from "../../src/contexts/SocketContext";
import { AuthContext } from "../../src/contexts/AuthContext";

/** Surfaces the socket the provider is currently handing out. */
function Probe() {
  const { socket } = useContext(SocketContext);
  return (
    <span data-testid="socket">
      {socket === null || socket === undefined
        ? "none"
        : String(socket.options.auth.token)}
    </span>
  );
}

/** Drives the provider by the one input it keys on: the auth token. */
function renderWithToken(token) {
  const auth = { token, expiresAt: null, setToken: () => {}, logout: () => {} };
  return render(
    <AuthContext.Provider value={auth}>
      <SocketProvider>
        <Probe />
      </SocketProvider>
    </AuthContext.Provider>,
  );
}

describe("SocketContext (Desktop)", () => {
  beforeEach(() => {
    sockets.length = 0;
  });

  test("connects once a token is present", () => {
    renderWithToken("t_one");
    expect(sockets).toHaveLength(1);
    expect(sockets[0].options.auth).toEqual({ token: "t_one" });
    expect(screen.getByTestId("socket")).toHaveTextContent("t_one");
  });

  test("opens no connection without a token", () => {
    renderWithToken(null);
    expect(sockets).toHaveLength(0);
    expect(screen.getByTestId("socket")).toHaveTextContent("none");
  });

  test("logging out disconnects rather than dropping the socket", () => {
    // F3: the connection used to be built in a `useMemo`, so `setToken(null)`
    // only made the memo return null. The socket object was dropped while its
    // connection stayed open and authenticated — a signed-out session still
    // receiving events until its token expired, one leaked per logout.
    const { rerender } = renderWithToken("t_one");
    const [first] = sockets;
    expect(first.disconnect).not.toHaveBeenCalled();

    const loggedOut = {
      token: null,
      expiresAt: null,
      setToken: () => {},
      logout: () => {},
    };
    act(() => {
      rerender(
        <AuthContext.Provider value={loggedOut}>
          <SocketProvider>
            <Probe />
          </SocketProvider>
        </AuthContext.Provider>,
      );
    });

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(first.connected).toBe(false);
    expect(sockets).toHaveLength(1);
    expect(screen.getByTestId("socket")).toHaveTextContent("none");
  });

  test("a new token disconnects the old connection before using the new one", () => {
    const { rerender } = renderWithToken("t_one");
    const renewed = {
      token: "t_two",
      expiresAt: null,
      setToken: () => {},
      logout: () => {},
    };
    act(() => {
      rerender(
        <AuthContext.Provider value={renewed}>
          <SocketProvider>
            <Probe />
          </SocketProvider>
        </AuthContext.Provider>,
      );
    });

    expect(sockets).toHaveLength(2);
    expect(sockets[0].disconnect).toHaveBeenCalledTimes(1);
    expect(sockets[1].disconnect).not.toHaveBeenCalled();
    expect(screen.getByTestId("socket")).toHaveTextContent("t_two");
  });

  test("unmounting disconnects", () => {
    const { unmount } = renderWithToken("t_one");
    const [first] = sockets;
    act(() => {
      unmount();
    });
    expect(first.disconnect).toHaveBeenCalledTimes(1);
  });
});
