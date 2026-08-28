/**
 * A response the server refused, or one that could not be read as the JSON
 * the API is documented to return.
 *
 * `message` is the server's own, when it sent one: the backend answers errors
 * as `{status: "error", message}` and, on a few paths, `{error}`. Callers used
 * to dig that out themselves, each in its own way, and each with its own
 * fallback for when it was not there.
 */
export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    /**
     * True when this was a dead session rather than a rejected request.
     * `apiFetch` has already told the user and logged them out, so a caller
     * that reports this again would say it twice. A 401 from `/login` is a
     * wrong password, not an expired session, and is not marked.
     */
    this.sessionExpired = false;
  }
}

/**
 * Reads the server's error message out of a refused response.
 *
 * The body is best-effort: a refusal that never reached this app's own error
 * path — a proxy's HTML 502, say — has no JSON in it, and the status line is
 * then the only thing left to report.
 */
async function errorFrom(response) {
  const body = await response.json().catch(() => null);
  const message =
    body?.message ||
    body?.error ||
    response.statusText ||
    `Request failed (${response.status})`;

  return new ApiError(response.status, message, body);
}

/**
 * The one place an API response is turned into a value.
 *
 * `apiFetch` owns the request side — base URL, JSON headers, the bearer token,
 * and logging out on a dead session. What it does not own is the other half of
 * every call: encoding the body, checking `response.ok`, and parsing. Those
 * were restated at nineteen call sites, in three different spellings of the
 * parse alone — `response.json()`, `JSON.parse(await response.text())`, and
 * `.json().catch(() => response.statusText)` — each with its own idea of what
 * a failure looks like.
 *
 * A refused request throws `ApiError` rather than returning a response for the
 * caller to inspect, so the failure path cannot be forgotten — the previous
 * shape let a missing `if (!response.ok)` read an error body as data.
 *
 * The path is typed against the generated contract
 * (`generated/apiTypes.js`): `post("/getsub", body)` accepts exactly the
 * request body `/getsub` documents and resolves to exactly its documented
 * response. The types come from the backend's endpoint table — regenerate
 * with `deno task gen:api` there after any contract change.
 *
 * @param apiFetch - The transport from `useApi`.
 * @param hadToken - Whether the transport is carrying a session. Decides
 *   whether a 401 means "expired" (already reported) or "rejected".
 */
export function createApiClient(apiFetch, hadToken = false) {
  /**
   * POSTs `body` as JSON to `path` and returns the parsed response.
   *
   * @template {import("./generated/apiTypes.js").ApiRoute["path"]} P
   * @param {P} path - Backend-relative, e.g. "/getsub".
   * @param {Extract<import("./generated/apiTypes.js").ApiRoute, {path: P}>["request"]} [body] -
   *   Serialized as the request body. Omit for none.
   * @param {{signal?: AbortSignal, headers?: object}} [options]
   * @returns {Promise<Extract<import("./generated/apiTypes.js").ApiRoute, {path: P}>["response"]>}
   *   The parsed response body.
   * @throws {ApiError} On any non-2xx, or on a body that is not JSON.
   */
  async function post(path, body, { signal, headers } = {}) {
    const response = await apiFetch(path, {
      method: "post",
      ...(signal ? { signal } : {}),
      ...(headers ? { headers } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await errorFrom(response);
      error.sessionExpired = response.status === 401 && hadToken;
      throw error;
    }

    // Every endpoint answers with JSON, so a body that will not parse is a
    // real fault worth surfacing rather than something to shrug off as empty.
    try {
      return await response.json();
    } catch {
      throw new ApiError(
        response.status,
        "The server sent a response this app could not read",
        null,
      );
    }
  }

  return { post };
}

/**
 * The client `useApiClient` hands out.
 *
 * Named here so the hooks and components that take it as a parameter can say
 * so in JSDoc — `@param {import("../api/client.js").ApiClient} api` — and get
 * the typed `post` rather than an implicit `any`. Derived from
 * `createApiClient` rather than restated, so it cannot describe a client the
 * factory does not return.
 *
 * @typedef {ReturnType<typeof createApiClient>} ApiClient
 */
