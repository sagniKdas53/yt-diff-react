import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthContext } from "../../src/contexts/AuthContext";
import { NotificationContext } from "../../src/contexts/NotificationContext";
import { useTokenRefresh } from "../../src/hooks/useTokenRefresh";

function Harness() {
  useTokenRefresh();
  return null;
}

/** Epoch seconds, `secs` from now — the shape the server sends. */
const expiryIn = (secs) => Math.floor(Date.now() / 1000) + secs;

let auth;
let setVisibility;

function renderRefresher({ token = "live_token", expiresAt = expiryIn(3600) } = {}) {
  auth = {
    token,
    expiresAt,
    setToken: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <NotificationContext.Provider value={{ notify: vi.fn() }}>
        <Harness />
      </NotificationContext.Provider>
    </AuthContext.Provider>,
  );
}

function mockRefreshResponse(body, ok = true) {
  globalThis.fetch.mockResolvedValueOnce({ ok, status: ok ? 200 : 401, json: async () => body });
}

describe("useTokenRefresh (Desktop)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    globalThis.fetch = vi.fn();
    setVisibility = (state) => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("does not schedule anything without a token", () => {
    renderRefresher({ token: null, expiresAt: null });
    act(() => {
      vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("renews at the halfway mark, not at expiry", async () => {
    // An hour-long token renews around the 30-minute mark. Renewing at expiry
    // would leave no room for a failed attempt.
    renderRefresher({ expiresAt: expiryIn(3600) });
    mockRefreshResponse({ token: "renewed", expiresAt: expiryIn(7200) });

    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      "http://localhost:8888/ytdiff/refresh",
    );
    // A body, not nothing: the server rejects an empty body with a 400 before
    // the refresh handler ever runs.
    expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({
      method: "post",
      body: "{}",
    });
  });

  test("stores the renewed token with its new expiry", async () => {
    localStorage.setItem("ytdiff_token", "live_token");
    renderRefresher({ expiresAt: expiryIn(3600) });
    const nextExpiry = expiryIn(7200);
    mockRefreshResponse({ token: "renewed", expiresAt: nextExpiry });

    await act(async () => {
      vi.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() =>
      expect(auth.setToken).toHaveBeenCalledWith("renewed", {
        persist: true,
        expiresAt: nextExpiry,
      }),
    );
  });

  test("a memory-only session is not promoted to a persisted one", async () => {
    // "Remember me" was unticked, so the token is not in localStorage. The
    // renewal must not put it there.
    renderRefresher({ expiresAt: expiryIn(3600) });
    mockRefreshResponse({ token: "renewed", expiresAt: expiryIn(7200) });

    await act(async () => {
      vi.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() =>
      expect(auth.setToken).toHaveBeenCalledWith(
        "renewed",
        expect.objectContaining({ persist: false }),
      ),
    );
  });

  test("renews on wake when the timer was missed", async () => {
    // A backgrounded tab or a sleeping laptop: the token is already past its
    // halfway mark when the tab comes back, and the timer that should have
    // fired did not. Waiting for it would let the session die.
    renderRefresher({ expiresAt: expiryIn(60) });
    mockRefreshResponse({ token: "renewed", expiresAt: expiryIn(3600) });

    await act(async () => {
      vi.advanceTimersByTime(45 * 1000);
      setVisibility("visible");
    });

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  test("a visibilitychange to hidden does not renew", async () => {
    // Only a wake counts. A tab being backgrounded fires the same event, and
    // acting on it would renew on every tab switch.
    renderRefresher({ expiresAt: expiryIn(3600) });
    await act(async () => {
      setVisibility("hidden");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("waking early reschedules instead of renewing", async () => {
    renderRefresher({ expiresAt: expiryIn(3600) });
    await act(async () => {
      setVisibility("visible");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("a failed renewal leaves the existing token alone", async () => {
    // Offline, or the server is down. The token in hand is still valid; the
    // next trigger tries again. Clearing it here would log the user out for a
    // transient network blip.
    renderRefresher({ expiresAt: expiryIn(3600) });
    globalThis.fetch.mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      vi.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(auth.setToken).not.toHaveBeenCalled();
  });

  test("a 401 does not store a token", async () => {
    // apiFetch owns the logout on 401; this hook must not also act on it.
    renderRefresher({ expiresAt: expiryIn(3600) });
    mockRefreshResponse({ status: "error" }, false);

    await act(async () => {
      vi.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(auth.setToken).not.toHaveBeenCalled();
  });

  test("falls back to an hourly check when the server sent no expiry", async () => {
    renderRefresher({ expiresAt: null });
    mockRefreshResponse({ token: "renewed", expiresAt: expiryIn(3600) });

    act(() => {
      vi.advanceTimersByTime(59 * 60 * 1000);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  test("stops renewing after logout", async () => {
    const { rerender } = renderRefresher({ expiresAt: expiryIn(3600) });

    rerender(
      <AuthContext.Provider
        value={{ ...auth, token: null, expiresAt: null }}
      >
        <NotificationContext.Provider value={{ notify: vi.fn() }}>
          <Harness />
        </NotificationContext.Provider>
      </AuthContext.Provider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
