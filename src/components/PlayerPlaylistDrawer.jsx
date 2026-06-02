import { useState, useMemo, useCallback } from "react";
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
  activeDownloads,
  loadedPlayList,
  backEnd,
  token,
  baseUrl,
  rowsPerPage,
}) {
  const theme = useTheme();
  // Track URLs where the user clicked download but socket events haven't arrived yet
  const [pendingDownloadsRaw, setPendingDownloadsRaw] = useState({});

  // Derived: strip out URLs that have appeared in activeDownloads or became downloaded
  const pendingDownloads = useMemo(() => {
    const filtered = {};
    for (const url of Object.keys(pendingDownloadsRaw)) {
      const inActive = activeDownloads[url] !== undefined;
      const item = items?.find(
        (el) => el.video_metadatum?.videoUrl === url,
      );
      const isDownloaded = item?.video_metadatum?.downloadStatus;
      if (!inActive && !isDownloaded) {
        filtered[url] = true;
      }
    }
    return filtered;
  }, [pendingDownloadsRaw, activeDownloads, items]);

  const totalPages = Math.max(1, Math.ceil(itemCount / rowsPerPage));

  const handleDownload = useCallback(
    async (videoUrl) => {
      // Prevent double-clicks
      if (pendingDownloads[videoUrl]) return;
      setPendingDownloadsRaw((prev) => ({ ...prev, [videoUrl]: true }));

      try {
        const response = await fetch(backEnd + "/download", {
          method: "post",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
          body: JSON.stringify({
            urlList: [videoUrl],
            playListUrl: loadedPlayList,
          }),
        });

        if (!response.ok) {
          // Remove pending state on failure so user can retry
          setPendingDownloadsRaw((prev) => {
            const next = { ...prev };
            delete next[videoUrl];
            return next;
          });
        }
      } catch (error) {
        console.error("Download request failed", error);
        setPendingDownloadsRaw((prev) => {
          const next = { ...prev };
          delete next[videoUrl];
          return next;
        });
      }
    },
    [backEnd, token, loadedPlayList, pendingDownloads],
  );

  const fallbackThumbURL =
    baseUrl +
    backEnd +
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
        const downloadProgress = activeDownloads[meta.videoUrl];
        const isDownloading = downloadProgress !== undefined;
        const isPending = !!pendingDownloads[meta.videoUrl];

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
              opacity: isAvailable || isDownloading || isPending ? 1 : 0.5,
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                src={thumbImg}
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
                isDownloading || isPending ? null : !isAvailable
                  ? "Not Downloaded"
                  : null
              }
              secondaryTypographyProps={{
                variant: "caption",
                color: "rgba(255,255,255,0.5)",
              }}
            />
            {/* Download button for non-downloaded, non-active items */}
            {!isAvailable && !isDownloading && !isPending && (
              <Tooltip title="Download video">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(meta.videoUrl);
                  }}
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    "&:hover": { color: "#66bb6a" },
                    flexShrink: 0,
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {/* Progress bar at bottom of row for actively downloading items */}
            {(isDownloading || isPending) && (
              <LinearProgress
                variant={
                  isDownloading &&
                  downloadProgress >= 0 &&
                  downloadProgress <= 100
                    ? "determinate"
                    : "indeterminate"
                }
                value={
                  isDownloading &&
                  downloadProgress >= 0 &&
                  downloadProgress <= 100
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
                    bgcolor: "#66bb6a",
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
    pendingDownloads,
    handleDownload,
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
          sx={{ color: "white" }}
        >
          <ArrowBackIcon sx={{ transform: "rotate(180deg)" }} />
        </IconButton>
      </Box>

      {/* Items list */}
      <List sx={{ overflowY: "auto", flex: 1 }}>
        {playlistItems}
      </List>

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
  activeDownloads: PropTypes.object,
  loadedPlayList: PropTypes.string,
  backEnd: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  baseUrl: PropTypes.string,
  rowsPerPage: PropTypes.number,
};
