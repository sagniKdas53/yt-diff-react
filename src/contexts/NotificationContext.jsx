import { createContext, useState, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";

/**
 * The shape `useContext(NotificationContext)` returns.
 *
 * Declared for the default value so the signatures the provider actually
 * installs are what every consumer's call is checked against — without this,
 * each zero-arg arrow below inferred itself into a dozen call sites.
 *
 * @typedef {Object} NotificationContextValue
 * @property {string} snackMsg - Current snackbar text.
 * @property {import("@mui/material").AlertColor} snackSeverity - Current
 *   snackbar severity. Narrowed to what its only consumer, MUI's `Alert`,
 *   accepts: every call site passes "success", "error" or "info".
 * @property {boolean} showSnackbar - Whether the snackbar is showing.
 * @property {(visible: boolean) => void} setSnackVisibility
 * @property {(message: string, type?: import("@mui/material").AlertColor) => void} setSnack - Snackbar only.
 * @property {(message: string, type?: import("@mui/material").AlertColor) => void} addNotification - Log only.
 * @property {(message: string, type?: import("@mui/material").AlertColor) => void} notify - Both at once.
 * @property {Array<{id: string, message: string, type: string}>} notifications
 *   The persistent log behind the bell icon.
 * @property {(id: string) => void} dismissNotification - Removes one log entry.
 */

/** @type {NotificationContextValue} */
const defaultValue = {
  snackMsg: "",
  snackSeverity: "success",
  showSnackbar: false,
  setSnackVisibility: () => {},
  notifications: [],
  setSnack: () => {},
  addNotification: () => {},
  notify: () => {},
  dismissNotification: () => {},
};

export const NotificationContext = createContext(defaultValue);

/**
 * Owns both halves of user-facing messaging: the transient snackbar and the
 * persistent notification log behind the bell icon.
 *
 * They are separate calls rather than one, because the two surfaces routinely
 * want different text — the snackbar shows "Lofi Beats", the log shows
 * "Successfully imported playlist: Lofi Beats". `notify` is the shorthand for
 * the case where one message serves both.
 */
export const NotificationProvider = ({ children }) => {
  const [showSnackbar, setSnackVisibility] = useState(false);
  const [snackMsg, setSnackMsgTxt] = useState("");
  /** @type {[import("@mui/material").AlertColor, import("react").Dispatch<import("react").SetStateAction<import("@mui/material").AlertColor>>]} */
  const [snackSeverity, setSnackSeverity] = useState(
    /** @type {import("@mui/material").AlertColor} */ ("success"),
  );
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(0);

  /** Transient toast only. */
  const setSnack = useCallback(
    /** @param {string} message @param {import("@mui/material").AlertColor} [type] */
    (message, type = "info") => {
      setSnackMsgTxt(message);
      setSnackSeverity(type);
      setSnackVisibility(true);
    },
    [],
  );

  /** Persistent log entry only. */
  const addNotification = useCallback(
    /** @param {string} message @param {import("@mui/material").AlertColor} [type] */
    (message, type = "info") => {
      const newNotification = {
        id: Date.now() + "-" + notificationRef.current.toString(),
        message,
        type,
      };
      notificationRef.current += 1;
      setNotifications((prev) => [...prev, newNotification]);
    },
    [],
  );

  /** Both, with the same message. */
  const notify = useCallback(
    /** @param {string} message @param {import("@mui/material").AlertColor} [type] */
    (message, type = "info") => {
      setSnack(message, type);
      addNotification(message, type);
    },
    [setSnack, addNotification],
  );

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      snackMsg,
      snackSeverity,
      showSnackbar,
      setSnackVisibility,
      notifications,
      setSnack,
      addNotification,
      notify,
      dismissNotification,
    }),
    [
      snackMsg,
      snackSeverity,
      showSnackbar,
      notifications,
      setSnack,
      addNotification,
      notify,
      dismissNotification,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
