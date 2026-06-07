import { createContext, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";

export const NotificationContext = createContext({
  snackMsg: "",
  snackSeverity: "success",
  showSnackbar: false,
  setSnackVisibility: () => {},
  notifications: [],
  notify: () => {},
  dismissNotification: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [showSnackbar, setSnackVisibility] = useState(false);
  const [snackMsg, setSnackMsgTxt] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(0);

  const notify = useCallback((message, type = "info") => {
    // Show snackbar
    setSnackMsgTxt(message);
    setSnackSeverity(type);
    setSnackVisibility(true);

    // Add to notifications log
    const newNotification = {
      id: Date.now() + "-" + notificationRef.current.toString(),
      message,
      type,
    };
    notificationRef.current += 1;
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        snackMsg,
        snackSeverity,
        showSnackbar,
        setSnackVisibility,
        notifications,
        notify,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
