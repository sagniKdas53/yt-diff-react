import { memo, useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { Pause as PauseIcon } from "@mui/icons-material";
import { SkipNext as SkipNextIcon } from "@mui/icons-material";
import { SkipPrevious as SkipPreviousIcon } from "@mui/icons-material";
import { Replay10 as Replay10Icon } from "@mui/icons-material";
import { Forward10 as Forward10Icon } from "@mui/icons-material";
import { VolumeUp as VolumeUpIcon } from "@mui/icons-material";
import { VolumeOff as VolumeOffIcon } from "@mui/icons-material";
import { Fullscreen as FullscreenIcon } from "@mui/icons-material";
import { FullscreenExit as FullscreenExitIcon } from "@mui/icons-material";
import { PictureInPictureAlt as PictureInPictureAltIcon } from "@mui/icons-material";
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { ClosedCaption as ClosedCaptionIcon } from "@mui/icons-material";
import {
  ClosedCaptionDisabled as ClosedCaptionDisabledIcon,
} from "@mui/icons-material";
import { Subject as SubjectIcon } from "@mui/icons-material";

import { styled } from "@mui/material/styles";
import { PLAYBACK_RATES } from "../lib/playbackRate.js";
import { formatTime } from "../lib/subtitles.js";

/**
 * `show` is a custom prop, held back from the DOM by `shouldForwardProp`.
 *
 * @typedef {import("@mui/material").BoxProps & {show: boolean}} BarProps
 */

const ControlBar = /** @type {import("react").ComponentType<BarProps>} */ (
  styled(Box, {
    shouldForwardProp: (prop) => prop !== "show",
  })(
    /** @param {{theme: import("@mui/material/styles").Theme, show: boolean}} props */ ({
      theme,
      show,
    }) => ({
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
    }),
  )
);

/**
 * The control bar, memoised.
 *
 * It was inline in `VideoPlayer`, which meant every `timeupdate` re-rendered
 * it together with the overlay, the drawer and the dialogs above it. Split out
 * and memoised, a tick re-renders the bar — it owns the seek thumb, so it has
 * to — and leaves the rest of the player alone.
 *
 * @typedef {Object} PlayerControlBarProps
 * @property {boolean} show - Whether the controls are visible.
 * @property {number} currentTime - Playhead, in seconds.
 * @property {number} duration - Length of the file, in seconds.
 * @property {number} bufferedTime - End of the buffered range being played.
 * @property {boolean} isPlaying
 * @property {?{title: string}} currentChapter - Chapter under the playhead.
 * @property {Array<{value: number}>} chapterMarks - Seek-bar boundaries.
 * @property {(value: number) => void} onSeek
 * @property {() => void} onPrev
 * @property {() => void} onNext
 * @property {(amount: number) => void} onSkip
 * @property {() => void} onTogglePlay
 * @property {boolean} showTrackNavigation - False for a single video.
 * @property {boolean} isMobile
 * @property {boolean} showMobileVolume
 * @property {number} volume
 * @property {boolean} isMuted
 * @property {(event: unknown, value: number) => void} onVolumeChange
 * @property {() => void} onVolumeButtonClick
 * @property {?string} subtitleUrl
 * @property {boolean} subtitlesEnabled
 * @property {() => void} onToggleSubtitles
 * @property {boolean} pipSupported
 * @property {() => void} onTogglePiP
 * @property {() => void} onOpenInNewTab
 * @property {boolean} isFullscreen
 * @property {() => void} onToggleFullscreen
 * @property {number} playbackRate
 * @property {(rate: number) => void} onChangePlaybackRate
 * @property {boolean} descriptionAvailable
 * @property {() => void} onShowDescription
 */
function PlayerControlBar({
  show,
  currentTime,
  duration,
  bufferedTime,
  isPlaying,
  currentChapter,
  chapterMarks,
  onSeek,
  onPrev,
  onNext,
  onSkip,
  onTogglePlay,
  showTrackNavigation,
  isMobile,
  showMobileVolume,
  volume,
  isMuted,
  onVolumeChange,
  onVolumeButtonClick,
  subtitleUrl,
  subtitlesEnabled,
  onToggleSubtitles,
  pipSupported,
  onTogglePiP,
  onOpenInNewTab,
  isFullscreen,
  onToggleFullscreen,
  playbackRate,
  onChangePlaybackRate,
  descriptionAvailable,
  onShowDescription,
}) {
  const [rateAnchor, setRateAnchor] = useState(null);
  // Kept here rather than lifted: nothing outside the bar renders this menu,
  // and lifting it put an anchor element in the tree that re-rendered on every
  // tick for no reader.

  return (
    <ControlBar show={show} onClick={(e) => e.stopPropagation()}>
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
              onChange={onSeek}
              marks={chapterMarks && chapterMarks.length > 0
              ? chapterMarks
              : undefined}
              aria-label="seek bar"
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
            {showTrackNavigation && (
              <IconButton
                size="small"
                onClick={onPrev}
                sx={{ color: "white" }}
                title="Previous Video"
                aria-label="previous video"
              >
                <SkipPreviousIcon />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onSkip(-10)}
              sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
              aria-label="rewind 10 seconds"
            >
              <Replay10Icon />
            </IconButton>
            <IconButton
              onClick={onTogglePlay}
              sx={{ color: "white" }}
              aria-label={isPlaying ? "pause" : "play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onSkip(10)}
              sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
              aria-label="forward 10 seconds"
            >
              <Forward10Icon />
            </IconButton>
            {showTrackNavigation && (
              <IconButton
                size="small"
                onClick={onNext}
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

            {currentChapter?.title && (
              <Typography
                variant="caption"
                data-testid="current-chapter"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentChapter.title}
              </Typography>
            )}

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
                    onChange={onVolumeChange}
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
              <Tooltip title={`Playback speed: ${playbackRate}x`}>
                <IconButton
                  size="small"
                  onClick={(event) => setRateAnchor(event.currentTarget)}
                  aria-label="playback speed"
                  aria-haspopup="true"
                  aria-expanded={Boolean(rateAnchor)}
                  sx={{ color: "white", fontSize: 12, px: 1 }}
                >
                  {playbackRate}x
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={rateAnchor}
                open={Boolean(rateAnchor)}
                onClose={() => setRateAnchor(null)}
              >
                {PLAYBACK_RATES.map((rate) => (
                  <MenuItem
                    key={rate}
                    selected={rate === playbackRate}
                    onClick={() => {
                      onChangePlaybackRate(rate);
                      setRateAnchor(null);
                    }}
                    aria-label={`playback speed ${rate}x`}
                  >
                    {rate}x
                  </MenuItem>
                ))}
              </Menu>
              <IconButton
                size="small"
                onClick={onVolumeButtonClick}
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
                onChange={onVolumeChange}
                sx={{
                  color: "white",
                  width: 80,
                  display: { xs: "none", sm: "block" },
                }}
              />
            </Stack>

            <Tooltip title={descriptionAvailable ? "Description" : "No description"}>
              <span>
                <IconButton
                  size="small"
                  onClick={onShowDescription}
                  disabled={!descriptionAvailable}
                  aria-label="show description"
                  sx={{
                    color: descriptionAvailable ? "white" : "rgba(255,255,255,0.2)",
                    "&:hover": { color: "white" },
                  }}
                >
                  <SubjectIcon />
                </IconButton>
              </span>
            </Tooltip>

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
                  onClick={onToggleSubtitles}
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
                onClick={onTogglePiP}
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
              onClick={onOpenInNewTab}
              title="Open in New Tab"
              aria-label="open in new tab"
              sx={{ color: "white", display: { xs: "none", sm: "inline-flex" } }}
            >
              <OpenInNewIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "exit fullscreen" : "enter fullscreen"}
              sx={{ color: "white" }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Stack>
    </ControlBar>
  );
}

PlayerControlBar.propTypes = {
  show: PropTypes.bool.isRequired,
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  bufferedTime: PropTypes.number.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  currentChapter: PropTypes.object,
  chapterMarks: PropTypes.array,
  onSeek: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  onTogglePlay: PropTypes.func.isRequired,
  showTrackNavigation: PropTypes.bool,
  isMobile: PropTypes.bool.isRequired,
  showMobileVolume: PropTypes.bool.isRequired,
  volume: PropTypes.number.isRequired,
  isMuted: PropTypes.bool.isRequired,
  onVolumeChange: PropTypes.func.isRequired,
  onVolumeButtonClick: PropTypes.func.isRequired,
  subtitleUrl: PropTypes.string,
  subtitlesEnabled: PropTypes.bool.isRequired,
  onToggleSubtitles: PropTypes.func.isRequired,
  pipSupported: PropTypes.bool.isRequired,
  onTogglePiP: PropTypes.func.isRequired,
  onOpenInNewTab: PropTypes.func.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
  playbackRate: PropTypes.number.isRequired,
  onChangePlaybackRate: PropTypes.func.isRequired,
  descriptionAvailable: PropTypes.bool.isRequired,
  onShowDescription: PropTypes.func.isRequired,
};

export default memo(PlayerControlBar);
