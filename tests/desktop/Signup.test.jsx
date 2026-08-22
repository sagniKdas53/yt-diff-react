import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Signup from "../../src/components/Signup.jsx";
import { makeContexts, mockResponse, renderWithContexts } from "../contextHarness.jsx";

describe("Signup Component (Desktop)", () => {
  const defaultProps = {
    height: "500px",
    toggleSignUpComponent: vi.fn(),
  };

  let contexts;

  const renderSignup = () =>
    renderWithContexts(<Signup {...defaultProps} />, { contexts });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    contexts = makeContexts({ auth: { token: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders sign up form elements", () => {
    renderSignup();

    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  test("shows error snack if username or password is empty on submit", async () => {
    renderSignup();

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    fireEvent.click(signUpButton);

    expect(contexts.notification.setSnack).toHaveBeenCalledWith(
      "Username or password is empty",
      "error"
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("toggles password visibility", () => {
    renderSignup();

    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByLabelText("toggle password visibility");
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  test("submits form and toggles component on successful signup", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ status: "success" })));

    renderSignup();

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
      expect(contexts.notification.setSnack).toHaveBeenCalledWith(
        "Account successfully created.",
        "success"
      );
      expect(defaultProps.toggleSignUpComponent).toHaveBeenCalledWith(false);
    });
  });

  test("displays server error message on failed registration", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse(({ message: "Username already exists" }), { ok: false }));

    renderSignup();

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const signUpButton = screen.getByRole("button", { name: "Sign Up" });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(contexts.notification.setSnack).toHaveBeenCalledWith(
        "Username already exists",
        "error"
      );
    });
  });
});
