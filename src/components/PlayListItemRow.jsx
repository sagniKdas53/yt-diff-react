import { memo } from "react";
import PropTypes from "prop-types";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";

/**
 * One row of `/getplay`, as the table renders it.
 *
 * `element` comes from the generated contract rather than
 * `PropTypes.object`, so the row's field names are checked against what the
 * endpoint actually returns.
 *
 * @typedef {import("../api/generated/apiTypes.js").GetplayResponse["rows"][number]} PlaylistRow
 *
 * @typedef {Object} PlayListItemRowProps
 * @property {PlaylistRow} element
 * @property {number} index
 * @property {boolean} isMenuOpen
 * @property {string} playListUrl - The playlist currently loaded, if any.
 * @property {(event: import("react").MouseEvent<HTMLElement>, index: number) => void} handleClickAnchor
 * @property {(event: import("@mui/material").SelectChangeEvent, playlistUrl: string) => void} changeWatch
 * @property {(playlistUrl: string, title: string) => void} handleLoad
 * @property {(lastStamp: string | null | undefined) => string} lastUpdateCalc
 */

/**
 * `memo`'s result is typed as a `NamedExoticComponent`, which does not declare
 * `propTypes` — but React reads it at runtime and eslint's `react/prop-types`
 * requires it, so the runtime object really does carry one.
 *
 * @type {import("react").NamedExoticComponent<PlayListItemRowProps> & {propTypes?: object}}
 */
const PlayListItemRow = memo(
  /** @param {PlayListItemRowProps} props */
  function PlayListItemRow({
    element,
    index,
    isMenuOpen,
    playListUrl,
    handleClickAnchor,
    changeWatch,
    handleLoad,
    lastUpdateCalc,
  }) {
    return (
      <TableRow
        hover
        role="checkbox"
        tabIndex={-1}
        sx={{
          transition: "box-shadow 0.2s",
          "&:hover": {
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          },
        }}
      >
        <TableCell align="left" style={{ paddingInlineEnd: "0px" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              justifyContent: "space-between",
              m: 0,
              p: 0,
            }}
          >
            <Typography
              variant="body2"
              component="div"
              sx={{ m: 0, p: 0, fontWeight: 600 }}
            >
              {+element.sortOrder + 1}
            </Typography>
            <Tooltip title="Delete options">
              <IconButton
                aria-label="more"
                id={index + "-long-button"}
                aria-controls={isMenuOpen ? "long-menu" : undefined}
                aria-expanded={isMenuOpen ? "true" : undefined}
                aria-haspopup="true"
                onClick={(e) => handleClickAnchor(e, index)}
                sx={{ m: 0, pb: 0.3, pt: 0, px: 0 }}
              >
                <MoreVertIcon fontSize="small" sx={{ m: 0, p: 0 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
        <TableCell
          align="left"
          sx={{ width: "75%" }}
          style={{
            paddingInline: "0px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Link
            href={element.playlistUrl}
            color="inherit"
            underline="hover"
            target="_blank"
            rel="noreferrer"
          >
            {element.title}
          </Link>
        </TableCell>
        <TableCell
          align="right"
          style={{ paddingInlineEnd: "0px", paddingTop: "0px" }}
        >
          <FormControl
            variant="standard"
            sx={{ m: 0, minWidth: 80, minHeight: 45 }}
            size="small"
          >
            <InputLabel id={element.sortOrder + "-label"}>
              {lastUpdateCalc(element.lastUpdatedByScheduler)}
            </InputLabel>
            <Select
              labelId={element.sortOrder + "-label"}
              id={element.sortOrder + "-select"}
              value={element.monitoringType}
              label="Watch"
              onChange={(e) => changeWatch(e, element.playlistUrl)}
            >
              <MenuItem value={"N/A"}>N/A</MenuItem>
              <MenuItem value={"Start"}>Start</MenuItem>
              <MenuItem value={"End"}>End</MenuItem>
              <MenuItem value={"Full"}>Full</MenuItem>
            </Select>
          </FormControl>
        </TableCell>
        <TableCell align="center" style={{ paddingInline: "8px" }}>
          <Button
            size="small"
            variant="contained"
            color={
              playListUrl === element.playlistUrl ? "success" : "secondary"
            }
            onClick={() => handleLoad(element.playlistUrl, element.title)}
          >
            <Typography variant="button">
              {playListUrl === element.playlistUrl ? "DONE" : "LIST"}
            </Typography>
          </Button>
        </TableCell>
      </TableRow>
    );
  },
);

PlayListItemRow.propTypes = {
  element: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isMenuOpen: PropTypes.bool.isRequired,
  playListUrl: PropTypes.string.isRequired,
  handleClickAnchor: PropTypes.func.isRequired,
  changeWatch: PropTypes.func.isRequired,
  handleLoad: PropTypes.func.isRequired,
  lastUpdateCalc: PropTypes.func.isRequired,
};

export default PlayListItemRow;
