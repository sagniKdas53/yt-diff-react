import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Login from "../../src/components/Login.jsx";
import { makeContexts, renderWithContexts } from "../contextHarness.jsx";

describe("Login Component (Desktop)", () => {
  const defaultProps = {
    height: "500px",
    toggleSignUpComponent: vi.fn(),
  };

  let contexts;

  // Logging in happens with no token, which is also what tells apiFetch that a
  // 401 is a bad password rather than an expired session.
  const renderLogin = () =>
    renderWithContexts(<Login {...defaultProps} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
    contexts = makeContexts({ auth: { token: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("checks if registration is allowed on mount and renders Sign Up button if true", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    renderLogin();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/isregallowed",
      expect.objectContaining({ method: "post" })
    );

    const signUpButton = await screen.findByRole("button", { name: "Sign Up" });
    expect(signUpButton).toBeInTheDocument();
  });

  test("checks if registration is allowed on mount and hides Sign Up button if false", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: false }),
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Sign Up" })).not.toBeInTheDocument();
    });
  });

  test("shows error snack if username or password is empty on submit", async () => {
    // Mock isregallowed first
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    renderLogin();

    const loginButton = screen.getByRole("button", { name: "Login" });
    fireEvent.click(loginButton);

    expect(contexts.notification.setSnack).toHaveBeenCalledWith(
      "Username or password is empty",
      "error"
    );
  });

  test("submits login and does not persist the token without rememberMe", async () => {
    // 1st fetch: reg check on mount
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    // 2nd fetch: login submit
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock_token" }),
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const loginButton = screen.getByRole("button", { name: "Login" });

    fireEvent.change(usernameInput, { target: { value: "myuser" } });
    fireEvent.change(passwordInput, { target: { value: "mypass" } });
    fireEvent.click(loginButton);

    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "http://localhost:8888/ytdiff/login",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({ username: "myuser", password: "mypass" }),
      })
    );

    await waitFor(() => {
      // expiresAt is null when the server did not send one — an older backend,
      // or a token with no exp claim. The renewal loop falls back to a fixed
      // interval rather than guessing a lifetime.
      expect(contexts.auth.setToken).toHaveBeenCalledWith("mock_token", {
        persist: false,
        expiresAt: null,
      });
    });
  });

  test("asks for the token to be persisted if rememberMe is checked", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock_token_remembered",
        expiresAt: 1893456000,
      }),
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const rememberMeCheckbox = screen.getByLabelText("Remember me");
    const loginButton = screen.getByRole("button", { name: "Login" });

    fireEvent.change(usernameInput, { target: { value: "myuser" } });
    fireEvent.change(passwordInput, { target: { value: "mypass" } });
    
    // Toggle rememberMe
    fireEvent.click(rememberMeCheckbox);
    fireEvent.click(loginButton);

    await waitFor(() => {
      // The server's own exp claim is handed straight to AuthContext; the
      // client never decodes the JWT to find it.
      expect(contexts.auth.setToken).toHaveBeenCalledWith(
        "mock_token_remembered",
        { persist: true, expiresAt: 1893456000 },
      );
    });
  });
});
