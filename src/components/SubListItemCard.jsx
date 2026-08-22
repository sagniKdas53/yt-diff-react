import { memo } from "react";
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

import { assetBase } from "../config.js";

const SubListItemCard = memo(function SubListItemCard({
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
  const meta = element.video_metadatum || {};

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
              element.isAvailable
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
        </ButtonGroup>
      </CardActions>
    </Card>
  );
});

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
