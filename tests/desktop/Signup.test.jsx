import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Signup from "../../src/components/Signup.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("Signup Component (Desktop)", () => {
  const theme = createTheme();
  const defaultProps = {
    backEnd: "http://localhost:8888/ytdiff",
    setSnack: vi.fn(),
    height: "500px",
    toggleSignUpComponent: vi.fn(),
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders sign up form elements", () => {
    render(
      <ThemeProvider theme={theme}>
        <Signup {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  test("shows error snack if username or password is empty on submit", async () => {
    render(
      <ThemeProvider theme={theme}>
        <Signup {...defaultProps} />
      </ThemeProvider>
    );

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    fireEvent.click(signUpButton);

    expect(defaultProps.setSnack).toHaveBeenCalledWith(
      "Username or password is empty",
      "error"
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("toggles password visibility", () => {
    render(
      <ThemeProvider theme={theme}>
        <Signup {...defaultProps} />
      </ThemeProvider>
    );

    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByLabelText("toggle password visibility");
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  test("submits form and toggles component on successful signup", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success" }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Signup {...defaultProps} />
      </ThemeProvider>
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const signUpButton = screen.getByRole("button", { name: "Sign Up" });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(signUpButton);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/ytdiff/register",
      expect.objectContaining({
        method: "post",
        body: JSON.stringify({ username: "testuser", password: "password123" }),
      })
    );

    await waitFor(() => {
      expect(defaultProps.setSnack).toHaveBeenCalledWith(
        "Account successfully created.",
        "success"
      );
      expect(defaultProps.toggleSignUpComponent).toHaveBeenCalledWith(false);
    });
  });

  test("displays server error message on failed registration", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Username already exists" }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Signup {...defaultProps} />
      </ThemeProvider>
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const signUpButton = screen.getByRole("button", { name: "Sign Up" });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(defaultProps.setSnack).toHaveBeenCalledWith(
        "Username already exists",
        "error"
      );
    });
  });
});
