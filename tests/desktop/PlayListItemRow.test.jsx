import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import PlayListItemRow from "../../src/components/PlayListItemRow.jsx";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("PlayListItemRow Component (Desktop)", () => {
  const theme = createTheme();
  const mockElement = {
    sortOrder: 0,
    playlistUrl: "https://youtube.com/playlist?list=123",
    title: "Test Playlist Title",
    monitoringType: "Full",
    lastUpdatedByScheduler: 1625000000000,
  };

  const defaultProps = {
    element: mockElement,
    index: 0,
    isMenuOpen: false,
    playListUrl: "https://youtube.com/playlist?list=999", // different url
    handleClickAnchor: vi.fn(),
    changeWatch: vi.fn(),
    handleLoad: vi.fn(),
    lastUpdateCalc: vi.fn().mockReturnValue("10 mins ago"),
  };

  const renderRow = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <Table>
          <TableBody>
            <PlayListItemRow {...defaultProps} {...props} />
          </TableBody>
        </Table>
      </ThemeProvider>
    );
  };

  test("renders all playlist item row info correctly", () => {
    renderRow();

    // Index (sortOrder + 1)
    expect(screen.getByText("1")).toBeInTheDocument();

    // Title / Link
    const linkEl = screen.getByRole("link", { name: mockElement.title });
    expect(linkEl).toBeInTheDocument();
    expect(linkEl).toHaveAttribute("href", mockElement.playlistUrl);

    // Watch type label (lastUpdateCalc output)
    expect(screen.getByText("10 mins ago")).toBeInTheDocument();

    // Load button (url doesn't match playListUrl, so it should say LIST)
    expect(screen.getByRole("button", { name: "LIST" })).toBeInTheDocument();
  });

  test("renders load button as DONE if selected", () => {
    renderRow({
      playListUrl: mockElement.playlistUrl, // match
    });

    expect(screen.getByRole("button", { name: "DONE" })).toBeInTheDocument();
  });

  test("triggers handleLoad when clicking load button", () => {
    const handleLoad = vi.fn();
    renderRow({ handleLoad });

    const btn = screen.getByRole("button", { name: "LIST" });
    fireEvent.click(btn);

    expect(handleLoad).toHaveBeenCalledWith(mockElement.playlistUrl, mockElement.title);
  });

  test("triggers handleClickAnchor when clicking more options", () => {
    const handleClickAnchor = vi.fn();
    renderRow({ handleClickAnchor });

    const button = screen.getByLabelText("Delete options");
    fireEvent.click(button);

    expect(handleClickAnchor).toHaveBeenCalled();
  });

  test("triggers changeWatch when select option is changed", async () => {
    const changeWatch = vi.fn();
    const { container } = renderRow({ changeWatch });

    // Find select component
    const selectEl = container.querySelector(".MuiSelect-select");
    expect(selectEl).toBeInTheDocument();

    // Trigger select dropdown
    fireEvent.mouseDown(selectEl);

    // Select "Start"
    const option = await screen.findByRole("option", { name: "Start" });
    fireEvent.click(option);

    expect(changeWatch).toHaveBeenCalled();
  });
});
