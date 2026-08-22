import { useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";

import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { NavigateBefore as NavigateBeforeIcon } from "@mui/icons-material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";

import { useTheme } from "@mui/material/styles";

import { DownloadContext } from "../contexts/DownloadContext";
import { assetBase } from "../config.js";

export default function PlayerPlaylistDrawer({
  drawerOpen,
  setDrawerOpen,
  items,
  itemCount,
  page,
  start,
  currentPlayerIndex,
  setPage,
  openPlayer,
  playlistDirectory,
  thumbUrls,
  loadedPlayList,
  rowsPerPage,
}) {
  const { activeDownloads, queuedItems, queueDownloads } =
    useContext(DownloadContext);
  const theme = useTheme();

  const totalPages = Math.max(1, Math.ceil(itemCount / rowsPerPage));

  const handleDownload = useCallback(
    (videoUrl, positionInPlaylist) => {
      if (Reflect.has(queuedItems, videoUrl)) return;

      queueDownloads([
        {
          url: videoUrl,
          playlistUrl: loadedPlayList,
          positionInPlaylist: positionInPlaylist || 0,
        },
      ]);
    },
    [loadedPlayList, queueDownloads, queuedItems],
  );

  const fallbackThumbURL =
    assetBase +
    (theme.palette.mode === "light" ? "/404-light.png" : "/404.png");

  const playlistItems = useMemo(() => {
    return (
      items &&
      items.map((element, index) => {
        const meta = element.video_metadatum || {};
        const thumb = meta.thumbNailFile || "";
        const thumbImg = thumbUrls[thumb]
          ? thumbUrls[thumb]
          : meta.onlineThumbnail
            ? meta.onlineThumbnail
            : fallbackThumbURL;
        const isCurrent = index === currentPlayerIndex;
        const isAvailable = meta.downloadStatus;
        const downloadProgress = Reflect.get(activeDownloads, meta.videoUrl);
        const isDownloading = downloadProgress !== undefined;
        const queueItem = Reflect.get(queuedItems, meta.videoUrl);
        const isQueued = !!queueItem;

        return (
          <ListItemButton
            key={index}
            selected={isCurrent}
            onClick={() => {
              if (openPlayer && isAvailable) {
                openPlayer(
                  meta.saveDirectory ?? playlistDirectory,
                  meta.fileName,
                  meta.title,
                  index,
                  meta.subTitleFile || null,
                );
              }
            }}
            sx={{
              position: "relative",
              overflow: "hidden",
              cursor: isAvailable ? "pointer" : "default",
              "&.Mui-selected": {
                bgcolor: "rgba(25, 118, 210, 0.3)",
                "&:hover": {
                  bgcolor: "rgba(25, 118, 210, 0.5)",
                },
              },
              opacity: isAvailable || isDownloading ? 1 : isQueued ? 0.7 : 0.5,
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                src={thumbImg}
                // The drawer lists a whole playlist, so most of these are
                // scrolled well past the viewport. Avatar renders its own
                // <img>, which is the only element the attribute means
                // anything on.
                slotProps={{ img: { loading: "lazy" } }}
                sx={{ width: 60, height: 45, mr: 1 }}
              />
            </ListItemAvatar>
            <ListItemText
              primary={meta.title || "Unknown Title"}
              primaryTypographyProps={{
                variant: "body2",
                noWrap: true,
                fontWeight: isCurrent ? "bold" : "normal",
              }}
              secondary={
                isDownloading
                  ? null
                  : isQueued
                    ? `Queued #${queueItem.queuePosition}`
                    : !isAvailable
                      ? "Not Downloaded"
                      : null
              }
              secondaryTypographyProps={{
                variant: "caption",
                color: isQueued
                  ? theme.palette.info.main
                  : "rgba(255,255,255,0.5)",
              }}
            />
            {/* Download button for non-downloaded, non-active items */}
            {!isAvailable && !isDownloading && !isQueued && (
              <Tooltip title="Download video">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(meta.videoUrl, element.positionInPlaylist);
                  }}
                  aria-label="Download video"
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    "&:hover": { color: theme.palette.success.main },
                    flexShrink: 0,
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {/* Progress bar at bottom of row — only when download has actually started */}
            {isDownloading && (
              <LinearProgress
                variant={
                  downloadProgress >= 0 && downloadProgress <= 100
                    ? "determinate"
                    : "indeterminate"
                }
                value={
                  downloadProgress >= 0 && downloadProgress <= 100
                    ? downloadProgress
                    : undefined
                }
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  bgcolor: "rgba(255,255,255,0.08)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: theme.palette.success.main,
                  },
                }}
              />
            )}
          </ListItemButton>
        );
      })
    );
  }, [
    items,
    currentPlayerIndex,
    thumbUrls,
    fallbackThumbURL,
    openPlayer,
    playlistDirectory,
    activeDownloads,
    queuedItems,
    handleDownload,
    theme.palette.success.main,
    theme.palette.info.main,
  ]);

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      variant="persistent"
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: 350 },
          bgcolor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          color: "white",
          boxSizing: "border-box",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          position: "absolute",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography variant="h6">Current Playlist</Typography>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          aria-label="close drawer"
          sx={{ color: "white" }}
        >
          <ArrowBackIcon sx={{ transform: "rotate(180deg)" }} />
        </IconButton>
      </Box>

      {/* Items list */}
      <List sx={{ overflowY: "auto", flex: 1 }}>{playlistItems}</List>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 1,
            px: 2,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            bgcolor: "rgba(0,0,0,0.3)",
            flexShrink: 0,
          }}
        >
          <IconButton
            size="small"
            disabled={page <= 0}
            onClick={() => setPage(page - 1)}
            aria-label="previous page"
            sx={{
              color: "white",
              "&.Mui-disabled": { color: "rgba(255,255,255,0.2)" },
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.7)", userSelect: "none" }}
          >
            {page + 1} / {totalPages}
          </Typography>
          <IconButton
            size="small"
            disabled={start + (items ? items.length : 0) >= itemCount}
            onClick={() => setPage(page + 1)}
            aria-label="next page"
            sx={{
              color: "white",
              "&.Mui-disabled": { color: "rgba(255,255,255,0.2)" },
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      )}
    </Drawer>
  );
}

PlayerPlaylistDrawer.propTypes = {
  drawerOpen: PropTypes.bool.isRequired,
  setDrawerOpen: PropTypes.func.isRequired,
  items: PropTypes.array,
  itemCount: PropTypes.number,
  page: PropTypes.number,
  start: PropTypes.number,
  currentPlayerIndex: PropTypes.number,
  setPage: PropTypes.func,
  openPlayer: PropTypes.func,
  playlistDirectory: PropTypes.string,
  thumbUrls: PropTypes.object,
  loadedPlayList: PropTypes.string,
  rowsPerPage: PropTypes.number,
};
