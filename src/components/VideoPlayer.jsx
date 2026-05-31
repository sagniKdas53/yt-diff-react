import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { Pause as PauseIcon } from "@mui/icons-material";
import { SkipNext as SkipNextIcon } from "@mui/icons-material";
import { SkipPrevious as SkipPreviousIcon } from "@mui/icons-material";
import { QueueMusic as QueueMusicIcon } from "@mui/icons-material";
import { Replay10 as Replay10Icon } from "@mui/icons-material";
import { Forward10 as Forward10Icon } from "@mui/icons-material";
import { VolumeUp as VolumeUpIcon } from "@mui/icons-material";
import { VolumeOff as VolumeOffIcon } from "@mui/icons-material";
import { Fullscreen as FullscreenIcon } from "@mui/icons-material";
import { FullscreenExit as FullscreenExitIcon } from "@mui/icons-material";
import { PictureInPictureAlt as PictureInPictureAltIcon } from "@mui/icons-material";
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

import { styled, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const ControlBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
  padding: theme.spacing(2),
  transition: "opacity 0.3s ease-in-out",
  opacity: show ? 1 : 0,
  pointerEvents: show ? "auto" : "none",
  zIndex: 2,
}));

const TopBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  background: "linear-gradient(rgba(0,0,0,0.8), transparent)",
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  transition: "opacity 0.3s ease-in-out",
  opacity: show ? 1 : 0,
  pointerEvents: show ? "auto" : "none",
  zIndex: 2,
}));
const AutoPlaySwitch = styled(Switch)(() => ({
  width: 42,
  height: 24,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 2,
    "&.Mui-checked": {
      transform: "translateX(18px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#fff",
      },
      "& .MuiSwitch-thumb": {
        backgroundColor: "#000",
        "&:before": {
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>')`,
        },
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    backgroundColor: "#fff",
    "&:before": {
      content: "''",
      position: "absolute",
      width: "100%",
      height: "100%",
      left: 0,
      top: 0,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24"><path fill="%23000" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>')`,
    },
  },
  "& .MuiSwitch-track": {
    borderRadius: 24 / 2,
    opacity: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
}));

export default function VideoPlayer({
  saveDirectory,
  fileName,
  title,
  backEnd,
  token,
  onClose,
  items = [],
  itemCount = 0,
  page = 0,
  start = 0,
  currentPlayerIndex = -1,
  setPage,
  openPlayer,
  playlistDirectory,
  thumbUrls = {},
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("ytdiff_player_volume");
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("ytdiff_player_muted");
    return saved === "true";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(() => {
    const saved = localStorage.getItem("ytdiff_player_autoplay");
    return saved === "true";
  });
  const [pendingNextPage, setPendingNextPage] = useState(false);
  const [pendingPrevPage, setPendingPrevPage] = useState(false);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [bufferedTime, setBufferedTime] = useState(0);

  const pipSupported =
    "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const fileIdRef = useRef(null);
  const expiryRef = useRef(null);
  const timerRef = useRef(null);
  const recoveryTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const itemsAtTimeOfNext = useRef(null);
  const itemsAtTimeOfPrev = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const drawerOpenRef = useRef(drawerOpen);
  const volumeTapRef = useRef(null);
  const mobileVolumeTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const playerSessionRef = useRef(0);

  const baseUrl = import.meta.env.PROD ? globalThis.location.origin : "";

  const clearRefreshTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const fetchSignedUrl = async (isRecovery = false, resumeTime = 0) => {
    const sessionId = playerSessionRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearRecoveryTimer();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setErrorMsg(null);
      if (!isRecovery) {
        setCurrentTime(0);
        setDuration(0);
        setBufferedTime(0);
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
      const response = await fetch(backEnd + "/getfile", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        mode: "cors",
        signal: controller.signal,
        body: JSON.stringify({ saveDirectory, fileName }),
      });

      if (!response.ok) {
        const text = await response.json().catch(() => response.statusText);
        throw new Error(text?.message || response.statusText);
      }

      const data = await response.json();
      if (!isMountedRef.current || playerSessionRef.current !== sessionId) {
        return;
      }
      if (data.status === "success" && data.signedUrlId) {
        fileIdRef.current = data.signedUrlId;
        expiryRef.current = data.expiry;

        const newUrl =
          baseUrl +
          backEnd +
          "/getfile?fileId=" +
          data.signedUrlId +
          "&inline=true";
        setVideoUrl(newUrl);
        setErrorMsg(null);
        scheduleRefresh(data.signedUrlId, sessionId, data.expiry);

        if (isRecovery && videoRef.current) {
          recoveryTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              playerSessionRef.current === sessionId &&
              fileIdRef.current === data.signedUrlId &&
              videoRef.current
            ) {
              videoRef.current.currentTime = resumeTime;
              videoRef.current
                .play()
                .catch((e) => console.error("Auto-resume failed", e));
            }
          }, 100);
        }
      } else {
        throw new Error("Failed to get download URL");
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("fetchSignedUrl error:", error);
      if (!isMountedRef.current || playerSessionRef.current !== sessionId) {
        return;
      }
      setErrorMsg(error.message);
      setVideoUrl(null);
    } finally {
      if (isMountedRef.current && playerSessionRef.current === sessionId) {
        setLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const scheduleRefresh = useCallback(
    (
      scheduledFileId = fileIdRef.current,
      scheduledSessionId = playerSessionRef.current,
      scheduledExpiry = expiryRef.current,
    ) => {
      clearRefreshTimer();
      if (!scheduledExpiry || !scheduledFileId) return;

      const timeUntilExpiry = scheduledExpiry - Date.now();
      // refresh the file 5 mins before expiry (300000 ms)
      const refreshTime = Math.max(0, timeUntilExpiry - 300000);

      timerRef.current = setTimeout(async () => {
        if (
          !isMountedRef.current ||
          playerSessionRef.current !== scheduledSessionId ||
          fileIdRef.current !== scheduledFileId
        ) {
          return;
        }
        try {
          const res = await fetch(backEnd + "/refreshfile", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            mode: "cors",
            body: JSON.stringify({ fileId: scheduledFileId }),
          });

          if (res.ok) {
            const data = await res.json();
            if (
              data.status === "success" &&
              isMountedRef.current &&
              playerSessionRef.current === scheduledSessionId &&
              fileIdRef.current === scheduledFileId
            ) {
              expiryRef.current = data.expiry;
              scheduleRefresh(scheduledFileId, scheduledSessionId, data.expiry);
            }
          }
        } catch (err) {
          if (
            isMountedRef.current &&
            playerSessionRef.current === scheduledSessionId
          ) {
            console.error("Auto-refresh failed", err);
          }
        }
      }, refreshTime);
    },
    [backEnd, clearRefreshTimer, token],
  );

  // Keep refs in sync so setTimeout callbacks always read latest values
  isPlayingRef.current = isPlaying;
  drawerOpenRef.current = drawerOpen;

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current && !drawerOpenRef.current)
        setShowControls(false);
    }, 3000);
  };

  // Auto-hide controls when playback begins (e.g. after autoplay navigates to next video)
  useEffect(() => {
    if (isPlaying && !drawerOpen) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlayingRef.current && !drawerOpenRef.current)
          setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, drawerOpen]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (_, value) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      localStorage.setItem("ytdiff_player_muted", !isMuted);
    }
  };

  const handleVolumeChange = (_, value) => {
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
    setIsMuted(value === 0);
    localStorage.setItem("ytdiff_player_volume", value);
    localStorage.setItem("ytdiff_player_muted", value === 0);
    // Reset auto-hide timer when user interacts with mobile slider
    if (isMobile && showMobileVolume) {
      if (mobileVolumeTimeoutRef.current)
        clearTimeout(mobileVolumeTimeoutRef.current);
      mobileVolumeTimeoutRef.current = setTimeout(
        () => setShowMobileVolume(false),
        3000,
      );
    }
  };

  const handleVolumeButtonClick = () => {
    if (!isMobile) {
      toggleMute();
      return;
    }
    const now = Date.now();
    if (volumeTapRef.current && now - volumeTapRef.current < 300) {
      // Double tap → toggle mute
      volumeTapRef.current = null;
      toggleMute();
    } else {
      // Single tap → toggle volume overlay
      volumeTapRef.current = now;
      setShowMobileVolume((prev) => {
        const next = !prev;
        if (mobileVolumeTimeoutRef.current)
          clearTimeout(mobileVolumeTimeoutRef.current);
        if (next) {
          mobileVolumeTimeoutRef.current = setTimeout(
            () => setShowMobileVolume(false),
            3000,
          );
        }
        return next;
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed", err);
    }
  };

  const handleOpenInNewTab = () => {
    if (videoUrl) {
      globalThis.open(videoUrl, "_blank", "noopener,noreferrer");
    }
  };

  const skip = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  // --- Playlist Navigation Logic ---
  const handleNext = useCallback(() => {
    if (!openPlayer) return;
    for (let i = currentPlayerIndex + 1; i < items.length; i++) {
      const meta = items[i].video_metadatum || {};
      if (meta.downloadStatus) {
        openPlayer(
          meta.saveDirectory ?? playlistDirectory,
          meta.fileName,
          meta.title,
          i,
        );
        return;
      }
    }
    // Hit the end of current page, request next page if available
    if (start + items.length < itemCount && setPage) {
      setPage(page + 1);
      itemsAtTimeOfNext.current = items;
      setPendingNextPage(true);
    }
  }, [
    currentPlayerIndex,
    items,
    itemCount,
    openPlayer,
    page,
    playlistDirectory,
    setPage,
    start,
  ]);

  const handlePrev = useCallback(() => {
    if (!openPlayer) return;
    for (let i = currentPlayerIndex - 1; i >= 0; i--) {
      const meta = items[i].video_metadatum || {};
      if (meta.downloadStatus) {
        openPlayer(
          meta.saveDirectory ?? playlistDirectory,
          meta.fileName,
          meta.title,
          i,
        );
        return;
      }
    }

    // If we reach the beginning of the page, request the previous page if available
    if (page > 0 && setPage) {
      setPage(page - 1);
      itemsAtTimeOfPrev.current = items;
      setPendingPrevPage(true);
    }
  }, [currentPlayerIndex, items, openPlayer, page, playlistDirectory, setPage]);

  const toggleAutoPlay = () => {
    const newVal = !autoPlayEnabled;
    setAutoPlayEnabled(newVal);
    localStorage.setItem("ytdiff_player_autoplay", newVal);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoPlayEnabled) {
      handleNext();
    }
  };

  // Auto-resume across pagination
  useEffect(() => {
    if (
      pendingNextPage &&
      items !== itemsAtTimeOfNext.current &&
      items &&
      items.length > 0 &&
      openPlayer
    ) {
      for (let i = 0; i < items.length; i++) {
        const meta = items[i].video_metadatum || {};
        if (meta.downloadStatus) {
          openPlayer(
            meta.saveDirectory ?? playlistDirectory,
            meta.fileName,
            meta.title,
            i,
          );
          break;
        }
      }
      setPendingNextPage(false);
      itemsAtTimeOfNext.current = null;
    }

    if (
      pendingPrevPage &&
      items !== itemsAtTimeOfPrev.current &&
      items &&
      items.length > 0 &&
      openPlayer
    ) {
      for (let i = items.length - 1; i >= 0; i--) {
        const meta = items[i].video_metadatum || {};
        if (meta.downloadStatus) {
          openPlayer(
            meta.saveDirectory ?? playlistDirectory,
            meta.fileName,
            meta.title,
            i,
          );
          break;
        }
      }
      setPendingPrevPage(false);
      itemsAtTimeOfPrev.current = null;
    }
  }, [items, pendingNextPage, pendingPrevPage, openPlayer, playlistDirectory]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    playerSessionRef.current += 1;
    clearRefreshTimer();
    clearRecoveryTimer();
    fileIdRef.current = null;
    expiryRef.current = null;
    fetchSignedUrl();
    const videoElement = videoRef.current;
    return () => {
      playerSessionRef.current += 1;
      clearRefreshTimer();
      clearRecoveryTimer();
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (mobileVolumeTimeoutRef.current)
        clearTimeout(mobileVolumeTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = null;
      fileIdRef.current = null;
      expiryRef.current = null;

      // Clean up the video element
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
    // Dependency on saveDirectory/fileName forces refresh on track change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearRecoveryTimer, clearRefreshTimer, saveDirectory, fileName]);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.play().catch((e) => {
        console.warn(
          "Autoplay blocked by browser. User interaction required.",
          e,
        );
        setIsPlaying(false);
      });
    }
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [videoUrl, volume, isMuted]);

  const handleError = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (
      vid.error &&
      (vid.error.code === 2 || vid.error.code === 3 || vid.error.code === 4)
    ) {
      vid.pause();
      const time = vid.currentTime;
      fetchSignedUrl(true, time);
    }
  };

  const truncatedTitle =
    title && title.length > 60 ? title.substring(0, 57) + "..." : title;

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const vid = videoRef.current;
      const time = vid.currentTime;
      let activeBufferEnd = 0;

      // Loop through buffered ranges to find the one we are currently playing in
      for (let i = 0; i < vid.buffered.length; i++) {
        if (time >= vid.buffered.start(i) && time <= vid.buffered.end(i)) {
          activeBufferEnd = vid.buffered.end(i);
          break;
        }
      }

      // If the user seeks outside a buffered range, fallback to the latest buffered chunk
      if (activeBufferEnd === 0 && vid.buffered.length > 0) {
        activeBufferEnd = vid.buffered.end(vid.buffered.length - 1);
      }

      setBufferedTime(activeBufferEnd);
    }
  };

  return (
    <Box
      ref={containerRef}
      onMouseMove={handleMouseMove}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "black",
        position: "relative",
        overflow: "hidden",
        cursor: showControls ? "default" : "none",
      }}
    >
      {loading && !videoUrl && (
        <CircularProgress
          sx={{ position: "absolute", zIndex: 10, color: "white" }}
        />
      )}
      {errorMsg && (
        <Typography color="error" sx={{ position: "absolute", zIndex: 10 }}>
          Error: {errorMsg}
        </Typography>
      )}

      {videoUrl && (
        <video
          ref={videoRef}
          onError={handleError}
          onProgress={handleProgress}
          onTimeUpdate={() => {
            setCurrentTime(videoRef.current ? videoRef.current.currentTime : 0);
            handleProgress();
          }}
          onLoadedMetadata={() =>
            setDuration(videoRef.current ? videoRef.current.duration : 0)
          }
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          src={videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}

      {/* Click-to-pause overlay — excludes top bar and bottom controls */}
      {videoUrl && (
        <Box
          onClick={togglePlay}
          sx={{
            position: "absolute",
            top: 64,
            left: 0,
            right: 0,
            bottom: 90,
            zIndex: 1,
            cursor: showControls ? "pointer" : "none",
          }}
        />
      )}

      <TopBar show={showControls} onClick={(e) => e.stopPropagation()}>
        <IconButton onClick={onClose} sx={{ color: "white", mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ color: "white", fontWeight: "bold", flexGrow: 1 }}
        >
          {truncatedTitle}
        </Typography>
        <Tooltip
          title={autoPlayEnabled ? "Auto-Play is ON" : "Auto-Play is OFF"}
        >
          <FormControlLabel
            control={
              <AutoPlaySwitch
                checked={autoPlayEnabled}
                onChange={toggleAutoPlay}
                sx={{ ml: 2, mr: 1 }}
              />
            }
            label=""
            sx={{ margin: 0 }}
          />
        </Tooltip>
        <Tooltip title="Playlist">
          <IconButton
            onClick={() => setDrawerOpen((prev) => !prev)}
            sx={{ color: drawerOpen ? "#1976d2" : "white", ml: 1 }}
          >
            <QueueMusicIcon />
          </IconButton>
        </Tooltip>
      </TopBar>

      {!loading && !isPlaying && showControls && !drawerOpen && (
        <IconButton
          onClick={togglePlay}
          sx={{
            position: "absolute",
            zIndex: 3,
            color: "white",
            bgcolor: "rgba(0,0,0,0.5)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            p: 3,
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 60 }} />
        </IconButton>
      )}

      <ControlBar show={showControls} onClick={(e) => e.stopPropagation()}>
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Base Background Rail */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 4,
              bgcolor: "rgba(255, 255, 255, 0.2)",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />

          {/* Dynamic Buffered Area Bar */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              height: 4,
              width: `${duration > 0 ? (bufferedTime / duration) * 100 : 0}%`,
              bgcolor: "rgba(255, 255, 255, 0.5)",
              borderRadius: 2,
              pointerEvents: "none",
              transition: "width 0.2s linear",
            }}
          />

          {/* Existing Slider */}
          <Slider
            size="small"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            sx={{
              color: "#1976d2",
              height: 4,
              padding: "13px 0",
              position: "relative",
              zIndex: 1,
              "& .MuiSlider-thumb": {
                width: 12,
                height: 12,
                transition: "0.3s ease-in-out",
                "&:before": { boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)" },
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: `0px 0px 0px 8px rgba(25, 118, 210, 0.16)`,
                },
              },
              // Hide the default rail so our custom background and buffer bars show through
              "& .MuiSlider-rail": { opacity: 0 },
            }}
          />
        </Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
          {openPlayer && (
            <IconButton
              size="small"
              onClick={handlePrev}
              sx={{ color: "white" }}
              title="Previous Video"
            >
              <SkipPreviousIcon />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => skip(-10)}
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
          >
            <Replay10Icon />
          </IconButton>
          <IconButton onClick={togglePlay} sx={{ color: "white" }}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => skip(10)}
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
          >
            <Forward10Icon />
          </IconButton>
          {openPlayer && (
            <IconButton
              size="small"
              onClick={handleNext}
              sx={{ color: "white" }}
              title="Next Video"
            >
              <SkipNextIcon />
            </IconButton>
          )}
          <Typography
            variant="caption"
            sx={{
              color: "white",
              ml: 2,
              minWidth: { xs: 60, sm: 100 },
              display: { xs: "none", sm: "block" },
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mr: 2, position: "relative" }}
          >
            {/* Mobile volume overlay — appears above the volume button */}
            {isMobile && showMobileVolume && (
              <Box
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                sx={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  mb: 1,
                  bgcolor: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(6px)",
                  borderRadius: 3,
                  px: 1.5,
                  py: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 120,
                  zIndex: 10,
                }}
              >
                <Slider
                  orientation="vertical"
                  size="small"
                  value={isMuted ? 0 : volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={handleVolumeChange}
                  sx={{
                    color: "white",
                    height: "100%",
                    "& .MuiSlider-thumb": {
                      width: 12,
                      height: 12,
                      transition: "0.3s ease-in-out",
                      "&:before": { boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)" },
                      "&:hover, &.Mui-focusVisible": {
                        boxShadow: "0px 0px 0px 8px rgba(255,255,255,0.16)",
                      },
                    },
                    "& .MuiSlider-rail": { opacity: 0.28 },
                    "& .MuiSlider-track": { border: "none" },
                  }}
                />
              </Box>
            )}
            <IconButton
              size="small"
              onClick={handleVolumeButtonClick}
              sx={{ color: "white" }}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
            {/* Desktop horizontal slider — hidden on mobile */}
            <Slider
              size="small"
              value={isMuted ? 0 : volume}
              min={0}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              sx={{
                color: "white",
                width: 80,
                display: { xs: "none", sm: "block" },
              }}
            />
          </Stack>

          {pipSupported && (
            <IconButton
              size="small"
              onClick={togglePiP}
              title="Picture in Picture"
              sx={{
                color: "white",
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              <PictureInPictureAltIcon />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={handleOpenInNewTab}
            title="Open in New Tab"
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
          >
            <OpenInNewIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={toggleFullscreen}
            sx={{ color: "white" }}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Stack>
      </ControlBar>

      {/* Playlist Drawer inside the Player */}
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
            position: "absolute", // Makes it sit inside the dialog/fullscreen container
          },
        }}
      >
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
        <List sx={{ overflowY: "auto" }}>
          {useMemo(() => {
            const fallbackThumbURL =
              baseUrl +
              backEnd +
              (theme.palette.mode === "light" ? "/404-light.png" : "/404.png");
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

                return (
                  <ListItemButton
                    key={index}
                    disabled={!isAvailable}
                    selected={isCurrent}
                    onClick={() => {
                      if (openPlayer && isAvailable) {
                        openPlayer(
                          meta.saveDirectory ?? playlistDirectory,
                          meta.fileName,
                          meta.title,
                          index,
                        );
                      }
                    }}
                    sx={{
                      "&.Mui-selected": {
                        bgcolor: "rgba(25, 118, 210, 0.3)",
                        "&:hover": {
                          bgcolor: "rgba(25, 118, 210, 0.5)",
                        },
                      },
                      opacity: isAvailable ? 1 : 0.4,
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
                      secondary={!isAvailable && "Not Downloaded"}
                      secondaryTypographyProps={{
                        variant: "caption",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    />
                  </ListItemButton>
                );
              })
            );
          }, [
            items,
            currentPlayerIndex,
            thumbUrls,
            baseUrl,
            backEnd,
            theme.palette.mode,
            openPlayer,
            playlistDirectory,
          ])}
        </List>
      </Drawer>
    </Box>
  );
}

VideoPlayer.propTypes = {
  saveDirectory: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  title: PropTypes.string,
  backEnd: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.array,
  itemCount: PropTypes.number,
  page: PropTypes.number,
  start: PropTypes.number,
  currentPlayerIndex: PropTypes.number,
  setPage: PropTypes.func,
  openPlayer: PropTypes.func,
  playlistDirectory: PropTypes.string,
  thumbUrls: PropTypes.object,
};
