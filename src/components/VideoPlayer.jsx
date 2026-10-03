import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

import { useApiClient } from "../hooks/useApiClient.js";
import { useSignedPlayback } from "../hooks/useSignedPlayback.js";
import { useSubtitleTrack } from "../hooks/useSubtitleTrack.js";
import { usePlaylistNavigation } from "../hooks/usePlaylistNavigation.js";
import {
  parseDescriptionSegments,
  useDescription,
} from "../hooks/useDescription.js";
import { PLAYBACK_RATES, readStoredRate } from "../lib/playbackRate.js";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { QueueMusic as QueueMusicIcon } from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

import { styled, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import PlayerControlBar from "./PlayerControlBar.jsx";
import PlayerPlaylistDrawer from "./PlayerPlaylistDrawer.jsx";

/**
 * `show` is a custom prop, held back from the DOM by `shouldForwardProp`. MUI's
 * types describe the props of the component being wrapped, so a styled
 * component's own props have to be named — otherwise `show` is an error both
 * where it is read below and where it is passed in the JSX.
 *
 * @typedef {import("@mui/material").BoxProps & {show: boolean}} BarProps
 */

const TopBar = /** @type {import("react").ComponentType<BarProps>} */ (
  styled(Box, {
    shouldForwardProp: (prop) => prop !== "show",
  })(
    /** @param {{theme: import("@mui/material/styles").Theme, show: boolean}} props */ ({
      theme,
      show,
    }) => ({
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
    }),
  )
);

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
  startAt = 0,
  onStartAtChange,
  chapters = [],
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
  const [playbackRate, setPlaybackRate] = useState(readStoredRate);
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
  // Where the description dialog and the speed menu render. Inside the player
  // box rather than the document body: in fullscreen the box is the only
  // thing painted, so a body-portalled dialog is invisible.
  const descriptionDialogRef = useRef(null);
  // The position a link asked for, and the one last written back. Both are
  // per-track: a new file starts again from wherever the link says, and a
  // position belonging to the previous video must not be written over it.
  const appliedStartAtRef = useRef(null);
  const lastWrittenRef = useRef(-1);

  useEffect(() => {
    appliedStartAtRef.current = null;
    lastWrittenRef.current = -1;
  }, [fileName]);

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
    subtitleCues,
    activeCues,
    subtitlesEnabled,
    toggleSubtitles,
  } = useSubtitleTrack({ api, saveDirectory, subTitleFile, currentTime });

  /**
   * The chapter boundaries, as marks on the seek bar.
   *
   * The first chapter's mark is dropped: it sits at zero, where the slider
   * already starts, and a dot there is a decoration that means nothing.
   */
  const chapterMarks = useMemo(
    () =>
      chapters.slice(1).map((chapter) => ({ value: chapter.start })),
    [chapters],
  );

  /** The chapter the playhead is inside, or null before the first one. */
  const currentChapter = useMemo(() => {
    if (!chapters.length) return null;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].start) {
        return chapters[i];
      }
    }
    return null;
  }, [chapters, currentTime]);

  // Previous/next within the playlist, including resume across pagination.
  // The description belongs to the row the player is on, and the player
  // already has that row: reading it here rather than threading it down keeps
  // showPlayer's five positional arguments from becoming six.
  const descriptionFile =
    currentPlayerIndex === -1
      ? null
      : items[currentPlayerIndex]?.video_metadatum?.descriptionFile ?? null;

  const {
    available: hasDescription,
    open: descriptionOpen,
    loading: descriptionLoading,
    error: descriptionError,
    text: descriptionText,
    show: showDescription,
    close: closeDescription,
  } = useDescription({ api, saveDirectory, descriptionFile });

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
      if (isPlayingRef.current && !drawerOpenRef.current)
        setShowControls(false);
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

  // `onPlay` and `onPause` already set this, so the optimistic set here was a
  // second, redundant write on every click. The element's own events are the
  // truth about whether it is playing.
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const handleSeek = (_, value) => {
    seekTo(value);
  };

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      localStorage.setItem("ytdiff_player_muted", String(!isMuted));
    }
  }, [isMuted]);

  const changePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    // Applied here as well as in the effect: the menu is reachable while the
    // element is mounted, and the effect only runs again on a track change.
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    // Persisting is a courtesy, not part of the selection: private mode and
    // a full quota both throw here, and the rate the viewer just chose
    // applies to this session either way.
    try {
      localStorage.setItem("ytdiff_player_rate", String(rate));
    } catch {
      // Storage unavailable; the in-session rate still stands.
    }
  }, []);

  const handleVolumeChange = useCallback((_, value) => {
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
    setIsMuted(value === 0);
    localStorage.setItem("ytdiff_player_volume", String(value));
    localStorage.setItem("ytdiff_player_muted", String(value === 0));
    // Reset auto-hide timer when user interacts with mobile slider
    if (isMobile && showMobileVolume) {
      if (mobileVolumeTimeoutRef.current)
        clearTimeout(mobileVolumeTimeoutRef.current);
      mobileVolumeTimeoutRef.current = setTimeout(
        () => setShowMobileVolume(false),
        3000,
      );
    }
  }, [isMobile, showMobileVolume]);

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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

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

  const skip = useCallback((amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  }, []);

  /**
   * Keyboard control, on the keys every video player uses.
   *
   * Bound to the document rather than the player box so it works wherever
   * focus happens to be, and skipped entirely when focus is somewhere a
   * keystroke means something else — an input, a textarea, anything editable.
   * Volume is the awkward one: it is stored in state already, so the handler
   * steps that state rather than writing to the element directly.
   */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target;
      // Keystrokes inside the dialog belong to the dialog: typing, tabbing
      // and scrolling through the text, and space/arrows over its own
      // controls.
      if (
        descriptionDialogRef.current &&
        target instanceof Node &&
        descriptionDialogRef.current.contains(target)
      ) {
        return;
      }
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          return;
        case "ArrowLeft":
          event.preventDefault();
          skip(-10);
          return;
        case "ArrowRight":
          event.preventDefault();
          skip(10);
          return;
        case "ArrowUp":
          event.preventDefault();
          handleVolumeChange(null, Math.min(1, (isMuted ? 0 : volume) + 0.1));
          return;
        case "ArrowDown":
          event.preventDefault();
          handleVolumeChange(null, Math.max(0, (isMuted ? 0 : volume) - 0.1));
          return;
        case "m":
          toggleMute();
          return;
        case "f":
          toggleFullscreen();
          return;
        case "c":
          if (subtitleUrl) toggleSubtitles();
          return;
        case "<": {
          const index = PLAYBACK_RATES.indexOf(playbackRate);
          changePlaybackRate(PLAYBACK_RATES[Math.max(0, index - 1)]);
          return;
        }
        case ">": {
          const index = PLAYBACK_RATES.indexOf(playbackRate);
          changePlaybackRate(
            PLAYBACK_RATES[Math.min(PLAYBACK_RATES.length - 1, index + 1)],
          );
          return;
        }
      }
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [
    changePlaybackRate,
    handleVolumeChange,
    playbackRate,
    skip,
    subtitleUrl,
    subtitlesEnabled,
    toggleFullscreen,
    toggleMute,
    togglePlay,
    toggleSubtitles,
    volume,
    isMuted,
  ]);

  const toggleAutoPlay = () => {
    const newVal = !autoPlayEnabled;
    setAutoPlayEnabled(newVal);
    localStorage.setItem("ytdiff_player_autoplay", String(newVal));
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoPlayEnabled) {
      handleNext();
    }
  };

  /**
   * Hands the playhead to the location, so the link in the address bar is the
   * link to share.
   *
   * Guarded against writing the value it was just given, and against writing
   * at all when nothing asked for updates — otherwise every tick of the timer
   * would replace a history entry that says nothing changed.
   */
  const writeStartAt = useCallback((seconds) => {
    if (!onStartAtChange || !videoRef.current) return;
    const rounded = Math.floor(seconds);
    if (rounded === lastWrittenRef.current) return;
    lastWrittenRef.current = rounded;
    onStartAtChange(rounded);
  }, [onStartAtChange]);

  // While playing, roughly every ten seconds; on pause, immediately, because
  // that is when someone is most likely to copy the link.
  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      if (videoRef.current) writeStartAt(videoRef.current.currentTime);
    }, 10000);
    return () => clearInterval(timer);
  }, [isPlaying, writeStartAt]);

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
      // Re-applied per track, like volume: the element is unmounted while
      // videoUrl is null, so a new one starts at 1 and would otherwise ignore
      // a rate chosen on the previous video.
      videoRef.current.playbackRate = playbackRate;
    }
  }, [videoUrl, volume, isMuted, playbackRate]);

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
    setCurrentTime(videoRef.current ? videoRef.current.currentTime : 0);
    handleProgress();
  }, [handleProgress]);

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
          onLoadedMetadata={() => {
            const element = videoRef.current;
            if (!element) return;
            setDuration(element.duration);
            // Once per track. A recovery remint loads the metadata again, and
            // re-seeking there would throw the viewer back to the start of
            // whatever they had just watched past.
            if (startAt > 0 && appliedStartAtRef.current === null) {
              appliedStartAtRef.current = startAt;
              lastWrittenRef.current = Math.floor(startAt);
              element.currentTime = startAt;
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            // Written here rather than in an effect: the element's own event
            // is the only place the final position is known before the timer
            // is torn down.
            writeStartAt(videoRef.current ? videoRef.current.currentTime : 0);
          }}
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

      <PlayerControlBar
        show={showControls}
        currentTime={currentTime}
        duration={duration}
        bufferedTime={bufferedTime}
        isPlaying={isPlaying}
        currentChapter={currentChapter}
        chapterMarks={chapterMarks}
        onSeek={handleSeek}
        onPrev={handlePrev}
        onNext={handleNext}
        onSkip={skip}
        onTogglePlay={togglePlay}
        showTrackNavigation={Boolean(openPlayer)}
        isMobile={isMobile}
        showMobileVolume={showMobileVolume}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onVolumeButtonClick={handleVolumeButtonClick}
        subtitleUrl={subtitleUrl}
        subtitlesEnabled={subtitlesEnabled}
        onToggleSubtitles={toggleSubtitles}
        pipSupported={pipSupported}
        onTogglePiP={togglePiP}
        onOpenInNewTab={handleOpenInNewTab}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        playbackRate={playbackRate}
        onChangePlaybackRate={changePlaybackRate}
        menuContainer={() => containerRef.current}
        descriptionAvailable={hasDescription}
        onShowDescription={showDescription}
      />

      <Dialog
        ref={descriptionDialogRef}
        container={() => containerRef.current}
        open={descriptionOpen}
        onClose={closeDescription}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        aria-label="description dialog"
      >
        <DialogTitle>{truncatedTitle || "Description"}</DialogTitle>
        <DialogContent dividers>
          {descriptionLoading && <CircularProgress size={24} />}
          {descriptionError && (
            <Typography color="error">Error: {descriptionError}</Typography>
          )}
          {!descriptionLoading && !descriptionError && (
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {parseDescriptionSegments(descriptionText).map((segment, i) => {
                if (segment.kind === "link") {
                  return (
                    <Link
                      key={i}
                      href={segment.value}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {segment.value}
                    </Link>
                  );
                }
                if (segment.kind === "time") {
                  return (
                    <Link
                      key={i}
                      component="button"
                      type="button"
                      onClick={() => seekTo(segment.seconds)}
                      aria-label={`seek to ${segment.value}`}
                      sx={{ mx: 0.25 }}
                    >
                      {segment.value}
                    </Link>
                  );
                }
                return <span key={i}>{segment.value}</span>;
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDescription}>Close</Button>
        </DialogActions>
      </Dialog>

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
        chapters={chapters}
        subtitleCues={subtitleCues}
        // Whole seconds: the drawer's highlighting moves once a second, and
        // feeding it the raw playhead put a playlist-sized render in the path
        // of every timeupdate.
        currentTime={Math.floor(currentTime)}
        onSeek={seekTo}
      />
    </Box>
  );
}

VideoPlayer.propTypes = {
  saveDirectory: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  title: PropTypes.string,
  subTitleFile: PropTypes.string,
  startAt: PropTypes.number,
  onStartAtChange: PropTypes.func,
  chapters: PropTypes.array,
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
