import { Component } from "react";
import PropTypes from "prop-types";
import { isChunkLoadError } from "../lib/chunkLoadError.js";

/**
 * The last line of defence, and deliberately the dumbest component in the tree.
 *
 * It imports nothing but React and PropTypes, and styles itself with inline
 * rules rather than the theme: it has to render when MUI, the theme, or the
 * chunk holding them is what broke. Anything it depends on is something it
 * cannot report a failure in.
 */

const RELOAD_MARKER = "ytdiff_chunk_reload_at";

/**
 * How recently a reload has to have happened for another one to count as a
 * loop. A stale-chunk reload fixes itself on the first try, so a second
 * failure inside this window means the build itself is broken and reloading
 * again would only spin.
 */
const RELOAD_WINDOW_MS = 10000;

/**
 * Records a reload attempt, and reports whether this one is allowed.
 *
 * Storage can throw outright (Safari's private mode, a browser set to block
 * site data). A boundary that cannot remember whether it already reloaded must
 * not reload at all, so any failure here means "show the message instead".
 */
function claimReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARKER));
    if (Number.isFinite(last) && last > 0) {
      if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    }
    sessionStorage.setItem(RELOAD_MARKER, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

const palette = {
  surface: "#ffffff",
  border: "#d7d7db",
  text: "#1b1b1f",
  muted: "#5b5b66",
  accent: "#7c4dff",
  accentText: "#ffffff",
};

/**
 * Plain inline styles, because this component renders when the app has already
 * failed — it must not depend on MUI's theme or emotion having survived.
 *
 * Annotated so `flexWrap: "wrap"` and friends stay the literal unions
 * `CSSProperties` wants, rather than widening to `string`.
 *
 * @type {Record<string, import("react").CSSProperties>}
 */
const styles = {
  page: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
  },
  compact: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: "34rem",
    width: "100%",
    background: palette.surface,
    color: palette.text,
    border: `1px solid ${palette.border}`,
    borderRadius: "8px",
    padding: "24px",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    lineHeight: 1.5,
    textAlign: "left",
  },
  heading: {
    margin: "0 0 8px",
    fontSize: "1.125rem",
    fontWeight: 600,
  },
  body: {
    margin: "0 0 16px",
    color: palette.muted,
    fontSize: "0.9375rem",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  button: {
    font: "inherit",
    fontSize: "0.875rem",
    padding: "8px 16px",
    borderRadius: "4px",
    border: `1px solid ${palette.accent}`,
    background: palette.accent,
    color: palette.accentText,
    cursor: "pointer",
  },
  secondaryButton: {
    font: "inherit",
    fontSize: "0.875rem",
    padding: "8px 16px",
    borderRadius: "4px",
    border: `1px solid ${palette.border}`,
    background: "transparent",
    color: palette.text,
    cursor: "pointer",
  },
  details: {
    marginTop: "16px",
    fontSize: "0.8125rem",
    color: palette.muted,
  },
  pre: {
    margin: "8px 0 0",
    padding: "8px",
    background: "#f4f4f6",
    borderRadius: "4px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: "0.75rem",
  },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reloading: false };
    this.handleReload = this.handleReload.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Pure by contract — the reload decision happens in componentDidCatch.
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Render failed", error, info?.componentStack);

    if (isChunkLoadError(error) && claimReload()) {
      this.setState({ reloading: true });
      window.location.reload();
    }
  }

  handleReload() {
    window.location.reload();
  }

  handleRetry() {
    this.setState({ error: null, reloading: false });
  }

  render() {
    const { error, reloading } = this.state;
    const { children, compact, label } = this.props;

    if (!error) return children;

    const stale = isChunkLoadError(error);

    if (reloading) {
      return (
        <div style={compact ? styles.compact : styles.page}>
          <div style={styles.card}>
            <p style={styles.body}>Loading the latest version…</p>
          </div>
        </div>
      );
    }

    return (
      <div style={compact ? styles.compact : styles.page}>
        <div style={styles.card}>
          <h2 style={styles.heading}>
            {stale ? "This tab is out of date" : "Something went wrong"}
          </h2>
          <p style={styles.body}>
            {stale
              ? "yt-diff was updated while this tab was open, so part of it could no longer be loaded. Reloading picks up the new version."
              : `${label || "yt-diff"} stopped unexpectedly. Reloading usually clears it; if it keeps happening, the details below are worth reporting.`}
          </p>
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.button}
              onClick={this.handleReload}
            >
              Reload
            </button>
            {compact && !stale && (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={this.handleRetry}
              >
                Try again
              </button>
            )}
          </div>
          <details style={styles.details}>
            <summary>Details</summary>
            <pre style={styles.pre}>{String(error.message || error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  /** Renders the panel inline, for a boundary around one region rather than the app. */
  compact: PropTypes.bool,
  /** Names the region in the message, e.g. "The playlist view". */
  label: PropTypes.string,
};
