import React, { useContext } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";
import { AuthContext, AuthProvider } from "../../src/contexts/AuthContext";

/** Surfaces the context so the test can read the token and drive the setters. */
function Probe() {
  const { token, setToken, logout } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="token">{token === null ? "none" : token}</span>
      <button onClick={() => setToken("t_persisted")}>persist</button>
      <button onClick={() => setToken("t_session", { persist: false })}>
        session only
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

  test('treats the literal string "null" as no token', () => {
    localStorage.setItem("ytdiff_token", "null");
    renderProvider();
    expect(screen.getByTestId("token")).toHaveTextContent("none");
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
});
