import { describe, it, expect } from "vitest";

// `?raw` rather than fs: under jsdom `import.meta.url` is not a file URL, and
// the point here is the file's text, not its exports (it has none).
import apiTypes from "../../src/api/generated/apiTypes.js?raw";

/**
 * The generated contract is only load-bearing if TypeScript can actually read
 * it, and a JSDoc typedef it cannot parse fails silently — it becomes `any`,
 * every `post()` accepts every path, and nothing says a word.
 *
 * That is exactly what happened: the generator emitted the route union as
 *
 *     /** @typedef {
 *      * | ListRoute
 *      * } ApiRoute *\/
 *
 * with the type expression starting on the line after `@typedef {`, which
 * TypeScript does not parse. `npm run typecheck` cannot catch this — an `any`
 * is not an error — so the shape of the emitted file is asserted here instead.
 */

describe("generated API types", () => {
  it("starts the ApiRoute union on the @typedef line", () => {
    const match = apiTypes.match(/@typedef \{(.*)$/m);
    expect(match, "no @typedef found in the generated file").not.toBeNull();

    // Every @typedef in the file must carry something after the brace.
    for (const line of apiTypes.split("\n")) {
      const opened = line.match(/@typedef \{(.*)$/);
      if (!opened) continue;
      expect(
        opened[1].trim(),
        `empty type expression after "@typedef {" in: ${line.trim()}`,
      ).not.toBe("");
    }
  });

  it("declares one route member per line of the union", () => {
    const union = apiTypes.match(/@typedef \{(\w+Route[\s\S]*?)\} ApiRoute/);
    expect(union, "ApiRoute union not found").not.toBeNull();
    // The first member sits on the @typedef line; the rest are continuations.
    expect(union[1].startsWith("|")).toBe(false);
    expect(union[1]).toContain("GetsubRoute");
  });

  it("keeps the routes the client posts to", () => {
    for (const path of ["/getsub", "/getplay", "/download", "/refresh"]) {
      expect(apiTypes).toContain(`path: "${path}"`);
    }
  });

  it("documents a request body for /refresh", () => {
    // The server's parseRequestJson refuses an empty body, so the contract has
    // to ask for `{}` — `request?: undefined` typed the correct call as wrong.
    expect(apiTypes).toMatch(/path: "\/refresh", request: RefreshRequest/);
  });
});
