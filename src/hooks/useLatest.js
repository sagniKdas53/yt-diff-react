import { useRef } from "react";

/**
 * A ref that always holds the newest value it was called with.
 *
 * The socket effect registers eighteen handlers once and must never
 * re-subscribe, because tearing down and rebuilding the listener set on every
 * state change would drop events in the gap. Handlers registered once close
 * over the render that registered them, so anything they need to read *now*
 * has to arrive through a box rather than through the closure — which is what
 * this is.
 *
 * Written during render rather than in an effect, deliberately. An effect
 * commits after paint, so a handler that fires in between would read the
 * previous value; assigning here means the ref is current from the moment the
 * render that produced the value exists. That makes this unsafe under
 * concurrent rendering's interruptible renders, which is the same trade the
 * hand-written mirrors made and the reason React 19's `useEffectEvent`
 * replaces the pattern outright rather than tidying it.
 *
 * Read it only from callbacks and effects. Rendering `ref.current` is what
 * `react-hooks/refs` actually protects against, and nothing here does that —
 * so the rule is suppressed on the one line, in the one place, rather than at
 * each of the call sites that used to write their own mirror inline.
 *
 * @template T
 * @param {T} value - The value to keep current.
 * @returns {{ current: T }} A stable ref holding the latest `value`.
 */
export function useLatest(value) {
  const ref = useRef(value);
  // The render-phase write is the point of the hook, and nothing reads the ref
  // during render. See the note above for the trade this makes.
  // eslint-disable-next-line react-hooks/refs
  ref.current = value;
  return ref;
}
