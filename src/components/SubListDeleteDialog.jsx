import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

/**
 * @typedef {Object} SubListDeletePayload
 * @property {string} playListUrl
 * @property {?string} mappingId
 * @property {?string} videoUrl
 * @property {?string} title
 * @property {boolean} cleanUp
 * @property {boolean} deleteVideoMappings
 * @property {boolean} deleteVideosInDB
 */

/**
 * The delete-confirmation dialog for sub-list rows.
 *
 * Pure presentation: the payload describes which of the four deletion
 * flavours was requested, and the label names it in plain language so the
 * confirmation says what will actually happen.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {SubListDeletePayload | null} props.payload
 * @param {() => void} props.onClose - Dismiss without deleting.
 * @param {(payload: SubListDeletePayload) => void} props.onConfirm
 */
function SubListDeleteDialog({ open, payload, onClose, onConfirm }) {
  const actionLabel = payload
    ? payload.cleanUp && payload.deleteVideoMappings && payload.deleteVideosInDB
      ? "Delete from DB and file system"
      : payload.cleanUp && !payload.deleteVideoMappings
        ? "Delete downloaded files"
        : !payload.cleanUp && payload.deleteVideoMappings
          ? "Delete video from playlist"
          : "Delete"
    : "Delete";

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-delete-title-sub">
      <DialogTitle id="confirm-delete-title-sub">Confirm delete</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {payload ? (
            <>
              Are you sure you want to{" "}
              <strong>{actionLabel}</strong> for video{" "}
              <strong>{payload.title}</strong>?
            </>
          ) : (
            "Are you sure you want to perform this delete operation?"
          )}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (payload) {
              onConfirm(payload);
            }
          }}
          color="error"
          variant="contained"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SubListDeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  payload: PropTypes.shape({
    playListUrl: PropTypes.string,
    mappingId: PropTypes.string,
    videoUrl: PropTypes.string,
    title: PropTypes.string,
    cleanUp: PropTypes.bool,
    deleteVideoMappings: PropTypes.bool,
    deleteVideosInDB: PropTypes.bool,
  }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default SubListDeleteDialog;
