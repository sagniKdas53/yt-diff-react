import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Login from "../../src/components/Login.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("Login Component (Desktop)", () => {
  const theme = createTheme();
  const defaultProps = {
    backEnd: "http://localhost:8888/ytdiff",
    setToken: vi.fn(),
    setSnack: vi.fn(),
    height: "500px",
    toggleSignUpComponent: vi.fn(),
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("checks if registration is allowed on mount and renders Sign Up button if true", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Login {...defaultProps} />
      </ThemeProvider>
    );

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

    render(
      <ThemeProvider theme={theme}>
        <Login {...defaultProps} />
      </ThemeProvider>
    );

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

    render(
      <ThemeProvider theme={theme}>
        <Login {...defaultProps} />
      </ThemeProvider>
    );

    const loginButton = screen.getByRole("button", { name: "Login" });
    fireEvent.click(loginButton);

    expect(defaultProps.setSnack).toHaveBeenCalledWith(
      "Username or password is empty",
      "error"
    );
  });

  test("submits login and saves token without rememberMe by default", async () => {
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

    render(
      <ThemeProvider theme={theme}>
        <Login {...defaultProps} />
      </ThemeProvider>
    );

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
      expect(defaultProps.setToken).toHaveBeenCalledWith("mock_token");
      expect(localStorage.getItem("ytdiff_token")).toBeNull();
    });
  });

  test("saves token in localstorage if rememberMe is checked", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registrationAllowed: true }),
    });

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock_token_remembered" }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Login {...defaultProps} />
      </ThemeProvider>
    );

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
      expect(defaultProps.setToken).toHaveBeenCalledWith("mock_token_remembered");
      expect(localStorage.getItem("ytdiff_token")).toBe("mock_token_remembered");
    });
  });
});
