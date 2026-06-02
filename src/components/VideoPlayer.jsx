import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
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
import { ClosedCaption as ClosedCaptionIcon } from "@mui/icons-material";
import { ClosedCaptionDisabled as ClosedCaptionDisabledIcon } from "@mui/icons-material";

import { styled, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import PlayerPlaylistDrawer from "./PlayerPlaylistDrawer.jsx";

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
  subTitleFile,
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
  activeDownloads = {},
  loadedPlayList,
  rowsPerPage = 8,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [subtitleUrl, setSubtitleUrl] = useState(null);
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
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    const saved = localStorage.getItem("ytdiff_player_subtitles");
    return saved !== null ? saved === "true" : true; // default ON
  });
  const [subtitleCues, setSubtitleCues] = useState([]);

  const pipSupported =
    "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const fileIdRef = useRef(null);
  const expiryRef = useRef(null);
  const timerRef = useRef(null);
  const recoveryTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const subtitleObjectUrlRef = useRef(null);
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

  const clearSubtitleObjectUrl = useCallback(() => {
    if (subtitleObjectUrlRef.current) {
      URL.revokeObjectURL(subtitleObjectUrlRef.current);
      subtitleObjectUrlRef.current = null;
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

  const parseSubtitleText = (text) => {
    const cues = [];
    const normalized = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
    const blocks = normalized.split(/\n\n+/);

    const parseTime = (ts) => {
      const cleaned = ts.replace(",", ".");
      const parts = cleaned.split(":");
      if (parts.length === 3) {
        return (
          parseFloat(parts[0]) * 3600 +
          parseFloat(parts[1]) * 60 +
          parseFloat(parts[2])
        );
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return 0;
    };

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      let timingIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines.at(i).includes("-->")) {
          timingIdx = i;
          break;
        }
      }
      if (timingIdx === -1) continue;

      const match = lines
        .at(timingIdx)
        .match(
          /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})/,
        );
      if (!match) continue;

      const start = parseTime(match[1]);
      const end = parseTime(match[2]);
      const rawText = lines
        .slice(timingIdx + 1)
        .join("\n")
        .trim();
      // Strip VTT formatting: timestamp tags <00:00:25.600>, karaoke <c>/</c>,
      // and any other VTT markup tags like <b>, <i>, <u>, <ruby>, etc.
      const textContent = rawText
        .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
        .replace(/<\/?[a-zA-Z][^>]*>/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (textContent) {
        cues.push({ start, end, text: textContent });
      }
    }
    return cues;
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

  const fetchSubtitleUrl = useCallback(
    async (subtitleFileName, subtitleSaveDirectory, sessionId) => {
      clearSubtitleObjectUrl();
      setSubtitleUrl(null);
      setSubtitleCues([]);

      if (!subtitleFileName) return;

      try {
        const response = await fetch(backEnd + "/getfile", {
          method: "post",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
          body: JSON.stringify({
            saveDirectory: subtitleSaveDirectory,
            fileName: subtitleFileName,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get subtitle URL");
        }

        const data = await response.json();
        if (
          !isMountedRef.current ||
          playerSessionRef.current !== sessionId ||
          data.status !== "success" ||
          !data.signedUrlId
        ) {
          return;
        }

        const signedSubtitleUrl =
          baseUrl +
          backEnd +
          "/getfile?fileId=" +
          data.signedUrlId +
          "&inline=true";

        // Always fetch text content to parse cues for custom overlay
        const subtitleResponse = await fetch(signedSubtitleUrl);
        if (!subtitleResponse.ok) {
          throw new Error("Failed to load subtitle contents");
        }

        const subtitleText = await subtitleResponse.text();
        if (!isMountedRef.current || playerSessionRef.current !== sessionId) {
          return;
        }

        const cues = parseSubtitleText(subtitleText);
        setSubtitleCues(cues);
        // Set subtitleUrl as a flag that subtitles are available
        setSubtitleUrl(signedSubtitleUrl);
      } catch (error) {
        if (isMountedRef.current && playerSessionRef.current === sessionId) {
          console.warn("Subtitle loading failed", error);
          setSubtitleUrl(null);
          setSubtitleCues([]);
        }
      }
    },
    [backEnd, baseUrl, clearSubtitleObjectUrl, token],
  );

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
      const meta = items.at(i).video_metadatum || {};
      if (meta.downloadStatus) {
        openPlayer(
          meta.saveDirectory ?? playlistDirectory,
          meta.fileName,
          meta.title,
          i,
          meta.subTitleFile || null,
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
      const meta = items.at(i).video_metadatum || {};
      if (meta.downloadStatus) {
        openPlayer(
          meta.saveDirectory ?? playlistDirectory,
          meta.fileName,
          meta.title,
          i,
          meta.subTitleFile || null,
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

  const toggleSubtitles = () => {
    const newVal = !subtitlesEnabled;
    setSubtitlesEnabled(newVal);
    localStorage.setItem("ytdiff_player_subtitles", newVal);
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
        const meta = items.at(i).video_metadatum || {};
        if (meta.downloadStatus) {
          openPlayer(
            meta.saveDirectory ?? playlistDirectory,
            meta.fileName,
            meta.title,
            i,
            meta.subTitleFile || null,
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
        const meta = items.at(i).video_metadatum || {};
        if (meta.downloadStatus) {
          openPlayer(
            meta.saveDirectory ?? playlistDirectory,
            meta.fileName,
            meta.title,
            i,
            meta.subTitleFile || null,
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

  // Compute active subtitle cues based on current playback time
  const activeCues = useMemo(() => {
    if (!subtitleCues.length || !subtitlesEnabled) return [];
    return subtitleCues.filter(
      (cue) => currentTime >= cue.start && currentTime <= cue.end,
    );
  }, [subtitleCues, currentTime, subtitlesEnabled]);

  useEffect(() => {
    playerSessionRef.current += 1;
    clearRefreshTimer();
    clearRecoveryTimer();
    clearSubtitleObjectUrl();
    fileIdRef.current = null;
    expiryRef.current = null;
    setSubtitleUrl(null);
    fetchSignedUrl();
    fetchSubtitleUrl(subTitleFile, saveDirectory, playerSessionRef.current);
    const videoElement = videoRef.current;
    return () => {
      playerSessionRef.current += 1;
      clearRefreshTimer();
      clearRecoveryTimer();
      clearSubtitleObjectUrl();
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
  }, [
    clearRecoveryTimer,
    clearRefreshTimer,
    clearSubtitleObjectUrl,
    fetchSubtitleUrl,
    saveDirectory,
    fileName,
    subTitleFile,
  ]);

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

      {/* Custom subtitle overlay — positioned over the video */}
      {activeCues.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            bottom: showControls ? 100 : 40,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            zIndex: 2,
            pointerEvents: "none",
            transition: "bottom 0.3s ease-in-out",
            px: 2,
          }}
        >
          {activeCues.map((cue, i) => (
            <Box
              key={i}
              sx={{
                background: "rgba(0, 0, 0, 0.75)",
                color: "#fff",
                fontSize: "clamp(14px, 2.5vw, 22px)",
                fontFamily: "'Roboto', 'Arial', sans-serif",
                lineHeight: 1.5,
                borderRadius: "4px",
                px: 1.5,
                py: 0.5,
                textAlign: "center",
                maxWidth: "80%",
                textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
                whiteSpace: "pre-wrap",
              }}
            >
              {cue.text}
            </Box>
          ))}
        </Box>
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

          <Tooltip
            title={
              !subtitleUrl
                ? "No subtitles available"
                : subtitlesEnabled
                  ? "Subtitles ON"
                  : "Subtitles OFF"
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={toggleSubtitles}
                disabled={!subtitleUrl}
                sx={{
                  color: !subtitleUrl
                    ? "rgba(255,255,255,0.2)"
                    : subtitlesEnabled
                      ? "#fff"
                      : "rgba(255,255,255,0.4)",
                  position: "relative",
                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.2)",
                  },
                  "&::after":
                    subtitleUrl && subtitlesEnabled
                      ? {
                          content: "''",
                          position: "absolute",
                          bottom: 2,
                          left: "20%",
                          right: "20%",
                          height: 3,
                          borderRadius: 1.5,
                          bgcolor: "#fff",
                        }
                      : {},
                }}
              >
                {subtitleUrl && subtitlesEnabled ? (
                  <ClosedCaptionIcon />
                ) : (
                  <ClosedCaptionDisabledIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>

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
      <PlayerPlaylistDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        items={items}
        itemCount={itemCount}
        page={page}
        start={start}
        currentPlayerIndex={currentPlayerIndex}
        setPage={setPage}
        openPlayer={openPlayer}
        playlistDirectory={playlistDirectory}
        thumbUrls={thumbUrls}
        activeDownloads={activeDownloads}
        loadedPlayList={loadedPlayList}
        backEnd={backEnd}
        token={token}
        baseUrl={baseUrl}
        rowsPerPage={rowsPerPage}
      />
    </Box>
  );
}

VideoPlayer.propTypes = {
  saveDirectory: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  title: PropTypes.string,
  subTitleFile: PropTypes.string,
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
  activeDownloads: PropTypes.object,
  loadedPlayList: PropTypes.string,
  rowsPerPage: PropTypes.number,
};
