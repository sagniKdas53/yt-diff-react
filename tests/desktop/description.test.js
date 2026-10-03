import { describe, it, expect } from "vitest";
import { parseDescriptionSegments } from "../../src/hooks/useDescription.js";

/**
 * A description is a wall of text with two things worth acting on buried in
 * it: links, and timestamps. Both are ordinary characters until something
 * decides they are not, so the splitting is worth pinning.
 */

describe("parseDescriptionSegments", () => {
  it("returns one text segment when there is nothing to link", () => {
    expect(parseDescriptionSegments("just a description")).toEqual([
      { kind: "text", value: "just a description" },
    ]);
  });

  it("turns a URL into a link", () => {
    expect(parseDescriptionSegments("see https://example.test/x now")).toEqual([
      { kind: "text", value: "see " },
      { kind: "link", value: "https://example.test/x" },
      { kind: "text", value: " now" },
    ]);
  });

  it("keeps sentence punctuation out of the link", () => {
    const segments = parseDescriptionSegments("read https://example.test/x.");
    expect(segments.filter((s) => s.kind === "link")).toEqual([
      { kind: "link", value: "https://example.test/x" },
    ]);
    expect(segments.at(-1)).toEqual({ kind: "text", value: "." });
  });

  it("reads mm:ss as seconds", () => {
    expect(
      parseDescriptionSegments("2:13 the bit you came for").filter((s) =>
        s.kind === "time"
      ),
    ).toEqual([{ kind: "time", value: "2:13", seconds: 133 }]);
  });

  it("reads an hour-qualified timestamp", () => {
    expect(
      parseDescriptionSegments("1:02:03 later").filter((s) => s.kind === "time"),
    ).toEqual([{ kind: "time", value: "1:02:03", seconds: 3723 }]);
  });

  it("leaves the colon in prose alone", () => {
    // "note: see" is not a timestamp, and a bare "12" is not either.
    expect(parseDescriptionSegments("note: see the manual")).toEqual([
      { kind: "text", value: "note: see the manual" },
    ]);
  });

  it("does not break a URL apart around a colon", () => {
    const segments = parseDescriptionSegments("https://example.test/a?b=1:20");
    expect(segments).toEqual([
      { kind: "link", value: "https://example.test/a?b=1:20" },
    ]);
  });

  it("keeps newlines, so the dialog's pre-wrap formatting still means something", () => {
    const segments = parseDescriptionSegments("one\n\ntwo");
    expect(segments.map((s) => s.value).join("")).toBe("one\n\ntwo");
  });
});