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
        /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})/,
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
  return cues;
}
