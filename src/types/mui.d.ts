/**
 * The app's own additions to MUI's theme.
 *
 * `background.menu` is set in `App.jsx`'s `createTheme` call and read by the
 * menus in `PlayList.jsx`. MUI's `TypeBackground` only declares `default` and
 * `paper`, so without this augmentation every read of the custom key is an
 * error — and, more to the point, a typo in one would not be.
 *
 * Module augmentation has to live in a `.d.ts`; it cannot be expressed in the
 * JSDoc the rest of the frontend uses.
 */
import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    /** Backdrop for popover menus, a step off `paper` in both themes. */
    menu: string;
  }

  interface TypeBackgroundOptions {
    menu?: string;
  }
}
