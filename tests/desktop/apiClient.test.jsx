import { describe, test, expect, vi } from "vitest";
import { ApiError, createApiClient } from "../../src/api/client.js";
import { mockResponse } from "../contextHarness.jsx";

/** Builds a client over a stubbed transport, exposing what it was called with. */
function makeClient(response, { hadToken = true } = {}) {
  const apiFetch = vi.fn().mockResolvedValue(response);
  return { api: createApiClient(apiFetch, hadToken), apiFetch };
}

describe("API client", () => {
  test("posts JSON and returns the parsed body", async () => {
    const { api, apiFetch } = makeClient(mockResponse({ rows: [1, 2] }));

    const data = await api.post("/getsub", { start: 0 });

    expect(data).toEqual({ rows: [1, 2] });
    expect(apiFetch).toHaveBeenCalledWith(
      "/getsub",
      expect.objectContaining({ method: "post", body: '{"start":0}' }),
    );
  });

  test("omits the body entirely when there is none to send", async () => {
    // Not the same as sending "undefined": the server's parseRequestJson
    // refuses an unparseable body before the handler runs.
    const { api, apiFetch } = makeClient(mockResponse({ ok: 1 }));

    await api.post("/queuestatus");

    expect(apiFetch.mock.calls[0][1]).not.toHaveProperty("body");
  });

  test("passes an abort signal through", async () => {
    const { api, apiFetch } = makeClient(mockResponse({}));
    const controller = new AbortController();

    await api.post("/getsub", {}, { signal: controller.signal });

    expect(apiFetch.mock.calls[0][1].signal).toBe(controller.signal);
  });

  test("throws ApiError carrying the server's own message", async () => {
    const { api } = makeClient(
      mockResponse({ status: "error", message: "Playlist not found" }, {
        ok: false,
        status: 404,
      }),
    );

    // Every caller used to dig this out for itself, each with its own
    // fallback for when the server did not send one.
    const error = await api.post("/getsub", {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Playlist not found");
  });

  test("reads the older { error } shape too", async () => {
    const { api } = makeClient(
      mockResponse({ error: "Video is not indexed" }, { ok: false, status: 404 }),
    );

    const error = await api.post("/download", {}).catch((e) => e);
    expect(error.message).toBe("Video is not indexed");
  });

  test("falls back to the status line when there is no JSON to read", async () => {
    // A refusal that never reached the app's own error path — a proxy's HTML
    // 502, say — has nothing else to report.
    const { api } = makeClient({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => {
        throw new Error("not JSON");
      },
    });

    const error = await api.post("/getplay", {}).catch((e) => e);
    expect(error.message).toBe("Bad Gateway");
    expect(error.status).toBe(502);
  });

  test("marks a 401 as an expired session when a token was in play", async () => {
    // apiFetch has already notified and logged out; a caller that reported
    // this again would say it twice.
    const { api } = makeClient(
      mockResponse({ message: "Token expired" }, { ok: false, status: 401 }),
      { hadToken: true },
    );

    const error = await api.post("/getsub", {}).catch((e) => e);
    expect(error.sessionExpired).toBe(true);
  });

  test("a 401 with no session is a rejected credential, not an expiry", async () => {
    // This is /login with a wrong password, which the login form must report.
    const { api } = makeClient(
      mockResponse({ message: "Invalid credentials" }, { ok: false, status: 401 }),
      { hadToken: false },
    );

    const error = await api.post("/login", {}).catch((e) => e);
    expect(error.sessionExpired).toBe(false);
    expect(error.message).toBe("Invalid credentials");
  });

  test("a body that will not parse is a fault, not an empty answer", async () => {
    const { api } = makeClient({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });

    const error = await api.post("/getplay", {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toMatch(/could not read/);
  });

  test("a transport failure is not an ApiError", async () => {
    // The distinction every caller branches on: a refusal carries the
    // server's words, a network failure never reached it.
    const apiFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const api = createApiClient(apiFetch, true);

    const error = await api.post("/getplay", {}).catch((e) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.message).toBe("Failed to fetch");
  });

  test("a caller's own headers survive", async () => {
    const { api, apiFetch } = makeClient(mockResponse({}));

    await api.post("/getfile", {}, { headers: { Accept: "text/plain" } });

    expect(apiFetch.mock.calls[0][1].headers).toEqual({ Accept: "text/plain" });
  });
});
