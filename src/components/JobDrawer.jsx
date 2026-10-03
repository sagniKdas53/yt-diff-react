import PropTypes from "prop-types";
import { useCallback, useContext, useMemo, useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import {
  Download as DownloadIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  PlaylistPlay as ListingIcon,
} from "@mui/icons-material";
import { useJobQueue } from "../hooks/useJobQueue.js";
import { NotificationContext } from "../contexts/NotificationContext.jsx";

/**
 * @typedef {"default"|"primary"|"secondary"|"error"|"info"|"success"|"warning"} BadgeColor
 */

/**
 * Bytes in the units a person reads, not the units the network counts in.
 *
 * Decimal rather than binary, because that is how every file size a person
 * has ever been shown was labelled — a "700 MB" video is 700 MB here too.
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/** Seconds as "about four minutes", or "" when there is nothing to say. */
function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.round(minutes / 60)}h left`;
}

/**
 * The running order of a queue: what is happening, then what is waiting, then
 * what was stopped. Paused sits last because nothing is happening to it.
 */
const STATE_ORDER = { running: 0, queued: 1, paused: 2 };

/**
 * The order given to a state this build does not know about. An unknown state
 * gets no claim to be happening or waiting, so it sorts after every known one —
 * past the last entry in STATE_ORDER, whose value is read rather than repeated
 * here so that adding a state cannot quietly make this tie with it.
 */
const UNKNOWN_STATE_ORDER = Math.max(...Object.values(STATE_ORDER)) + 1;

function byActivity(a, b) {
  const byState =
    (STATE_ORDER[a.state] ?? UNKNOWN_STATE_ORDER) -
    (STATE_ORDER[b.state] ?? UNKNOWN_STATE_ORDER);
  // A job the server sent without a position is as close to the front as a
  // position of 0, so a missing number never becomes a NaN comparison.
  return byState !== 0
    ? byState
    : (a.queuePosition ?? 0) - (b.queuePosition ?? 0);
}

/**
 * One job, its progress, and the actions its state allows.
 *
 * The controls are derived from `state` rather than from flags the server
 * sends alongside it — a `pausable` field is one more thing that can disagree
 * with the state it describes, and this is the only place that would notice.
 */
function JobRow({ job, kind, onAct, busy }) {
  const running = job.state === "running";
  const paused = job.state === "paused";
  const queued = job.state === "queued";

  let detail = "";
  if (queued) {
    detail = job.queuePosition > 0
      ? `Queued · position ${job.queuePosition}`
      : "Queued";
  } else if (paused) {
    detail = kind === "download"
      ? "Paused · partial file kept"
      : "Paused · partial index kept";
  } else if (kind === "listing") {
    detail = job.itemsIndexed
      ? `Running · ${job.itemsIndexed} items indexed`
      : "Running";
  } else if (job.progress) {
    const { downloadedBytes, totalBytes, bytesPerSecond, etaSeconds } =
      job.progress;
    const bits = [];
    if (Number.isFinite(downloadedBytes)) {
      bits.push(
        totalBytes
          ? `${formatBytes(downloadedBytes)} of ${formatBytes(totalBytes)}`
          : formatBytes(downloadedBytes),
      );
    }
    if (Number.isFinite(bytesPerSecond) && bytesPerSecond > 0) {
      bits.push(`${formatBytes(bytesPerSecond)}/s`);
    }
    const eta = formatEta(etaSeconds);
    if (eta) bits.push(eta);
    detail = bits.length ? `Running · ${bits.join(" · ")}` : "Running";
  } else {
    detail = "Running";
  }

  // A download with a known total can be shown exactly; one without cannot,
  // and an indeterminate bar is the honest answer rather than a fake fraction.
  const known = job.progress && job.progress.totalBytes > 0;
  const percent = known
    ? Math.min(100, (job.progress.downloadedBytes / job.progress.totalBytes) * 100)
    : null;

  return (
    // A plain column rather than a ListItem: ListItem's `secondaryAction` is
    // absolutely positioned against the text, which put the buttons straight
    // over the progress line. Nothing here is a list item semantically either
    // — it is a row of controls that has to lay out top to bottom.
    <Box
      // Stable hook for the row, so a test can scope to one job's controls
      // rather than to whatever happens to wrap them.
      data-job={job.id}
      sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}
    >
      <Typography variant="body2" noWrap title={job.title || job.url}>
        {job.title || job.url}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        {detail}
      </Typography>
      {/* A listing runs for minutes with no number to show, so it is
          indeterminate by nature; a download has real bytes and says so. A
          queued or paused job shows no bar at all — there is nothing in
          flight to be a fraction of. */}
      {running &&
        (kind === "listing" || percent === null ? (
          <LinearProgress
            aria-label={`${job.title || job.url} progress`}
            sx={{ mt: 1 }}
          />
        ) : (
          <LinearProgress
            aria-label={`${job.title || job.url} progress`}
            variant="determinate"
            value={percent}
            sx={{ mt: 1 }}
          />
        ))}
      {paused && (
        <Chip
          size="small"
          label={kind === "download" ? "Kept on disk" : "Kept in index"}
          sx={{ mt: 1, alignSelf: "flex-start" }}
        />
      )}
      {queued && (
        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
          Nothing downloaded yet — cancelling this one costs nothing.
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        {running && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PauseIcon fontSize="small" />}
            disabled={busy}
            onClick={() => onAct(job.id, "pause")}
          >
            Pause
          </Button>
        )}
        {paused && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayIcon fontSize="small" />}
            disabled={busy}
            onClick={() => onAct(job.id, "resume")}
          >
            Resume
          </Button>
        )}
        <Button
          size="small"
          color="error"
          disabled={busy}
          onClick={() => onAct(job.id, "cancel")}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

JobRow.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    title: PropTypes.string,
    state: PropTypes.string.isRequired,
    queuePosition: PropTypes.number,
    progress: PropTypes.object,
    itemsIndexed: PropTypes.number,
  }).isRequired,
  kind: PropTypes.string.isRequired,
  onAct: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

/** A titled group of jobs, or nothing at all when the group is empty. */
function JobGroup({ heading, Icon, jobs, kind, onAct, busyId }) {
  if (jobs.length === 0) return null;
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pt: 2 }}>
        <Icon fontSize="small" />
        <Typography variant="subtitle2" color="text.secondary">
          {heading}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {jobs.length}
        </Typography>
      </Box>
      <Box>
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            kind={kind}
            onAct={onAct}
            busy={busyId === job.id}
          />
        ))}
      </Box>
    </Box>
  );
}

JobGroup.propTypes = {
  heading: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  jobs: PropTypes.array.isRequired,
  kind: PropTypes.string.isRequired,
  onAct: PropTypes.func.isRequired,
  busyId: PropTypes.string,
};

/**
 * Every download and playlist listing the server is running or holding, and
 * the three things that can be done to each one.
 *
 * The toolbar button sits beside the notification manager's because the two
 * answer the same question — what is the server doing for me right now — and a
 * user watching a long index should not have to hunt for either.
 *
 * @param {{enabled: boolean, badgeColor: BadgeColor}} props
 *   `enabled` is whether there is a session to poll with; without one there is
 *   no queue to read, so the button is not rendered at all.
 */
export default function JobDrawer({ enabled, badgeColor }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { setSnack } = useContext(NotificationContext);
  const { jobs, error, act } = useJobQueue({ enabled, open });

  const downloads = useMemo(
    () => [...jobs.downloads].sort(byActivity),
    [jobs.downloads],
  );
  const listings = useMemo(
    () => [...jobs.listings].sort(byActivity),
    [jobs.listings],
  );
  const active = downloads.length + listings.length;

  const onAct = useCallback(
    async (id, action) => {
      setBusyId(id);
      try {
        await act(id, action);
      } catch (failure) {
        // A refused action and a dropped connection are both just a button
        // that visibly did nothing, and the user pressed it. `api.post`
        // throws an `ApiError` carrying the server's own message for a
        // refusal, and something bare for anything that never reached the
        // server — hence the fallback rather than a bare `failure.message`.
        // A dead session is already reported by the transport itself.
        if (failure?.sessionExpired) return;
        const reason =
          failure?.message ??
          (Number.isFinite(failure?.status)
            ? `Request failed (${failure.status})`
            : "the server did not answer");
        setSnack(`Failed to ${action} ${id}: ${reason}`, "error");
      } finally {
        setBusyId(null);
      }
    },
    [act, setSnack],
  );

  if (!enabled) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        color="inherit"
        sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}
        aria-label="Downloads"
      >
        <Badge
          color={badgeColor}
          badgeContent={active}
          variant={active > 0 ? "standard" : "dot"}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <DownloadIcon />
        </Badge>
        <Typography
          variant="button"
          display={{ xs: "none", sm: "none", md: "block" }}
        >
          Downloads
        </Typography>
      </Button>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box
            sx={{
              p: 2,
              position: "sticky",
              top: 0,
              bgcolor: "background.paper",
              zIndex: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ m: 0 }}>
              Downloads
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {active} job{active === 1 ? "" : "s"} running or queued
            </Typography>
          </Box>
          {error && (
            <Box sx={{ px: 2, pt: 1 }}>
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            </Box>
          )}
          <Box sx={{ flexGrow: 1, overflowY: "auto", pb: 2 }}>
            <JobGroup
              heading="Listings"
              Icon={ListingIcon}
              jobs={listings}
              kind="listing"
              onAct={onAct}
              busyId={busyId}
            />
            {listings.length > 0 && downloads.length > 0 && (
              <Divider sx={{ mt: 2 }} />
            )}
            <JobGroup
              heading="Videos"
              Icon={DownloadIcon}
              jobs={downloads}
              kind="download"
              onAct={onAct}
              busyId={busyId}
            />
            {active === 0 && !error && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pt: 3 }}
              >
                Nothing running or queued.
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

JobDrawer.propTypes = {
  enabled: PropTypes.bool,
  badgeColor: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "error",
    "info",
    "success",
    "warning",
  ]),
};