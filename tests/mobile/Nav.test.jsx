import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import Navigation from "../../src/components/Nav.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("Nav Component (Mobile)", () => {
  const theme = createTheme();

  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  const defaultProps = {
    themeSwitcher: vi.fn(),
    theme: true, // light
    connectionId: "socket_conn_1",
    setPlayListUrl: vi.fn(),
    token: "mock_token",
    setToken: vi.fn(),
    setConnectionId: vi.fn(),
    notifications: [
      { id: "note_1", message: "Success Notification 1", type: "success" },
      { id: "note_2", message: "Error Notification 2", type: "error" },
      { id: "note_3", message: "Info Notification 3", type: "info" },
    ],
    onDismissNotification: vi.fn(),
    backEnd: "http://localhost:8888/ytdiff",
    setSnack: vi.fn(),
    addNotification: vi.fn(),
  };

  test("opens notifications drawer on mobile and displays notifications log", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    // Click on Connection status button to open notifications drawer
    // The button has the LeakAddIcon (connectionId is present)
    const connBtn = screen.getByRole("button", { name: /Connected/i });
    expect(connBtn).toBeInTheDocument();
    
    fireEvent.click(connBtn);

    // Notification Drawer title
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    
    // Shows notifications
    expect(screen.getByText("Success Notification 1")).toBeInTheDocument();
    expect(screen.getByText("Error Notification 2")).toBeInTheDocument();
    expect(screen.getByText("Info Notification 3")).toBeInTheDocument();
  });

  test("filters notifications inside the drawer", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /Connected/i }));

    // Click "Success" toggle filter
    const successToggle = screen.getByRole("button", { name: "success" });
    fireEvent.click(successToggle);

    // Success notification should be visible, error and info should be hidden/removed
    expect(screen.getByText("Success Notification 1")).toBeInTheDocument();
    expect(screen.queryByText("Error Notification 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Info Notification 3")).not.toBeInTheDocument();

    // Click "Error" toggle filter
    const errorToggle = screen.getByRole("button", { name: "error" });
    fireEvent.click(errorToggle);

    expect(screen.queryByText("Success Notification 1")).not.toBeInTheDocument();
    expect(screen.getByText("Error Notification 2")).toBeInTheDocument();
    expect(screen.queryByText("Info Notification 3")).not.toBeInTheDocument();
  });

  test("dismisses individual notification when clicking delete", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /Connected/i }));

    // Dismiss button for the first item
    const deleteBtns = screen.getAllByRole("button", { name: "delete" });
    expect(deleteBtns.length).toBe(3);

    fireEvent.click(deleteBtns[0]);
    expect(defaultProps.onDismissNotification).toHaveBeenCalledWith("note_1");
  });

  test("dismisses all notifications when clicking clear all", () => {
    render(
      <ThemeProvider theme={theme}>
        <Navigation {...defaultProps} />
      </ThemeProvider>
    );

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /Connected/i }));

    const clearAllBtn = screen.getByRole("button", { name: "clear all" });
    fireEvent.click(clearAllBtn);

    // Should call onDismissNotification for each item
    expect(defaultProps.onDismissNotification).toHaveBeenCalledTimes(3);
    expect(defaultProps.onDismissNotification).toHaveBeenNthCalledWith(1, "note_1");
    expect(defaultProps.onDismissNotification).toHaveBeenNthCalledWith(2, "note_2");
    expect(defaultProps.onDismissNotification).toHaveBeenNthCalledWith(3, "note_3");
  });
});
