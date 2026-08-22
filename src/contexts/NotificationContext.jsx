import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PropTypes from "prop-types";

export const NotificationContext = createContext({
  snackMsg: "",
  snackSeverity: "success",
  showSnackbar: false,
  setSnackVisibility: () => {},
  notifications: [],
  setSnack: () => {},
  addNotification: () => {},
  notify: () => {},
  dismissNotification: () => {},
});

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
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(0);

  /** Transient toast only. */
  const setSnack = useCallback((message, type = "info") => {
    setSnackMsgTxt(message);
    setSnackSeverity(type);
    setSnackVisibility(true);
  }, []);

  /** Persistent log entry only. */
  const addNotification = useCallback((message, type = "info") => {
    const newNotification = {
      id: Date.now() + "-" + notificationRef.current.toString(),
      message,
      type,
    };
    notificationRef.current += 1;
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  /** Both, with the same message. */
  const notify = useCallback(
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
