import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import PlaybackFailure from "../../src/components/PlaybackFailure.jsx";
import UpNextOverlay from "../../src/components/UpNextOverlay.jsx";
import VideoPlayer from "../../src/components/VideoPlayer.jsx";
import {
  makeContexts,
  mockResponse,
  renderWithContexts,
} from "../contextHarness.jsx";

// Fingers need 44px. jsdom does no layout, so what can be checked is the size
// each control asks for; the real boxes are measured in a browser.
const style = (element) => window.getComputedStyle(element);
const px = (value) => parseFloat(value) || 0;

describe("touch targets on the mobile layout", () => {
  test("every action on the failure screen is at least 44px tall", () => {
    render(
      <PlaybackFailure
        title="A Test Video"
        videoUrl="http://host.test/ytdiff/getfile?fileId=abc&inline=true"
        hasNext
        onNext={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const actions = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ];
    expect(actions.length).toBeGreaterThanOrEqual(4);
    for (const action of actions) {
      expect(
        px(style(action).minHeight),
        action.textContent,
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test("Play now and Cancel on Up next are at least 44px tall", () => {
    render(
      <UpNextOverlay title="Next" onPlayNow={vi.fn()} onCancel={vi.fn()} />,
    );

    for (const name of ["Play now", "Cancel"]) {
      const button = screen.getByRole("button", { name });
      expect(px(style(button).minHeight), name).toBeGreaterThanOrEqual(44);
    }
  });

  describe("in the player", () => {
    let contexts;

    beforeEach(() => {
      contexts = makeContexts();
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(
          mockResponse({
            status: "success",
            signedUrlId: "url_123",
            expiry: Date.now() + 3600000,
          }),
        );
      localStorage.clear();
      HTMLVideoElement.prototype.load = vi.fn();
      HTMLVideoElement.prototype.pause = vi.fn();
      HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const renderPlayer = async () => {
      renderWithContexts(
        <VideoPlayer
          saveDirectory="/downloads"
          fileName="video.mp4"
          title="Mobile Video Player"
          onClose={vi.fn()}
        />,
        { contexts },
      );
      await waitFor(() =>
        expect(document.querySelector("video")).toBeInTheDocument(),
      );
    };

    test("the top bar's buttons are at least 44px square", async () => {
      await renderPlayer();

      for (const name of ["go back", "toggle playlist drawer"]) {
        const button = screen.getByRole("button", { name });
        expect(px(style(button).minWidth), name).toBeGreaterThanOrEqual(44);
        expect(px(style(button).minHeight), name).toBeGreaterThanOrEqual(44);
      }
    });

    test("the autoplay switch has a 44px hit area around the small switch", async () => {
      await renderPlayer();

      // The label is what a tap on or near the switch lands on, and it toggles
      // the switch, so its size is the hit area. The switch itself stays small.
      const hitArea = screen.getByRole("checkbox").closest("label");
      expect(px(style(hitArea).minHeight)).toBeGreaterThanOrEqual(44);
      expect(px(style(hitArea).minWidth)).toBeGreaterThanOrEqual(44);
    });

    test("the volume slider is at least 44px wide", async () => {
      await renderPlayer();
      fireEvent.click(screen.getByLabelText("mute volume"));

      const slider = screen
        .getByLabelText("mobile volume slider")
        .closest(".MuiSlider-root");
      expect(px(style(slider).width)).toBeGreaterThanOrEqual(44);
    });
  });
});
