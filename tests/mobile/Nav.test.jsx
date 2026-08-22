import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import Navigation from "../../src/components/Nav.jsx";
import { makeContexts, renderWithContexts } from "../contextHarness.jsx";

describe("Nav Component (Mobile)", () => {
  const defaultProps = {
    themeSwitcher: vi.fn(),
    theme: true, // light
    setPlayListUrl: vi.fn(),
  };

  let contexts;

  const renderNav = () =>
    renderWithContexts(<Navigation {...defaultProps} />, { contexts });

  beforeEach(() => {
    vi.clearAllMocks();
    contexts = makeContexts({
      socket: { connectionId: "socket_conn_1" },
      notification: {
        notifications: [
          { id: "note_1", message: "Success Notification 1", type: "success" },
          { id: "note_2", message: "Error Notification 2", type: "error" },
          { id: "note_3", message: "Info Notification 3", type: "info" },
        ],
      },
    });
  });

  test("opens notifications drawer on mobile and displays notifications log", () => {
    renderNav();

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
    renderNav();

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
    renderNav();

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /Connected/i }));

    // Dismiss button for the first item
    const deleteBtns = screen.getAllByRole("button", { name: "delete" });
    expect(deleteBtns.length).toBe(3);

    fireEvent.click(deleteBtns[0]);
    expect(contexts.notification.dismissNotification).toHaveBeenCalledWith("note_1");
  });

  test("dismisses all notifications when clicking clear all", () => {
    renderNav();

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: /Connected/i }));

    const clearAllBtn = screen.getByRole("button", { name: "clear all" });
    fireEvent.click(clearAllBtn);

    // Should call onDismissNotification for each item
    expect(contexts.notification.dismissNotification).toHaveBeenCalledTimes(3);
    expect(contexts.notification.dismissNotification).toHaveBeenNthCalledWith(1, "note_1");
    expect(contexts.notification.dismissNotification).toHaveBeenNthCalledWith(2, "note_2");
    expect(contexts.notification.dismissNotification).toHaveBeenNthCalledWith(3, "note_3");
  });
});
