import { useCallback, useEffect, useRef, useState } from "react";
import { useApiClient } from "./useApiClient";

/**
 * How often the queue is read, by whether anyone is watching it.
 *
 * Open, the drawer is the reason to be accurate and 2 s is as fast as a
 * progress bar moves perceptibly. Closed, it is a badge and a badge does not
 * need 2 s freshness. A tab nobody is looking at polls not at all: `document`
 * is hidden for most of a tab's life, and a request per second forever is the
 * price of a number that changes slowly.
 */
export const POLL_OPEN_MS = 2000;
export const POLL_CLOSED_MS = 10000;

const EMPTY = { downloads: [], listings: [] };

/**
 * A snapshot reader that never lets two reads overlap, but never drops a
 * request either.
 *
 * The interval fires whether or not the last read finished, so without this a
 * slow response stacks a second request behind the first and the queue starts
 * reporting the state from several intervals ago, out of order.
 */
function useSingleFlight(read) {
  const inFlight = useRef(false);
  const owed = useRef(false);

  return useCallback(async () => {
    if (inFlight.current) {
      // The open read began before whatever asked for this one, so its answer
      // describes the queue as it was — an action's read-back landing here
      // would be answered by state from before the action. Owe exactly one more
      // read and run it below. Callers that pile up during a read all collapse
      // into that single read, and a read that is itself superseded leaves the
      // flag set for the next call instead of chasing it here, so a chain of
      // them terminates instead of running forever.
      owed.current = true;
      return;
    }
    inFlight.current = true;
    try {
      await read();
      if (owed.current) {
        owed.current = false;
        await read();
      }
    } finally {
      inFlight.current = false;
    }
  }, [read]);
}

/**
 * The server's running and queued downloads and listings, and the three
 * things one can do to them.
 *
 * Polled rather than pushed. The socket already carries a percent per
 * download, but not the queue itself, the listings, or the outcome of an
 * action — and a second event family for a panel that is usually closed is a
 * worse trade than one small POST on a timer.
 *
 * @param {{enabled: boolean, open: boolean}} options
 *   `enabled` is whether there is a session to poll with; `open` is whether
 *   the drawer is showing, which is what picks the interval.
 * @returns {{jobs: {downloads: Array, listings: Array}, loading: boolean,
 *   error: string|null, refresh: () => Promise<void>, act: (id: string,
 *   action: "pause"|"resume"|"cancel") => Promise<object>}}
 */
export function useJobQueue({ enabled, open }) {
  const api = useApiClient();
  const [jobs, setJobs] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      // An empty object, not nothing: the endpoint validates its body and
      // answers "Empty Request Body" when there is none, which the drawer
      // would then render as an empty queue — indistinguishable from the
      // server having nothing to do.
      const body = await api.post("/queuestatus", {});
      setJobs({
        downloads: Array.isArray(body.queue) ? body.queue : [],
        listings: Array.isArray(body.listings) ? body.listings : [],
      });
      setError(null);
    } catch (failure) {
      // A failed poll is shown and forgotten on the next tick. Holding the
      // error forever would leave a stale queue on screen under a banner
      // that has stopped being true.
      setError(failure?.message ?? "Could not read the queue");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const refresh = useSingleFlight(read);

  // The timer is set up once per (enabled, open) and must not be torn down by
  // an unrelated render: every read ends in a state change, and a timer
  // rebuilt after each one resets its own interval, so in a busy queue it
  // would keep pushing its next tick back and never fire. The ref is what
  // lets the timer read the current `refresh` without depending on it.
  const refreshRef = useRef(refresh);
  // Written after the commit rather than in the render body: React can throw a
  // render away, and a ref it had written would outlive it. The first render
  // leaves the initializer's value, which is this render's own `refresh`.
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const poll = () => {
      if (!document.hidden) void refreshRef.current();
    };
    poll();
    let timer = setInterval(poll, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    // A hidden tab should not be reading the queue at all, so visibility gates
    // the timer itself rather than only the request inside it.
    const onVisibility = () => {
      clearInterval(timer);
      if (document.hidden) return;
      poll();
      timer = setInterval(poll, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, open]);

  const act = useCallback(
    async (id, action) => {
      const body = await api.post("/jobaction", { id, action });
      // Read straight back rather than patching the local copy: the server is
      // the only thing that knows what pausing a job actually did to its
      // files, and a pause that turned into a cancel has to show as one.
      void refresh();
      return body;
    },
    [api, refresh],
  );

  return { jobs, loading, error, refresh, act };
}