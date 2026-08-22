import React, { useContext } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";
import { AuthContext, AuthProvider } from "../../src/contexts/AuthContext";

/** Surfaces the context so the test can read the token and drive the setters. */
function Probe() {
  const { token, expiresAt, setToken, logout } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="token">{token === null ? "none" : token}</span>
      <span data-testid="expiresAt">
        {expiresAt === null ? "none" : String(expiresAt)}
      </span>
      <button onClick={() => setToken("t_persisted")}>persist</button>
      <button onClick={() => setToken("t_session", { persist: false })}>
        session only
      </button>
      <button
        onClick={() => setToken("t_dated", { expiresAt: 1893456000 })}
      >
        with expiry
      </button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe("AuthContext (Desktop)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("reads the stored token on mount", () => {
    localStorage.setItem("ytdiff_token", "stored_token");
    renderProvider();
    expect(screen.getByTestId("token")).toHaveTextContent("stored_token");
  });

  test('clears the legacy "null" sentinel instead of reading around it', () => {
    // Builds before the provider refactor wrote the string on expiry. A
    // browser still holding one must come up logged out -- and must not still
    // be holding it afterwards, or every reader has to keep knowing about it.
    localStorage.setItem("ytdiff_token", "null");
    localStorage.setItem("ytdiff_token_expires_at", "1893456000");
    renderProvider();

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(localStorage.getItem("ytdiff_token")).toBeNull();
    expect(localStorage.getItem("ytdiff_token_expires_at")).toBeNull();
  });

  test("persists the token by default", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "persist" }));

    expect(screen.getByTestId("token")).toHaveTextContent("t_persisted");
    expect(localStorage.getItem("ytdiff_token")).toBe("t_persisted");
  });

  test("keeps the token out of storage when persist is false", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "session only" }));

    expect(screen.getByTestId("token")).toHaveTextContent("t_session");
    expect(localStorage.getItem("ytdiff_token")).toBeNull();
  });

  test("logout clears both the live token and the stored one", () => {
    localStorage.setItem("ytdiff_token", "stored_token");
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(localStorage.getItem("ytdiff_token")).toBeNull();
  });

  test("stores the expiry alongside the token", () => {
    renderProvider();
    fireEvent.click(screen.getByText("with expiry"));

    expect(screen.getByTestId("expiresAt")).toHaveTextContent("1893456000");
    expect(localStorage.getItem("ytdiff_token_expires_at")).toBe("1893456000");
  });

  test("reads a stored expiry back on mount", () => {
    localStorage.setItem("ytdiff_token", "stored_token");
    localStorage.setItem("ytdiff_token_expires_at", "1893456000");
    renderProvider();

    expect(screen.getByTestId("expiresAt")).toHaveTextContent("1893456000");
  });

  test("ignores a corrupt stored expiry rather than scheduling off it", () => {
    // A NaN here would make the renewal maths produce NaN and the timer fire
    // immediately, in a loop.
    localStorage.setItem("ytdiff_token", "stored_token");
    localStorage.setItem("ytdiff_token_expires_at", "not-a-number");
    renderProvider();

    expect(screen.getByTestId("expiresAt")).toHaveTextContent("none");
  });

  test("a token stored with no expiry leaves no stale one behind", () => {
    localStorage.setItem("ytdiff_token_expires_at", "1893456000");
    renderProvider();
    fireEvent.click(screen.getByText("persist"));

    // The new token has no expiry; the previous token's must not be reused
    // for it.
    expect(localStorage.getItem("ytdiff_token_expires_at")).toBeNull();
    expect(screen.getByTestId("expiresAt")).toHaveTextContent("none");
  });

  test("logout clears the expiry too", () => {
    renderProvider();
    fireEvent.click(screen.getByText("with expiry"));
    fireEvent.click(screen.getByText("logout"));

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(screen.getByTestId("expiresAt")).toHaveTextContent("none");
    expect(localStorage.getItem("ytdiff_token_expires_at")).toBeNull();
  });
});
