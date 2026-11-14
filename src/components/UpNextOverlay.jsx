import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useLatest } from "../hooks/useLatest.js";

/** Space between the overlay and the edge it keeps clear of, in px. */
const GAP = 16;

/**
 * The few seconds between one video ending and the next starting, so an
 * autoplay that moves on is something you see and can stop.
 *
 * It owns the countdown and calls `onPlayNow` itself when it reaches zero, so
 * "Play now" and running out of time are the same path.
 *
 * It sits a fixed gap above `anchorRef`, the control bar, rather than at a
 * fixed offset from the bottom: the bar is 110px tall on a desktop but wraps to
 * two rows on a phone, and any one offset covered the seek bar on the other.
 *
 * @param {Object} props
 * @param {{current: HTMLElement | null}} [props.anchorRef] - The element to
 *   stay above. Without it the overlay sits in the corner.
 * @param {string | null} [props.title] - The next video, when it is known. It
 *   is not at a page boundary, where the next page has not loaded yet.
 * @param {number} [props.seconds]
 * @param {() => void} props.onPlayNow
 * @param {() => void} props.onCancel
 */
export default function UpNextOverlay({
  anchorRef,
  title = null,
  seconds = 5,
  onPlayNow,
  onCancel,
}) {
  const [remaining, setRemaining] = useState(seconds);
  const playNow = useLatest(onPlayNow);
  const boxRef = useRef(null);

  // Written to the element rather than held in state, so a resize does not
  // render the overlay again and it is in place before the first paint.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const anchor = anchorRef?.current;
    if (!box || !anchor) return undefined;
    const place = () => {
      box.style.bottom = `${anchor.offsetHeight + GAP}px`;
    };
    place();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef]);

  // One timer decides when to play, so the number on screen can lag a render
  // without moving the moment the next video starts. The interval only draws.
  useEffect(() => {
    const done = setTimeout(() => playNow.current(), seconds * 1000);
    const tick = setInterval(
      () => setRemaining((left) => Math.max(0, left - 1)),
      1000,
    );
    return () => {
      clearTimeout(done);
      clearInterval(tick);
    };
  }, [seconds, playNow]);

  return (
    <Box
      ref={boxRef}
      sx={{
        position: "absolute",
        right: GAP,
        bottom: GAP,
        zIndex: 11,
        maxWidth: 320,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(0, 0, 0, 0.85)",
        color: "white",
      }}
    >
      <Typography variant="overline" component="div" role="status">
        Up next
      </Typography>
      {title && (
        <Typography variant="body1" sx={{ fontWeight: "bold" }} noWrap>
          {title}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: "grey.400" }}>
        Playing in {remaining}s
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onPlayNow}>
          Play now
        </Button>
        <Button size="small" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Box>
  );
}

UpNextOverlay.propTypes = {
  anchorRef: PropTypes.shape({ current: PropTypes.any }),
  title: PropTypes.string,
  seconds: PropTypes.number,
  onPlayNow: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
