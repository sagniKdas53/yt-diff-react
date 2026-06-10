// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import TablePaginationActions from "../../src/components/Pagination.jsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";

describe("Pagination Component (Desktop)", () => {
  const theme = createTheme();
  
  test("renders buttons and current page selection correctly", () => {
    const onPageChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <TablePaginationActions
          count={100}
          page={0}
          rowsPerPage={10}
          onPageChange={onPageChange}
        />
      </ThemeProvider>
    );

    // Page 0 (first page): First page and Previous page buttons should be disabled
    expect(screen.getByLabelText("first page")).toBeDisabled();
    expect(screen.getByLabelText("previous page")).toBeDisabled();
    expect(screen.getByLabelText("next page")).toBeEnabled();
    expect(screen.getByLabelText("last page")).toBeEnabled();
  });

  test("triggers page change when clicking Next and Last buttons", () => {
    const onPageChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <TablePaginationActions
          count={100}
          page={0}
          rowsPerPage={10}
          onPageChange={onPageChange}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByLabelText("next page"));
    expect(onPageChange).toHaveBeenCalledWith(expect.any(Object), 1);

    fireEvent.click(screen.getByLabelText("last page"));
    expect(onPageChange).toHaveBeenCalledWith(expect.any(Object), 9); // Math.ceil(100/10) - 1
  });

  test("triggers page change when clicking Back and First buttons on later page", () => {
    const onPageChange = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <TablePaginationActions
          count={100}
          page={5}
          rowsPerPage={10}
          onPageChange={onPageChange}
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText("first page")).toBeEnabled();
    expect(screen.getByLabelText("previous page")).toBeEnabled();

    fireEvent.click(screen.getByLabelText("previous page"));
    expect(onPageChange).toHaveBeenCalledWith(expect.any(Object), 4);

    fireEvent.click(screen.getByLabelText("first page"));
    expect(onPageChange).toHaveBeenCalledWith(expect.any(Object), 0);
  });

  test("dropdown selection changes the page", async () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <ThemeProvider theme={theme}>
        <TablePaginationActions
          count={50}
          page={1} // second page (index 1, display 2)
          rowsPerPage={10}
          onPageChange={onPageChange}
        />
      </ThemeProvider>
    );

    // Find the select combobox
    const selectEl = container.querySelector(".MuiSelect-select");
    expect(selectEl).toBeInTheDocument();
    
    // MUI select click opens a portal menu
    fireEvent.mouseDown(selectEl);
    
    // Choose page 4 (value 4)
    const option = await screen.findByRole("option", { name: "4" });
    fireEvent.click(option);
    
    expect(onPageChange).toHaveBeenCalledWith(null, 3); // index 3 for page 4
  });
});
