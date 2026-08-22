import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import ErrorBoundary from "../../src/components/ErrorBoundary.jsx";
import { isChunkLoadError } from "../../src/lib/chunkLoadError.js";

/** Throws on render, which is the only way into a boundary. */
function Boom({ error }) {
  throw error;
}

const chunkError = () =>
  new TypeError(
    "Failed to fetch dynamically imported module: https://host/assets/PlayList-a1b2c3.js",
  );

let reload;
let consoleError;

/**
 * React re-throws a caught error so devtools can see it, jsdom turns that into
 * a window error event, and vitest prints the trace. The boundary catching it
 * is the thing under test, so the trace is noise.
 */
const swallowWindowError = (event) => event.preventDefault();

beforeEach(() => {
  window.addEventListener("error", swallowWindowError);
  sessionStorage.clear();
  reload = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
  // React logs the caught error itself; the boundary logs it again on purpose.
  // Neither is a test failure, and both are noise here.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  window.removeEventListener("error", swallowWindowError);
  consoleError.mockRestore();
});

describe("isChunkLoadError", () => {
  test("recognises what each engine calls a failed dynamic import", () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(
      isChunkLoadError(new Error("error loading dynamically imported module")),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error("Importing a module script failed.")),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error("Unable to preload CSS for /assets/x.css")),
    ).toBe(true);
    const named = new Error("boom");
    named.name = "ChunkLoadError";
    expect(isChunkLoadError(named)).toBe(true);
  });

  test("does not swallow ordinary render errors", () => {
    expect(isChunkLoadError(new TypeError("x is not a function"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("ErrorBoundary (Desktop)", () => {
  test("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  test("a render error leaves a message rather than a blank page", () => {
    // F2: with no boundary anywhere in the tree, a throw during render
    // unmounted everything and left an empty <div id="root">.
    render(
      <ErrorBoundary>
        <Boom error={new TypeError("theme.palette is undefined")} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByText("theme.palette is undefined")).toBeInTheDocument();
    // An ordinary bug is not a stale build, so nothing reloads on its own.
    expect(reload).not.toHaveBeenCalled();
  });

  test("names the region it guards", () => {
    render(
      <ErrorBoundary compact label="The playlist list">
        <Boom error={new Error("nope")} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/The playlist list stopped unexpectedly/),
    ).toBeInTheDocument();
  });

  test("the Reload button reloads", () => {
    render(
      <ErrorBoundary>
        <Boom error={new Error("nope")} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("a compact boundary can retry without reloading the app", () => {
    function Flaky({ shouldThrow }) {
      if (shouldThrow) throw new Error("transient");
      return <p>recovered</p>;
    }

    const { rerender } = render(
      <ErrorBoundary compact label="The video list">
        <Flaky shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/stopped unexpectedly/)).toBeInTheDocument();

    rerender(
      <ErrorBoundary compact label="The video list">
        <Flaky shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  test("a stale chunk reloads once and says so", () => {
    // Every deploy rehashes the chunk filenames, so a tab left open across one
    // requests a file that no longer exists. That is a stale tab, not a bug.
    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Loading the latest version…")).toBeInTheDocument();
    expect(sessionStorage.getItem("ytdiff_chunk_reload_at")).toBeTruthy();
  });

  test("a build that is genuinely broken does not loop", () => {
    // The reload marker survives the reload, so the second failure in a row
    // gets the message instead of another round trip.
    const first = render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );
    expect(reload).toHaveBeenCalledTimes(1);
    first.unmount();

    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("This tab is out of date")).toBeInTheDocument();
  });

  test("a stale marker from an earlier session does not block a reload", () => {
    // The guard is against looping now, not against ever reloading again: a
    // tab open across two deploys has to be able to catch up twice.
    sessionStorage.setItem(
      "ytdiff_chunk_reload_at",
      String(Date.now() - 60 * 60 * 1000),
    );

    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("storage that throws means the message, never a blind reload", () => {
    const getItem = vi
      .spyOn(window.sessionStorage, "getItem")
      .mockImplementation(() => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      });
    try {
      render(
        <ErrorBoundary>
          <Boom error={chunkError()} />
        </ErrorBoundary>,
      );
      expect(reload).not.toHaveBeenCalled();
      expect(screen.getByText("This tab is out of date")).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });

  test("the fallback pulls in nothing from the app it is reporting on", async () => {
    // The panel has to render when MUI or the theme is what broke, so it uses
    // plain elements and inline styles rather than anything from the tree.
    const source = await import("../../src/components/ErrorBoundary.jsx?raw");
    const imports = [...source.default.matchAll(/from\s+"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(imports).toEqual([
      "react",
      "prop-types",
      "../lib/chunkLoadError.js",
    ]);
  });
});
