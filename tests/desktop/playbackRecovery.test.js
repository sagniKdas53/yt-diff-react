import { describe, test, expect } from "vitest";
import {
  initialRecovery,
  onMediaError,
  onPlaybackAdvanced,
} from "../../src/lib/playbackRecovery.js";

describe("playbackRecovery", () => {
  test("code 4 retries once, then fails", () => {
    const first = onMediaError(initialRecovery(), 4, 0);
    expect(first.action).toBe("retry");
    const second = onMediaError(first.state, 4, 0);
    expect(second.action).toBe("fail");
  });

  test("codes 2 and 3 retry twice, then fail", () => {
    for (const code of [2, 3]) {
      let state = initialRecovery();
      const results = [];
      for (let i = 0; i < 3; i += 1) {
        const result = onMediaError(state, code, 5);
        results.push(result.action);
        state = result.state;
      }
      expect(results).toEqual(["retry", "retry", "fail"]);
    }
  });

  test("an aborted load, and an error with no code, are ignored without spending the budget", () => {
    const start = initialRecovery();
    for (const code of [1, null, undefined]) {
      const result = onMediaError(start, code, 5);
      expect(result.action).toBe("ignore");
      expect(result.state.retries).toBe(0);
    }
    // The budget is intact afterwards.
    expect(onMediaError(start, 4, 5).action).toBe("retry");
  });

  test("playing 10 s past the last error gives the retries back", () => {
    const afterError = onMediaError(initialRecovery(), 4, 60).state;
    expect(onPlaybackAdvanced(afterError, 69.9).retries).toBe(1);
    expect(onPlaybackAdvanced(afterError, 70).retries).toBe(0);
    // And a fresh error after that retries again.
    const reset = onPlaybackAdvanced(afterError, 75);
    expect(onMediaError(reset, 4, 75).action).toBe("retry");
  });

  test("a file that fails at the same spot is not rescued by a second of playback", () => {
    const first = onMediaError(initialRecovery(), 4, 60);
    expect(first.action).toBe("retry");
    // The remint resumes at 60, plays a second, and fails again.
    const advanced = onPlaybackAdvanced(first.state, 61);
    expect(advanced.retries).toBe(1);
    expect(onMediaError(advanced, 4, 61).action).toBe("fail");
  });

  test("playback before any error changes nothing", () => {
    const start = initialRecovery();
    expect(onPlaybackAdvanced(start, 500)).toEqual(start);
  });
});
