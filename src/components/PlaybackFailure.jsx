import { useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

/** The stream URL as an absolute address, which is what other apps need. */
const toAbsolute = (videoUrl) =>
  new URL(videoUrl, window.location.href).toString();

/** The same file as a download: `inline=true` is what asks for a stream. */
const toDownload = (videoUrl) => {
  const url = new URL(videoUrl, window.location.href);
  url.searchParams.delete("inline");
  return url.toString();
};

/**
 * Shown in place of the video when the browser has said, twice, that it
 * cannot play this file. The file is fine on disk; the answer is another
 * player, so this offers a download, the stream link and, on Android, VLC.
 *
 * @param {Object} props
 * @param {string} props.title - Title of the video that failed.
 * @param {string} props.videoUrl - The signed stream URL that failed.
 * @param {boolean} props.hasNext - Whether "Play next" can do anything.
 * @param {() => void} props.onNext
 * @param {() => void} props.onClose
 */
export default function PlaybackFailure({
  title,
  videoUrl,
  hasNext,
  onNext,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  // Plain HTTP has no clipboard API, and a copy can be refused. Either way the
  // link is shown in a field instead, so there is always a way to get it.
  const [showField, setShowField] = useState(false);
  const streamUrl = toAbsolute(videoUrl);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl);
      setCopied(true);
    } catch {
      setShowField(true);
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "black",
        p: 2,
      }}
    >
      <Stack
        spacing={2}
        alignItems="stretch"
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 3,
          borderRadius: 2,
          bgcolor: "grey.900",
          color: "white",
        }}
      >
        <Box>
          <Typography variant="h6" component="h2">
            This browser can&apos;t play this file
          </Typography>
          {title && (
            <Typography variant="body2" sx={{ color: "grey.400", mt: 0.5 }}>
              {title}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          component="a"
          href={toDownload(videoUrl)}
          download
        >
          Download file
        </Button>
        <Button variant="outlined" onClick={copyLink}>
          Copy stream link
        </Button>
        {copied && (
          <Typography variant="caption" role="status">
            Copied
          </Typography>
        )}
        {showField && (
          <TextField
            size="small"
            value={streamUrl}
            inputProps={{ "aria-label": "stream link", readOnly: true }}
            onFocus={(event) => event.target.select()}
            autoFocus
          />
        )}
        {isAndroid && (
          <Button variant="outlined" component="a" href={`vlc://${streamUrl}`}>
            Open in VLC
          </Button>
        )}
        {hasNext && (
          <Button variant="outlined" onClick={onNext}>
            Play next
          </Button>
        )}
        <Button onClick={onClose}>Go back</Button>
      </Stack>
    </Box>
  );
}

PlaybackFailure.propTypes = {
  title: PropTypes.string,
  videoUrl: PropTypes.string.isRequired,
  hasNext: PropTypes.bool.isRequired,
  onNext: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
