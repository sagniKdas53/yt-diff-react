import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";

import { useApiClient } from "../hooks/useApiClient.js";
import { useSignedPlayback } from "../hooks/useSignedPlayback.js";
import { useSubtitleTrack } from "../hooks/useSubtitleTrack.js";
import { usePlaylistNavigation } from "../hooks/usePlaylistNavigation.js";
import { formatTime } from "../lib/subtitles.js";
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
  loadedPlayList,
  rowsPerPage = 8,
}) {
  const api = useApiClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const pipSupported =
    "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef_controlsTimeout = useRef(null);
  const mobileVolumeTimeoutRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const drawerOpenRef = useRef(drawerOpen);
  const volumeTapRef = useRef(null);

  // Signed-URL lifecycle: minting, pre-expiry refresh, mid-stream recovery.
  const { videoUrl, loading, errorMsg, reload } = useSignedPlayback({
    api,
    saveDirectory,
    fileName,
    videoRef,
  });

  // Subtitles: fetch, parse and cue selection against the playhead.
  const {
    subtitleUrl,
    activeCues,
    subtitlesEnabled,
    toggleSubtitles,
    reportTime,
  } = useSubtitleTrack({ api, saveDirectory, subTitleFile });

  // Previous/next within the playlist, including resume across pagination.
  const { handleNext, handlePrev } = usePlaylistNavigation({
    openPlayer,
    items,
    itemCount,
    page,
    start,
    currentPlayerIndex,
    playlistDirectory,
    setPage: setPage ?? null,
  });

  useEffect(() => {
    return () => {
      if (timerRef_controlsTimeout.current)
        clearTimeout(timerRef_controlsTimeout.current);
      if (mobileVolumeTimeoutRef.current)
        clearTimeout(mobileVolumeTimeoutRef.current);
    };
  }, []);

  // Mirror into refs so deferred callbacks (the auto-hide timer) read current
  // values. An effect suffices here — unlike App's socket handlers, nothing
  // fires in the paint gap that a three-second hide timer would notice.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    drawerOpenRef.current = drawerOpen;
  }, [isPlaying, drawerOpen]);

  const hideControlsSoon = useCallback(() => {
    if (timerRef_controlsTimeout.current)
      clearTimeout(timerRef_controlsTimeout.current);
    timerRef_controlsTimeout.current = setTimeout(() => {
      if (isPlayingRef.current && !drawerOpenRef.current) setShowControls(false);
    }, 3000);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    hideControlsSoon();
  };

  // Auto-hide controls when playback begins (e.g. after autoplay navigates to next video)
  useEffect(() => {
    if (isPlaying && !drawerOpen) {
      hideControlsSoon();
    }
  }, [isPlaying, drawerOpen, hideControlsSoon]);

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
      void reload(true, time);
    }
  };

  const truncatedTitle =
    title && title.length > 60 ? title.substring(0, 57) + "…" : title;

  const handleProgress = useCallback(() => {
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
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const now = videoRef.current ? videoRef.current.currentTime : 0;
    setCurrentTime(now);
    reportTime(now);
    handleProgress();
  }, [reportTime, handleProgress]);

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
          onTimeUpdate={handleTimeUpdate}
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
        <IconButton
          onClick={onClose}
          aria-label="go back"
          sx={{ color: "white", mr: 2 }}
        >
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
            aria-label="toggle playlist drawer"
            sx={{ color: drawerOpen ? "#1976d2" : "white", ml: 1 }}
          >
            <QueueMusicIcon />
          </IconButton>
        </Tooltip>
      </TopBar>

      {!loading && !isPlaying && showControls && !drawerOpen && (
        <IconButton
          onClick={togglePlay}
          aria-label="play video"
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
              aria-label="previous video"
            >
              <SkipPreviousIcon />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => skip(-10)}
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
            aria-label="rewind 10 seconds"
          >
            <Replay10Icon />
          </IconButton>
          <IconButton
            onClick={togglePlay}
            sx={{ color: "white" }}
            aria-label={isPlaying ? "pause" : "play"}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => skip(10)}
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
            aria-label="forward 10 seconds"
          >
            <Forward10Icon />
          </IconButton>
          {openPlayer && (
            <IconButton
              size="small"
              onClick={handleNext}
              sx={{ color: "white" }}
              title="Next Video"
              aria-label="next video"
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
                aria-label="volume slider overlay"
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
                  aria-label="mobile volume slider"
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
              aria-label={
                isMuted || volume === 0 ? "unmute volume" : "mute volume"
              }
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
                aria-label={
                  subtitlesEnabled ? "disable subtitles" : "enable subtitles"
                }
                sx={{
                  color: !subtitleUrl
                    ? "rgba(255,255,255,0.2)"
                    : subtitlesEnabled
                      ? "#fff"
                      : "rgba(255,255,255,0.4)",
                  "&:hover": { color: "white" },
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
              aria-label="picture in picture"
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
            aria-label="open in new tab"
            sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
          >
            <OpenInNewIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "exit fullscreen" : "enter fullscreen"}
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
        loadedPlayList={loadedPlayList}
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
  loadedPlayList: PropTypes.string,
  rowsPerPage: PropTypes.number,
};
