import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  RouterProvider,
  useNavigate,
  useRoute,
} from "../../src/router/RouterProvider.jsx";
import { NO_PLAYLIST, UNLISTED } from "../../src/router/routes.js";

const PLAYLIST = "https://www.youtube.com/playlist?list=PLabc123";

/** Renders the current route and exposes navigate through a pair of buttons. */
function Probe() {
  const route = useRoute();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="playlist">{route.playlistUrl}</span>
      <span data-testid="video">{String(route.videoUrl)}</span>
      <button
        onClick={() => navigate({ playlistUrl: PLAYLIST, videoUrl: null })}
      >
        push
      </button>
      <button
        onClick={() =>
          navigate({ playlistUrl: UNLISTED, videoUrl: null }, { replace: true })
        }
      >
        replace
      </button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <RouterProvider>
      <Probe />
    </RouterProvider>,
  );

const playlist = () => screen.getByTestId("playlist").textContent;
const click = async (name) => {
  await act(async () => {
    screen.getByText(name).click();
  });
};

describe("RouterProvider", () => {
  test("reads the location it was mounted on", () => {
    globalThis.history.replaceState(null, "", "#/unlisted");
    renderProbe();
    expect(playlist()).toBe(UNLISTED);
  });

  test("a push is a history entry Back can return through", async () => {
    renderProbe();
    expect(playlist()).toBe(NO_PLAYLIST);

    const before = globalThis.history.length;
    await click("push");

    expect(playlist()).toBe(PLAYLIST);
    expect(globalThis.history.length).toBe(before + 1);
  });

  test("a replace leaves no entry behind", async () => {
    // This is what keeps a background listing that moves the view from
    // becoming something the user has to press Back through to escape.
    renderProbe();
    const before = globalThis.history.length;

    await click("replace");

    expect(playlist()).toBe(UNLISTED);
    expect(globalThis.history.length).toBe(before);
  });

  test("Back is an ordinary route change", async () => {
    renderProbe();
    await click("push");
    expect(playlist()).toBe(PLAYLIST);

    // A real traversal, not a simulated event: jsdom runs it as a task and
    // dispatches `popstate` itself, which is the subscription being exercised.
    await act(async () => {
      globalThis.history.back();
    });

    await waitFor(() => expect(playlist()).toBe(NO_PLAYLIST));
  });

  test("navigating to where we already are adds nothing", async () => {
    globalThis.history.replaceState(null, "", "#/unlisted");
    renderProbe();
    const before = globalThis.history.length;

    await click("replace");

    expect(playlist()).toBe(UNLISTED);
    expect(globalThis.history.length).toBe(before);
  });

  test("without a provider the hooks are inert rather than a throw", () => {
    // A component can be rendered in a test, or reused somewhere that has no
    // router, without having to grow one.
    render(<Probe />);
    expect(screen.getByTestId("playlist").textContent).toBe(NO_PLAYLIST);
    expect(() => screen.getByText("push").click()).not.toThrow();
  });
});
