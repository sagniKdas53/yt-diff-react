import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * The one definition of "mobile" for the whole app.
 *
 * Width alone gets touch tablets wrong: a 900px tablet is past `sm`, so it
 * was handed the desktop control bar with 30px buttons and a hover-only
 * volume slider. Width alone also gets a narrow desktop window wrong. So it is
 * mobile when the viewport is below `md`, or when the primary input is a finger
 * (no hover, coarse pointer).
 *
 * @param {import("@mui/material").Theme} [theme] - `App` renders above the
 *   `ThemeProvider`, so it passes the theme it built; everything else omits it.
 * @returns {boolean}
 */
export function useIsMobile(theme) {
  const contextTheme = useTheme();
  const activeTheme = theme ?? contextTheme;
  const narrow = useMediaQuery(activeTheme.breakpoints.down("md"));
  const touch = useMediaQuery("(hover: none) and (pointer: coarse)");
  return narrow || touch;
}
