import React, { useCallback, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { useLatest } from "../../src/hooks/useLatest";

/**
 * Stands in for the socket effect: a callback captured once, then invoked
 * later. `read` closes over the first render and must still see the newest
 * value — that is the whole reason the mirrors exist.
 */
function Harness() {
  const [value, setValue] = useState("first");
  const latest = useLatest(value);

  // Deliberately empty deps: this is the "registered once" case.
  const read = useCallback(() => latest.current, []);
  const [seen, setSeen] = useState("");

  return (
    <div>
      <span data-testid="seen">{seen || "nothing"}</span>
      <button onClick={() => setValue("second")}>change</button>
      <button onClick={() => setSeen(read())}>read</button>
    </div>
  );
}

describe("useLatest (Desktop)", () => {
  test("a callback captured on first render reads the newest value", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("read"));
    expect(screen.getByTestId("seen")).toHaveTextContent("first");

    fireEvent.click(screen.getByText("change"));
    fireEvent.click(screen.getByText("read"));
    expect(screen.getByTestId("seen")).toHaveTextContent("second");
  });

  test("the ref identity is stable across renders", () => {
    // Handlers hold the box, not the value. A new box per render would strand
    // every handler registered before it on a ref nothing writes to any more.
    const boxes = [];

    function Identity() {
      const [n, setN] = useState(0);
      boxes.push(useLatest(n));
      return <button onClick={() => setN((prev) => prev + 1)}>bump</button>;
    }

    render(<Identity />);
    fireEvent.click(screen.getByText("bump"));
    fireEvent.click(screen.getByText("bump"));

    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes.every((box) => box === boxes[0])).toBe(true);
  });
});
