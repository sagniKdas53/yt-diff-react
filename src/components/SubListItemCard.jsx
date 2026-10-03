import { memo, useContext, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Checkbox from "@mui/material/Checkbox";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import ButtonGroup from "@mui/material/ButtonGroup";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { PlaylistRemove as PlaylistRemoveIcon } from "@mui/icons-material";
import { DeleteSweep as DeleteSweepIcon } from "@mui/icons-material";
import { DeleteForever as DeleteForeverIcon } from "@mui/icons-material";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { Queue as QueueIcon } from "@mui/icons-material";
import { CloudSync as CloudSyncIcon } from "@mui/icons-material";

import { NotificationContext } from "../contexts/NotificationContext";
import { useApiClient } from "../hooks/useApiClient.js";
import { assetBase } from "../config.js";

/**
 * One row of `/getsub`, as the card renders it.
 *
 * `element` is typed from the generated contract rather than
 * `PropTypes.object`, so `element.video_metadatum.videoUrl` — the Sequelize
 * association name the audit found reaching JSX with nothing describing it —
 * is now checked against what the endpoint actually returns.
 *
 * @typedef {import("../api/generated/apiTypes.js").GetsubResponse["rows"][number]} SubListRow
 */

/**
 * A row's metadata, widened with the one field `/getsub` does not return.
 *
 * `reason` only ever arrives on the `download-done` frame and is patched onto
 * the row by `SubList`, so a row refreshed from `/getsub` has it undefined and
 * the chip falls back to naming the extras without saying why.
 *
 * @typedef {SubListRow["video_metadatum"] & {reason?: string | null}} RowMeta
 */

/**
 * The card's props.
 *
 * @typedef {Object} SubListItemCardProps
 * @property {SubListRow} element
 * @property {number} index
 * @property {number} mediaHeight
 * @property {string} [thumbUrl]
 * @property {string} playlistDirectory
 * @property {boolean} isQueued
 * @property {number} [queuePosition]
 * @property {boolean} isActivelyDownloading
 * @property {boolean} isSelected
 * @property {string} [loadedPlayList]
 * @property {(event: import("react").ChangeEvent<HTMLInputElement>, checked: boolean) => void} onSelect
 *   Passed straight to the row's Checkbox, so it takes the change event.
 * @property {(index: number) => void} onPlay
 * @property {(id: string) => void} onRemove
 * @property {(id: string) => void} onDeleteDownloaded
 * @property {(id: string) => void} onDeleteDB
 * @property {(saveDirectory: string, fileName: string) => void} onDownloadFile
 */

/**
 * `memo`'s result is typed as a `NamedExoticComponent`, which does not declare
 * `propTypes` — but React reads it at runtime and eslint's `react/prop-types`
 * requires it, so the runtime object really does carry one. Named here rather
 * than suppressed.
 *
 * @type {import("react").NamedExoticComponent<SubListItemCardProps> & {propTypes?: object}}
 */
const SubListItemCard = memo(
  /** @param {SubListItemCardProps} props */
  function SubListItemCard({
    element,
    index,
    mediaHeight,
    thumbUrl,
    playlistDirectory,
    isQueued,
    queuePosition,
    isActivelyDownloading,
    isSelected,
    onSelect,
    onPlay,
    onRemove,
    onDeleteDownloaded,
    onDeleteDB,
    onDownloadFile,
  }) {
    const theme = useTheme();
    /** @type {RowMeta} */
    const meta = element.video_metadatum || {};
    const { setSnack, addNotification } = useContext(NotificationContext);
    const api = useApiClient();

    // What `/getsub` last reported for this row.
    const serverMissing = Array.isArray(meta.missingExtras)
      ? meta.missingExtras
      : null;
    const serverKey = serverMissing ? serverMissing.join(",") : "";

    // A `/syncextras` reply narrows the list locally, since nothing refetches
    // the row. The override is stamped with the server list it answered, so a
    // later `/getsub` refresh that reports something else takes over again
    // rather than being masked by what the retry once said.
    const [localMissing, setLocalMissing] = useState(null);
    const missingExtras =
      localMissing && localMissing.key === serverKey
        ? localMissing.value
        : serverMissing;

    const reason =
      typeof meta.reason === "string" && meta.reason.length > 0
        ? meta.reason
        : null;
    const partialChip =
      missingExtras && missingExtras.length > 0
        ? `partial: ${missingExtras.join(", ")}${
            reason
              ? ` (${reason === "rate-limited" ? "rate limited" : reason})`
              : ""
          }`
        : null;

    const [syncing, setSyncing] = useState(false);
    // `syncing` state alone does not close the gap between a click and the
    // re-render that disables the item, and two clicks in that window would
    // start two requests for the same video.
    const syncInFlightRef = useRef(false);
    const [menuAnchor, setMenuAnchor] = useState(null);

    const fetchMissingExtras = async () => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      setSyncing(true);
      setMenuAnchor(null);
      const label = meta.title || meta.videoUrl;
      try {
        const result = await api.post("/syncextras", {
          videoUrl: meta.videoUrl,
        });
        const stillMissing = Array.isArray(result.stillMissing)
          ? result.stillMissing
          : [];
        setLocalMissing({ key: serverKey, value: stillMissing });

        if (stillMissing.length === 0) {
          const recovered = Array.isArray(result.recovered)
            ? result.recovered
            : [];
          const message =
            result.status === "unchanged"
              ? `Nothing left to fetch for ${label}`
              : `Fetched ${recovered.join(", ")} for ${label}`;
          setSnack(message, result.status === "unchanged" ? "info" : "success");
          addNotification(
            message,
            result.status === "unchanged" ? "info" : "success",
          );
        } else {
          const message = `Still missing ${stillMissing.join(", ")} for ${label}`;
          setSnack(message, "warning");
          addNotification(message, "warning");
        }
      } catch (error) {
        // A dead session has already been reported once, by apiFetch.
        if (error.sessionExpired) return;
        const message = `Failed to fetch missing extras for ${label}: ${error.message}`;
        setSnack(message, "error");
        addNotification(message, "error");
      } finally {
        syncInFlightRef.current = false;
        setSyncing(false);
      }
    };

    return (
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderColor: isActivelyDownloading
            ? "success.main"
            : isQueued
              ? "secondary.main"
              : "divider",
          borderWidth: isActivelyDownloading || isQueued ? 2 : 1,
          bgcolor: isActivelyDownloading
            ? (t) =>
                t.palette.mode === "dark"
                  ? "rgba(102, 187, 106, 0.08)"
                  : "rgba(67, 160, 71, 0.06)"
            : isQueued
              ? (t) =>
                  t.palette.mode === "dark"
                    ? "rgba(179, 157, 219, 0.08)"
                    : "rgba(92, 107, 192, 0.06)"
              : undefined,
          minWidth: 125,
          transition: "box-shadow 0.2s, border-color 0.2s",
          "&:hover": {
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: mediaHeight,
            width: "100%",
            bgcolor: "black",
          }}
        >
          <CardMedia
            component="img"
            height={mediaHeight}
            image={
              thumbUrl
                ? thumbUrl
                : meta.onlineThumbnail
                  ? meta.onlineThumbnail
                  : meta.downloadStatus
                    ? assetBase +
                      (theme.palette.mode === "light"
                        ? "/404-light.png"
                        : "/404.png")
                    : assetBase +
                      (theme.palette.mode === "light"
                        ? "/204-light.png"
                        : "/204.png")
            }
            alt={meta.title}
            loading="lazy"
            sx={{
              opacity: meta.downloadStatus ? 0.7 : 1,
              objectFit: "contain",
            }}
          />
          {meta.downloadStatus && (
            <IconButton
              onClick={() => onPlay(index)}
              aria-label="play video"
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
                backgroundColor: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.8)",
                },
              }}
              size="large"
            >
              <PlayArrowIcon sx={{ fontSize: 40 }} />
            </IconButton>
          )}
        </Box>
        <CardContent sx={{ flex: 1, my: 0, pb: 0 }}>
          <Typography variant="subtitle1" component="div">
            <Link
              href={meta.videoUrl}
              color={
                meta.isAvailable
                  ? "inherit"
                  : meta.title === "[Deleted video]"
                    ? "error"
                    : meta.title === "[Private video]"
                      ? "#f57c00"
                      : "inherit"
              }
              underline="hover"
              target="_blank"
              rel="noreferrer"
            >
              {meta.title}
            </Link>
          </Typography>
          {partialChip && (
            <Chip
              color="warning"
              size="small"
              variant="outlined"
              label={partialChip}
              sx={{ mt: 0.5, maxWidth: "100%" }}
            />
          )}
        </CardContent>
        <CardActions sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Checkbox
              color="primary"
              checked={isSelected}
              onChange={onSelect}
              id={meta.videoUrl}
            />
            {isQueued && (
              <Chip
                icon={<QueueIcon />}
                label={`#${queuePosition}`}
                size="small"
                color={isActivelyDownloading ? "success" : "secondary"}
                variant="outlined"
              />
            )}
          </Box>
          <ButtonGroup size="small">
            <Tooltip title="Remove video from playlist">
              <IconButton
                onClick={() => onRemove(element.id)}
                aria-label="remove video from playlist"
                size="large"
              >
                <PlaylistRemoveIcon color="warning" />
              </IconButton>
            </Tooltip>
            {meta.downloadStatus ? (
              <Tooltip title="Delete the downloaded files">
                <IconButton
                  onClick={() => onDeleteDownloaded(element.id)}
                  aria-label="delete downloaded files"
                  size="large"
                >
                  <DeleteSweepIcon color="success" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Delete video from DB">
                <IconButton
                  onClick={() => onDeleteDB(element.id)}
                  aria-label="delete video from database"
                  size="large"
                >
                  <DeleteForeverIcon color="error" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Download file">
              <IconButton
                onClick={() =>
                  onDownloadFile(
                    meta.saveDirectory ?? playlistDirectory,
                    meta.fileName,
                  )
                }
                aria-label="download file"
                size="large"
              >
                <FileDownloadIcon
                  color={meta.downloadStatus ? "success" : "disabled"}
                  sx={{ pt: 0.3 }}
                />
              </IconButton>
            </Tooltip>
            {partialChip && (
              <Tooltip title="Fetch missing extras">
                <IconButton
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                  aria-label="fetch missing extras"
                  size="large"
                >
                  {syncing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <CloudSyncIcon color="warning" sx={{ pt: 0.3 }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </ButtonGroup>
        </CardActions>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={fetchMissingExtras} disabled={syncing}>
            {syncing ? "Fetching missing extras…" : "Fetch missing extras"}
          </MenuItem>
        </Menu>
      </Card>
    );
  },
);

SubListItemCard.propTypes = {
  element: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  mediaHeight: PropTypes.number.isRequired,
  thumbUrl: PropTypes.string,
  playlistDirectory: PropTypes.string.isRequired,
  isQueued: PropTypes.bool.isRequired,
  queuePosition: PropTypes.number,
  isActivelyDownloading: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool.isRequired,
  loadedPlayList: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onPlay: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onDeleteDownloaded: PropTypes.func.isRequired,
  onDeleteDB: PropTypes.func.isRequired,
  onDownloadFile: PropTypes.func.isRequired,
};

export default SubListItemCard;
