import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, afterEach } from "vitest";
import PlaybackFailure from "../../src/components/PlaybackFailure.jsx";

const URL_WITH_INLINE = "http://host.test/ytdiff/getfile?fileId=abc&inline=true";

const renderFailure = (props = {}) =>
  render(
    <PlaybackFailure
      title="A Test Video"
      videoUrl={URL_WITH_INLINE}
      hasNext={false}
      onNext={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );

describe("PlaybackFailure", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  test("says the browser cannot play it, and names the video", () => {
    renderFailure();
    expect(screen.getByText("This browser can't play this file")).toBeInTheDocument();
    expect(screen.getByText("A Test Video")).toBeInTheDocument();
  });

  test("Download file links to the stream without inline", () => {
    renderFailure();
    const link = screen.getByRole("link", { name: /download file/i });
    expect(link.getAttribute("href")).toBe("http://host.test/ytdiff/getfile?fileId=abc");
    expect(link).toHaveAttribute("download");
  });

  test("Copy stream link copies the absolute URL and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderFailure({ videoUrl: "/ytdiff/getfile?fileId=abc&inline=true" });
    fireEvent.click(screen.getByRole("button", { name: /copy stream link/i }));
    await waitFor(() => expect(screen.getByText("Copied")).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/ytdiff/getfile?fileId=abc&inline=true`,
    );
  });

  test("without a clipboard API the link is shown to select by hand", () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    renderFailure();
    fireEvent.click(screen.getByRole("button", { name: /copy stream link/i }));
    expect(screen.getByLabelText("stream link")).toHaveValue(URL_WITH_INLINE);
  });

  test("Open in VLC appears only on Android", () => {
    const { unmount } = renderFailure();
    expect(screen.queryByRole("link", { name: /open in vlc/i })).not.toBeInTheDocument();
    unmount();

    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14) Chrome/120",
      configurable: true,
    });
    renderFailure();
    const link = screen.getByRole("link", { name: /open in vlc/i });
    expect(link.getAttribute("href")).toBe(`vlc://${URL_WITH_INLINE}`);
  });

  test("Play next shows only when there is a next video", () => {
    const onNext = vi.fn();
    const { unmount } = renderFailure({ hasNext: false, onNext });
    expect(screen.queryByRole("button", { name: /play next/i })).not.toBeInTheDocument();
    unmount();
    renderFailure({ hasNext: true, onNext });
    fireEvent.click(screen.getByRole("button", { name: /play next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test("Go back closes the player", () => {
    const onClose = vi.fn();
    renderFailure({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /go back/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
