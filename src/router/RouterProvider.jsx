import PropTypes from "prop-types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { formatRoute, parseRoute, ROOT_ROUTE } from "./routes.js";

/**
 * The fragment-backed router.
 *
 * Three things make up its public surface — `RouterProvider`, `useRoute` and
 * `useNavigate` — and they are deliberately shaped like `react-router`'s, which
 * is the escape hatch this file exists to keep open.
 *
 * **On not using `react-router` (the "Level 2" safeguard).** The app has two
 * destinations and one modal. A router earns its dependency at four or five,
 * and until then it would be more moving parts than the problem has. But the
 * decision should stay cheap to reverse, so nothing outside this directory
 * knows how navigation is implemented: consumers see a `{playlistUrl, videoUrl}`
 * object and a `navigate` function, never a `location` or a `<Route>`.
 *
 * Adopting `react-router` later is then a change to this one file:
 *
 *   1. `npm i react-router-dom`.
 *   2. Wrap the tree in `<HashRouter>` — still the fragment, so still no
 *      backend change. Switching to `<BrowserRouter>` additionally needs the
 *      server to serve `index.html` for unknown paths under its base.
 *   3. Reimplement `useRoute` as `parseRoute("#" + useLocation().pathname +
 *      useLocation().search)` and `useNavigate` over the library's own, keeping
 *      `routes.js` as the grammar.
 *
 * Consumers do not change, and `routes.js` and its tests carry over whole.
 */
const RouterContext = createContext(null);

/**
 * The address bar as an external store.
 *
 * `useSyncExternalStore` rather than `useState` + an effect, because that is
 * exactly what this is: a value React does not own, that changes without
 * React's knowledge (Back, Forward, a hand-edited URL), which components need
 * to read consistently. Doing it with an effect means a render where the app
 * and the address bar disagree, and a `setState` in an effect body that React's
 * own lint rule correctly objects to.
 *
 * Module scope, because there is exactly one address bar. Listeners are
 * attached while anything is subscribed and dropped when nothing is.
 */
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

function subscribeToLocation(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    // `hashchange` covers Back, Forward and a hand-edited address bar.
    // `popstate` fires for the same traversals; subscribing to both costs
    // nothing, since a notification only ever causes a re-read.
    globalThis.addEventListener("hashchange", notify);
    globalThis.addEventListener("popstate", notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      globalThis.removeEventListener("hashchange", notify);
      globalThis.removeEventListener("popstate", notify);
    }
  };
}

/** A string, so React can compare snapshots by value. */
function readHash() {
  return globalThis.location?.hash ?? "";
}

export function RouterProvider({ children }) {
  const hash = useSyncExternalStore(subscribeToLocation, readHash, readHash);
  const route = useMemo(() => parseRoute(hash), [hash]);

  /**
   * Goes to `next`.
   *
   * `replace` is not a detail: an auto-navigation the user did not ask for —
   * a background listing finishing and pulling the view to its playlist — must
   * not leave a history entry they have to press Back through to escape. Those
   * call sites replace; everything a person clicks pushes.
   *
   * @param {import("./routes.js").Route} next
   * @param {{replace?: boolean}} [options]
   */
  const navigate = useCallback((next, { replace = false } = {}) => {
    const target = formatRoute(next);
    const history = globalThis.history;

    // Re-navigating to where we already are must never add an entry.
    if (!history || target === (readHash() || "#/")) return;

    if (replace) {
      history.replaceState(history.state, "", target);
    } else {
      history.pushState(null, "", target);
    }
    // Neither `pushState` nor `replaceState` fires `hashchange`, so subscribers
    // are told here rather than left waiting on an event that is not coming.
    notify();
  }, []);

  const value = useMemo(() => ({ route, navigate }), [route, navigate]);

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

RouterProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The current route.
 *
 * Falls back to the root route rather than throwing when no provider is
 * mounted, so a component can be rendered in a test without one.
 *
 * @returns {import("./routes.js").Route}
 */
export function useRoute() {
  return useContext(RouterContext)?.route ?? ROOT_ROUTE;
}

/**
 * The navigate function. A no-op without a provider, for the same reason.
 *
 * @returns {(next: import("./routes.js").Route, options?: {replace?: boolean}) => void}
 */
export function useNavigate() {
  const context = useContext(RouterContext);
  const fallback = useCallback(() => {}, []);
  return context?.navigate ?? fallback;
}
