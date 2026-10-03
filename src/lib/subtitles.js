/**
 * How long an echo cue can be and still be one.
 *
 * YouTube writes them at 10 ms; the slack is for the rounding that shows up in
 * converted tracks, and the ceiling is far below any cue a person wrote.
 */
const ECHO_MAX_SECONDS = 0.05;

/**
 * Formats seconds as h:mm:ss (or m:ss below an hour), matching the player
 * control bar's readout.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
}

/** @param {string} ts - A single VTT timestamp, comma or dot milliseconds. */
function parseTimestamp(ts) {
  const cleaned = ts.replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

/**
 * Parses WebVTT subtitle text into plain-text cues.
 *
 * Strips VTT formatting along the way: timestamp tags (`<00:00:25.600>`),
 * karaoke emphasis (`<c>`, `</c>`) and any other inline markup (`<b>`, `<i>`,
 * `<u>`, `<ruby>`, ...), so what reaches the overlay is only spoken text.
 *
 * @param {string} text - Raw .vtt contents (BOM and CRLF tolerated).
 * @returns {Array<{start: number, end: number, text: string}>}
 */
export function parseSubtitleText(text) {
  const cues = [];
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const blocks = normalized.split(/\n\n+/);

  const parser = new DOMParser();

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let timingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines.at(i).includes("-->")) {
        timingIdx = i;
        break;
      }
    }
    if (timingIdx === -1) continue;

    const match = lines
      .at(timingIdx)
      .match(
        // The hour is optional, because WebVTT's is: ffmpeg's writer emits
        // `mm:ss.mmm` for anything under an hour, and that is what
        // `--convert-subs vtt` produces for a source that was not already VTT.
        // The previous pattern spelled the hour as `\d{1,2}:?`, which reads as
        // optional but is not — it still demands the two colons that follow —
        // so those files parsed to zero cues. Nothing said so: the CC button
        // is gated on the subtitle URL, not on the cues, so it appeared and
        // the overlay stayed empty.
        /((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3})/,
      );
    if (!match) continue;

    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const rawText = lines
      .slice(timingIdx + 1)
      .join("\n")
      .trim();
    // Strip VTT formatting: timestamp tags <00:00:25.600>, karaoke <c>/</c>,
    // and any other VTT markup tags like <b>, <i>, <u>, <ruby>, etc.
    const noTimeTags = rawText.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "");
    const doc = parser.parseFromString(noTimeTags, "text/html");
    const textContent = (doc.body.textContent || "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (textContent) {
      cues.push({ start, end, text: textContent });
    }
  }
  return collapseRollingCues(cues);
}

/**
 * Collapses the rolling cue style YouTube's auto-captions emit.
 *
 * An auto-generated track repeats every line three times: once with karaoke
 * word timings, then again as the 10 ms echo that carries the plain text, then
 * once more as the first line of the next cue with the following words
 * appended. Read as-is, the overlay double-renders each line and the transcript
 * repeats itself three times over.
 *
 * An echo is identified by what it is rather than by what it says: a cue of
 * no more than {@link ECHO_MAX_SECONDS} that repeats the line before it. A
 * human-authored subtitle that deliberately re-displays a line is a second or
 * more long and is left alone. Growth is positional — a cue that *starts*
 * with the previous one is that line gaining words, and what it gained is the
 * next line: the echo already closed the previous cue, so the remainder
 * becomes a cue of its own with the grown cue's timings. A real subtitle file
 * does neither, because each of its cues starts a new thought.
 *
 * @param {Array<{start: number, end: number, text: string}>} cues
 * @returns {Array<{start: number, end: number, text: string}>}
 */
function collapseRollingCues(cues) {
  const collapsed = [];

  for (const cue of cues) {
    const previous = collapsed.at(-1);

    if (previous && cue.text === previous.text) {
      // The echo. Its 10 ms of screen time is what makes the hand-off to the
      // grown cue invisible, so dropping it costs nothing. A longer cue saying
      // the same thing is somebody repeating themselves, and that is theirs.
      if (cue.end - cue.start <= ECHO_MAX_SECONDS) {
        continue;
      }
      collapsed.push(cue);
      continue;
    }

    if (previous && cue.text.startsWith(previous.text)) {
      // What the line gained is the *next* line, not more of this one: the
      // echo already ended the previous cue, so this starts a new one. It
      // takes the grown cue's timings, which span the whole of it.
      const grown = cue.text.slice(previous.text.length).trim();
      if (grown) {
        collapsed.push({ start: cue.start, end: cue.end, text: grown });
      }
      continue;
    }

    collapsed.push(cue);
  }

  return collapsed;
}
