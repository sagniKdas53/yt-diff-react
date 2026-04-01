import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward10Icon from "@mui/icons-material/Forward10";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import PictureInPictureAltIcon from "@mui/icons-material/PictureInPictureAlt";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { styled } from "@mui/material/styles";

const ControlBar = styled(Box)(({ theme, show }) => ({
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

const TopBar = styled(Box)(({ theme, show }) => ({
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

export default function VideoPlayer({ saveDirectory, fileName, title, backEnd, token, onClose }) {
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const pipSupported = "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const fileIdRef = useRef(null);
    const expiryRef = useRef(null);
    const timerRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const baseUrl = import.meta.env.PROD ? globalThis.location.origin : "";

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
        try {
            setLoading(true);
            const response = await fetch(backEnd + "/getfile", {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                mode: "cors",
                body: JSON.stringify({ saveDirectory, fileName }),
            });

            if (!response.ok) {
                const text = await response.json().catch(() => response.statusText);
                throw new Error(text?.message || response.statusText);
            }

            const data = await response.json();
            if (data.status === "success" && data.signedUrlId) {
                fileIdRef.current = data.signedUrlId;
                expiryRef.current = data.expiry;

                const newUrl = baseUrl + backEnd + "/getfile?fileId=" + data.signedUrlId + "&inline=true";
                setVideoUrl(newUrl);
                setErrorMsg(null);
                scheduleRefresh();

                if (isRecovery && videoRef.current) {
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = resumeTime;
                            videoRef.current.play().catch((e) => console.error("Auto-resume failed", e));
                        }
                    }, 100);
                }
            } else {
                throw new Error("Failed to get download URL");
            }
        } catch (error) {
            console.error("fetchSignedUrl error:", error);
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const scheduleRefresh = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!expiryRef.current || !fileIdRef.current) return;

        const timeUntilExpiry = expiryRef.current - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - 300000);

        timerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(backEnd + "/refreshfile", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    mode: "cors",
                    body: JSON.stringify({ fileId: fileIdRef.current }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success") {
                        expiryRef.current = data.expiry;
                        scheduleRefresh();
                    }
                }
            } catch (err) {
                console.error("Auto-refresh failed", err);
            }
        }, refreshTime);
    }, [backEnd, token]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (_, value) => {
        videoRef.current.currentTime = value;
        setCurrentTime(value);
    };

    const toggleMute = () => {
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (_, value) => {
        setVolume(value);
        videoRef.current.volume = value;
        setIsMuted(value === 0);
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
        videoRef.current.currentTime += amount;
    };

    useEffect(() => {
        fetchSignedUrl();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [saveDirectory, fileName]);

    const handleError = (_e) => {
        const vid = videoRef.current;
        if (!vid) return;
        if (vid.error && (vid.error.code === 4 || vid.error.code === 3)) {
            vid.pause();
            const time = vid.currentTime;
            fetchSignedUrl(true, time);
        }
    };

    const truncatedTitle = title && title.length > 60 ? title.substring(0, 57) + "..." : title;

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
            {loading && !videoUrl && <CircularProgress sx={{ position: "absolute", zIndex: 10, color: "white" }} />}
            {errorMsg && (
                <Typography color="error" sx={{ position: "absolute", zIndex: 10 }}>
                    Error: {errorMsg}
                </Typography>
            )}

            {videoUrl && (
                <video
                    ref={videoRef}
                    autoPlay
                    onError={handleError}
                    onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                    onLoadedMetadata={() => setDuration(videoRef.current.duration)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    src={videoUrl}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onClick={togglePlay}
                />
            )}

            <TopBar show={showControls}>
                <IconButton onClick={onClose} sx={{ color: "white", mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ color: "white", fontWeight: "bold" }}>
                    {truncatedTitle}
                </Typography>
            </TopBar>

            {!loading && !isPlaying && showControls && (
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

            <ControlBar show={showControls}>
                <Slider
                    size="small"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    sx={{
                        color: "#1976d2",
                        height: 4,
                        padding: "13px 0",
                        "& .MuiSlider-thumb": {
                            width: 12,
                            height: 12,
                            transition: "0.3s ease-in-out",
                            "&:before": { boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)" },
                            "&:hover, &.Mui-focusVisible": {
                                boxShadow: `0px 0px 0px 8px rgba(25, 118, 210, 0.16)`,
                            },
                        },
                        "& .MuiSlider-rail": { opacity: 0.28 },
                    }}
                />
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                    <IconButton size="small" onClick={() => skip(-10)} sx={{ color: "white" }}>
                        <Replay10Icon />
                    </IconButton>
                    <IconButton onClick={togglePlay} sx={{ color: "white" }}>
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                    <IconButton size="small" onClick={() => skip(10)} sx={{ color: "white" }}>
                        <Forward10Icon />
                    </IconButton>
                    <Typography variant="caption" sx={{ color: "white", ml: 2, minWidth: 100 }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 2 }}>
                        <IconButton size="small" onClick={toggleMute} sx={{ color: "white" }}>
                            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                        </IconButton>
                        <Slider
                            size="small"
                            value={isMuted ? 0 : volume}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={handleVolumeChange}
                            sx={{ color: "white", width: 80, display: { xs: "none", sm: "block" } }}
                        />
                    </Stack>

                    {pipSupported && (
                        <IconButton size="small" onClick={togglePiP} title="Picture in Picture" sx={{ color: "white" }}>
                            <PictureInPictureAltIcon />
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={handleOpenInNewTab} title="Open in New Tab" sx={{ color: "white" }}>
                        <OpenInNewIcon />
                    </IconButton>
                    <IconButton size="small" onClick={toggleFullscreen} sx={{ color: "white" }}>
                        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                </Stack>
            </ControlBar>
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
};
