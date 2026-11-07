import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useLatest } from "../hooks/useLatest.js";

/**
 * The few seconds between one video ending and the next starting, so an
 * autoplay that moves on is something you see and can stop.
 *
 * It owns the countdown and calls `onPlayNow` itself when it reaches zero, so
 * "Play now" and running out of time are the same path.
 *
 * @param {Object} props
 * @param {string | null} [props.title] - The next video, when it is known. It
 *   is not at a page boundary, where the next page has not loaded yet.
 * @param {number} [props.seconds]
 * @param {() => void} props.onPlayNow
 * @param {() => void} props.onCancel
 */
export default function UpNextOverlay({
  title = null,
  seconds = 5,
  onPlayNow,
  onCancel,
}) {
  const [remaining, setRemaining] = useState(seconds);
  const playNow = useLatest(onPlayNow);

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
      sx={{
        position: "absolute",
        right: 16,
        bottom: 110,
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
  title: PropTypes.string,
  seconds: PropTypes.number,
  onPlayNow: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
