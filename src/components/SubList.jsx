import { Add as AddIcon } from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { Download as DownloadIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import Fab from "@mui/material/Fab";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import useMediaQuery from "@mui/material/useMediaQuery";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  memo,
} from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";
import { useLatest } from "../hooks/useLatest.js";
import { NotificationContext } from "../contexts/NotificationContext";
import { DownloadContext } from "../contexts/DownloadContext";
import { useApiClient } from "../hooks/useApiClient.js";
import { useSubListRows } from "../hooks/useSubListRows.js";
import { useThumbnailUrls } from "../hooks/useThumbnailUrls.js";
import { assetBase } from "../config.js";
import TablePaginationActions from "./Pagination.jsx";
import SubListItemCard from "./SubListItemCard.jsx";
import SubListDeleteDialog from "./SubListDeleteDialog.jsx";
import VideoPlayer from "./VideoPlayer.jsx";

/**
 * The default `setPlayerVideoUrl`. A module constant rather than an inline
 * arrow so the default does not change identity every render and churn the
 * effects that depend on it.
 */
const NO_ROUTER = () => {};

function SubList({
  setPlayListUrl,
  loadedPlayList,
  subListIndex,
  setSubListIndex,
  downloadedItem,
  reFetch,
  setReFetch,
  tableContainerHeight,
  rowsPerPage,
  setRowsPerPage,
  // The player half of the route. Optional: a SubList rendered without a
  // router still plays videos, it just does not put them in the address bar.
  playerVideoUrl = null,
  setPlayerVideoUrl = NO_ROUTER,
  // Mobile props (optional — only passed on mobile)
  isMobile,
  onBack,
  onOpenAddDialog,
  activePlaylistTitle,
}) {
  const { setSnack, addNotification } = useContext(NotificationContext);
  const { activeDownloads, queuedItems, queueDownloads } =
    useContext(DownloadContext);
  const api = useApiClient();

  // Query and sort state
  const [query, updateQuery] = useState("");
  const [sort, updateSort] = useState(false);
  // These are the controls
  const [localQuery, setLocalQuery] = useState("");
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(8);
  const [page, setPage] = useState(0);
  // actual table data
  const { items, setItems, itemCount, playlistDirectory, playlistTitle } =
    useSubListRows({
      api,
      start,
      stop,
      sort,
      query,
      loadedPlayList,
      reFetch,
    });
  const [selectedItems, updateSelected] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentPlayerSaveDir, setCurrentPlayerSaveDir] = useState("");
  const [currentPlayerFileName, setCurrentPlayerFileName] = useState("");
  const [currentPlayerVideoTitle, setCurrentPlayerVideoTitle] = useState("");
  const [currentPlayerSubTitleFile, setCurrentPlayerSubTitleFile] =
    useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(-1);
  // Which video the player is on, as the location names it. Kept beside the
  // fields the player renders from so the effect below can tell "the location
  // already matches what is on screen" from "the location is asking for
  // something else".
  const [currentPlayerVideoUrl, setCurrentPlayerVideoUrl] = useState(null);

  // Signed thumbnails for the visible rows, kept alive across expiries.
  const { thumbUrls } = useThumbnailUrls({
    api,
    items,
    playlistDirectory,
    loadedPlayList,
  });

  // Selection state stores one entry per row url. Readers default missing
  // entries to false, so there is no mirror effect keeping the map in sync
  // with the rows: "select all" is derived from the rows currently on screen,
  // and anything a page change leaves behind simply stops being reachable.
  const selectAll = useMemo(() => {
    if (items.length === 0) return false;
    return items.every(
      (element) =>
        Reflect.get(selectedItems, element.video_metadatum?.videoUrl) === true,
    );
  }, [items, selectedItems]);

  // Written during render rather than after paint: `openPlayer` reads the row
  // at an index the caller just computed from these same rows, and a mirror
  // that commits a tick later would hand it the previous page's row. This is
  // what `useLatest` is for.
  const itemsRef = useLatest(items);
  // Read at call time only, to decide whether opening the player is a new
  // history entry or a move within the one it already has.
  const playerOpenRef = useLatest(playerOpen);

  // const functions and normal functions
  const handleChangePage = useCallback(
    (_event, newPage) => {
      const validPage = Math.max(0, newPage);
      setPage(validPage);
      setStart(validPage * rowsPerPage);
      setStop((validPage + 1) * rowsPerPage);
    },
    [rowsPerPage, setPage, setStart, setStop],
  );

  const handleChangeRowsPerPage = (event) => {
    // I plan to persist he relative page when rows change but not now
    setPage(0);
    setStart(0);
    setSubListIndex(0);
    setStop(parseInt(event.target.value));
    setRowsPerPage(parseInt(event.target.value));
  };

  const handleSelection = useCallback((event) => {
    const { id, checked } = event.target;
    updateSelected((prevItems) => ({ ...prevItems, [id]: checked }));
  }, []);

  const bulkAction = () => {
    const tempState = {};
    items.forEach((element) => {
      Reflect.set(tempState, element.video_metadatum.videoUrl, !selectAll);
    });
    updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
  };

  const handleSort = () => {
    updateSort(!sort);
  };

  const clearList = () => {
    setPlayListUrl("init");
    handleChangePage(null, 0);
    setSubListIndex(0);
    // On mobile, navigate back to playlists after clearing
    if (isMobile && onBack) {
      onBack();
    }
  };

  /** Puts the player on screen. Says nothing about the location. */
  const showPlayer = useCallback(
    (saveDir, fileName, title, index, subTitleFile, videoUrl) => {
      setCurrentPlayerSaveDir(saveDir);
      setCurrentPlayerFileName(fileName);
      setCurrentPlayerVideoTitle(title);
      setCurrentPlayerSubTitleFile(subTitleFile);
      setCurrentPlayerIndex(index);
      setCurrentPlayerVideoUrl(videoUrl);
      setPlayerOpen(true);
    },
    [],
  );

  /** Takes it off screen. Also says nothing about the location. */
  const hidePlayer = useCallback(() => {
    setPlayerOpen(false);
    setCurrentPlayerSaveDir("");
    setCurrentPlayerFileName("");
    setCurrentPlayerSubTitleFile(null);
    setCurrentPlayerIndex(-1);
    setCurrentPlayerVideoUrl(null);
  }, []);

  /**
   * Opens the player and records it in the location.
   *
   * Stable across renders — the rows and the open flag are read through refs
   * at call time — because `handlePlay` is memoized on top of it and reaches
   * every row through a memoized component.
   */
  const openPlayer = useCallback(
    (saveDir, fileName, title, index, subTitleFile = null) => {
      const videoUrl =
        itemsRef.current.at(index)?.video_metadatum?.videoUrl ?? null;
      showPlayer(saveDir, fileName, title, index, subTitleFile, videoUrl);
      if (!videoUrl) return;
      // Opening from closed pushes, so Back closes the player. Moving between
      // videos while it is already open replaces, so Back stays "close the
      // player" rather than walking back through everything that was watched.
      setPlayerVideoUrl(videoUrl, { replace: playerOpenRef.current });
    },
    [itemsRef, playerOpenRef, setPlayerVideoUrl, showPlayer],
  );

  const closePlayer = useCallback(() => {
    hidePlayer();
    // Replace: closing must not leave an entry that Back steps straight back
    // into the player through.
    setPlayerVideoUrl(null, { replace: true });
  }, [hidePlayer, setPlayerVideoUrl]);

  /**
   * Puts the player where the location says it should be.
   *
   * This is the half that makes Back work and a link openable: Back, Forward
   * and a pasted URL all arrive as a change to `playerVideoUrl` and are acted
   * on here, by the same path a click takes.
   *
   * A video can only be opened from a row that is loaded, so a link to one on
   * a page that is not showing — or to one that was never downloaded — cannot
   * be honoured. Rather than leave the location pointing at something the app
   * is not showing, the parameter is dropped once the rows have arrived and
   * it is clear the video is not among them.
   */
  useEffect(() => {
    if (!playerVideoUrl) {
      // Only close what the location was driving. A player opened from a row
      // with no URL to name it is not the location's to close.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the address bar is the external system this effect exists to follow; reacting to it is the subscription, not a derived value
      if (playerOpen && currentPlayerVideoUrl) hidePlayer();
      return;
    }

    if (playerOpen && currentPlayerVideoUrl === playerVideoUrl) return;

    const index = items.findIndex(
      (row) => row.video_metadatum?.videoUrl === playerVideoUrl,
    );
    const meta = index === -1 ? null : items.at(index).video_metadatum;

    if (!meta?.downloadStatus) {
      // No rows yet means "still loading", which is not yet an answer. Rows
      // without this video in them is an answer.
      if (items.length > 0) setPlayerVideoUrl(null, { replace: true });
      return;
    }

    showPlayer(
      meta.saveDirectory ?? playlistDirectory,
      meta.fileName,
      meta.title,
      index,
      meta.subTitleFile || null,
      playerVideoUrl,
    );
  }, [
    playerVideoUrl,
    items,
    playerOpen,
    currentPlayerVideoUrl,
    playlistDirectory,
    setPlayerVideoUrl,
    showPlayer,
    hidePlayer,
  ]);

  async function downloadFunc() {
    // Scoped to the rows on screen: a selection left over from a previous
    // page or playlist is unreachable everywhere else, so it must not queue.
    const urlsOnPage = new Set(
      items.map((element) => element.video_metadatum.videoUrl),
    );
    const data = Object.keys(selectedItems).filter(
      (key) => Reflect.get(selectedItems, key) && urlsOnPage.has(key),
    );

    if (data.length === 0) return;

    const queueEntries = data.map((url) => {
      const item = items.find(
        (candidate) => candidate.video_metadatum.videoUrl === url,
      );

      return {
        url,
        playlistUrl: loadedPlayList,
        positionInPlaylist: item?.positionInPlaylist || 0,
      };
    });

    const acceptedUrls = await queueDownloads(queueEntries);

    updateSelected((prev) => {
      const next = { ...prev };
      acceptedUrls.forEach((url) => Reflect.set(next, url, false));
      return next;
    });
  }

  const getFileAndDownload = useCallback(
    async (saveDirectory, fileName) => {
      if (!fileName) {
        setSnack("No file available", "error");
        return;
      }

      try {
        // perform the request and stream the response so we can report progress
        setSnack(`Downloading: ${fileName}`, "info");
        const json_data = await api.post("/getfile", {
          saveDirectory,
          fileName,
        });

        if (json_data.status === "success" && json_data.signedUrlId) {
          const downloadUrl = new URL(assetBase + "/getfile");
          downloadUrl.searchParams.append("fileId", json_data.signedUrlId);
          // open in new tab
          globalThis.open(
            downloadUrl.toString(),
            "_blank",
            "noopener,noreferrer",
          );
          setSnack(`Download started: ${fileName}`, "success");
        } else {
          setSnack(`Failed to get download URL`, "error");
          addNotification(
            `Failed to get download URL for ${fileName}`,
            "error",
          );
        }
      } catch (error) {
        // A dead session has already been reported once, by apiFetch.
        if (error.sessionExpired) return;
        setSnack(`Failed to download file: ${error.message}`, "error");
        addNotification(
          `Failed to download ${fileName}: ${error.message}`,
          "error",
        );
      }
    },
    [api, setSnack, addNotification],
  );

  /**
   * Delete videos from the playlist.
   *
   * @param {import("./SubListDeleteDialog.jsx").SubListDeletePayload} payload - What and how to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is complete.
   */
  const confirmDelete = async (payload) => {
    const { playListUrl, mappingId, videoUrl, title } = payload;
    const { cleanUp, deleteVideoMappings, deleteVideosInDB } = payload;
    setSnack(`Deleting: ${videoUrl}`, "info");
    try {
      await api.post("/delsub", {
        playListUrl: playListUrl,
        mappingIds: mappingId ? [mappingId] : [],
        videoUrls: mappingId ? [] : [videoUrl],
        cleanUp: cleanUp,
        deleteVideoMappings: deleteVideoMappings,
        deleteVideosInDB: deleteVideosInDB,
      });

      setSnack("Video deleted successfully.", "success");
      addNotification(`Deleted ${title ? title : videoUrl}`, "info");
      setReFetch(
        "delete-sublist-item" + playListUrl + videoUrl + Date.now().toString(),
      );
      setSubListIndex(start); // Reset to start index after deletion
    } catch (_error) {
      setSnack(`Failed to delete: ${title ? title : videoUrl}`, "error");
      addNotification(`Failed to delete: ${title ? title : videoUrl}`, "error");
    }
  };

  useDependencyLogger(
    {
      start,
      stop,
      sort,
      query,
      reFetch,
      loadedPlayList,
      items,
      itemCount,
      page,
      queuedItems,
    },
    "SubList",
  );

  // Responsive card media height using MUI breakpoints
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const mediaHeight = isXs ? 220 : isSm ? 200 : isMd ? 160 : 140;

  useEffect(() => {
    if (downloadedItem.url !== null) {
      if (sort) {
        setReFetch(
          "download-completed-" +
            loadedPlayList +
            downloadedItem.url +
            Date.now().toString(),
        );
      }
      setItems((prevItems) => {
        return prevItems.map((item) => {
          if (item.video_metadatum.videoUrl === downloadedItem.url) {
            return {
              ...item,
              video_metadatum: {
                ...item.video_metadatum,
                downloadStatus: true,
                title: downloadedItem.title,
                fileName: downloadedItem.fileName,
                isMetaDataSynced: downloadedItem.isMetaDataSynced || null,
                thumbNailFile: downloadedItem.thumbNailFile || null,
                onlineThumbnail:
                  downloadedItem.onlineThumbnail ||
                  item.video_metadatum.onlineThumbnail ||
                  null,
                subTitleFile: downloadedItem.subTitleFile || null,
                descriptionFile: downloadedItem.descriptionFile || null,
                saveDirectory:
                  downloadedItem.saveDirectory ??
                  item.video_metadatum.saveDirectory,
              },
            };
          }
          return item;
        });
      });
    }
  }, [downloadedItem, sort, loadedPlayList, setReFetch, setItems]);

  useEffect(() => {
    // Resetting selection/sort when the open playlist changes is deliberate:
    // they describe one playlist's rows, not the view. The synchronous reset
    // avoids one render showing the new playlist under the old sort.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateSelected({});
    updateSort(false);
  }, [loadedPlayList]);

  const debouncedQuery = useMemo(
    () => debounce((value) => updateQuery(value.trim()), 1000),
    [],
  );

  const handleQueryChange = (event) => {
    setLocalQuery(event.target.value);
    debouncedQuery(event.target.value);
  };

  const clearQuery = () => {
    setLocalQuery("");
    updateQuery("");
    debouncedQuery.cancel();
  };

  useEffect(() => {
    if (subListIndex === -1) {
      // Reset to the first page if subListIndex is -1
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the page state exists to follow this prop; there is no derived form of "which page shows position N"
      handleChangePage(null, 0);
    } else {
      // Calculate the current page based on the response index
      const currentIndex =
        subListIndex < itemCount ? subListIndex : itemCount - 1;
      const calculatedPage = Math.floor(currentIndex / rowsPerPage);
      handleChangePage(null, calculatedPage);
    }
  }, [subListIndex, handleChangePage, rowsPerPage, itemCount]);

  const buildDeletePayload = useCallback(
    (id, overrides) => {
      const element = itemsRef.current.find((item) => item.id === id);
      if (!element) return null;
      const meta = element.video_metadatum || {};
      return {
        playListUrl: loadedPlayList,
        mappingId: element.id,
        videoUrl: meta.videoUrl,
        title: meta.title,
        ...overrides,
      };
    },
    [itemsRef, loadedPlayList],
  );

  const openDeleteDialog = useCallback(
    (id, overrides) => {
      const payload = buildDeletePayload(id, overrides);
      if (!payload) return;
      setConfirmPayload(payload);
      setConfirmOpen(true);
    },
    [buildDeletePayload],
  );

  const handleRemove = useCallback(
    (id) =>
      openDeleteDialog(id, {
        cleanUp: false,
        deleteVideoMappings: true,
        deleteVideosInDB: false,
      }),
    [openDeleteDialog],
  );

  const handleDeleteDownloaded = useCallback(
    (id) =>
      openDeleteDialog(id, {
        cleanUp: true,
        deleteVideoMappings: false,
        deleteVideosInDB: false,
      }),
    [openDeleteDialog],
  );

  const handleDeleteDB = useCallback(
    (id) =>
      openDeleteDialog(id, {
        cleanUp: true,
        deleteVideoMappings: true,
        deleteVideosInDB: true,
      }),
    [openDeleteDialog],
  );

  const handlePlay = useCallback(
    (index) => {
      const element = itemsRef.current[index];
      if (!element) return;
      const meta = element.video_metadatum || {};
      openPlayer(
        meta.saveDirectory ?? playlistDirectory,
        meta.fileName,
        meta.title,
        index,
        meta.subTitleFile || null,
      );
    },
    [itemsRef, openPlayer, playlistDirectory],
  );

  return (
    <>
      <Box
        sx={{
          height: tableContainerHeight,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header area stays on top */}
        <Table stickyHeader size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                key="check-head"
                align="center"
                style={{ minWidth: 10 }}
              >
                <Checkbox
                  color="primary"
                  indeterminate={
                    selectAll
                      ? false
                      : Object.values(selectedItems).filter((value) => value)
                          .length > 0
                  }
                  checked={selectAll}
                  onChange={bulkAction}
                  inputProps={{
                    "aria-label": "select all items",
                  }}
                />
              </TableCell>
              <TableCell
                key="title-head"
                align="center"
                style={{ minWidth: 10 }}
                sx={{ width: "85%" }}
              >
                <TextField
                  id="video-search-input"
                  label={
                    loadedPlayList === "None"
                      ? "Title"
                      : playlistTitle || activePlaylistTitle || "Title"
                  }
                  variant="outlined"
                  size="small"
                  value={localQuery}
                  onChange={handleQueryChange}
                  sx={{ width: "100%" }}
                  InputProps={{
                    endAdornment: localQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={clearQuery}
                          edge="end"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </TableCell>
              <TableCell
                key="saved-head"
                align="center"
                style={{ minWidth: 10 }}
              >
                <TableSortLabel
                  active
                  direction={sort ? "desc" : "asc"}
                  onClick={handleSort}
                  sx={{ paddingInlineStart: 2 }}
                >
                  Saved
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>

        {/* Scrollable cards area */}
        <Box
          sx={{ p: 1, overflow: "auto", flex: "1 1 auto", pb: "88px" }}
          aria-label="sub-list cards"
        >
          <Grid container spacing={2} alignItems="stretch">
            {items.map((element, index) => {
              const meta = element.video_metadatum || {};
              const thumb = meta.thumbNailFile || "";
              const queueItemData = Reflect.get(queuedItems, meta.videoUrl);
              const isQueued = !!queueItemData;
              const queuePosition = queueItemData
                ? queueItemData.queuePosition
                : null;
              const isActivelyDownloading = Reflect.has(
                activeDownloads,
                meta.videoUrl,
              );
              return (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={6}
                  lg={3}
                  key={element.id ?? `${element.playlistUrl}-${meta.videoUrl}`}
                >
                  <SubListItemCard
                    element={element}
                    index={index}
                    mediaHeight={mediaHeight}
                    thumbUrl={thumbUrls[thumb]}
                    playlistDirectory={playlistDirectory}
                    isQueued={isQueued}
                    queuePosition={queuePosition}
                    isActivelyDownloading={isActivelyDownloading}
                    isSelected={
                      Reflect.get(selectedItems, meta.videoUrl) || false
                    }
                    loadedPlayList={loadedPlayList}
                    onSelect={handleSelection}
                    onPlay={handlePlay}
                    onRemove={handleRemove}
                    onDeleteDownloaded={handleDeleteDownloaded}
                    onDeleteDB={handleDeleteDB}
                    onDownloadFile={getFileAndDownload}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
        {/* FAB stack — bottom right: Add (bottom) + Download/Clear (above) */}
        <Box
          sx={{
            zIndex: 50,
            position: "absolute",
            bottom: "24px",
            right: "24px",
            display: "flex",
            flexDirection: "column-reverse",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          {/* Bottom-most: Add video/playlist (mobile only) */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="add video or playlist"
              onClick={onOpenAddDialog}
            >
              <AddIcon />
            </Fab>
          )}
          {/* Above Add: Download / Clear (desktop only — mobile uses merged back/close on left) */}
          {!isMobile && (
            <SubListFab
              selectedItems={selectedItems}
              clear={clearList}
              download={downloadFunc}
            />
          )}
        </Box>
        {/* Mobile: merged back/close FAB — bottom left */}
        {isMobile && (
          <Box
            sx={{
              zIndex: 50,
              position: "absolute",
              bottom: "24px",
              left: "24px",
            }}
          >
            <SubListFab
              selectedItems={selectedItems}
              clear={clearList}
              download={downloadFunc}
              mobileBackMode
            />
          </Box>
        )}
      </Box>
      <TablePagination
        rowsPerPageOptions={[1, 8, 16, 32, 64]}
        component="div"
        labelRowsPerPage={isMobile ? "IC:" : "Item count:"}
        count={itemCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        ActionsComponent={TablePaginationActions}
      />
      {/* Confirmation dialog for sub list delete actions */}
      <SubListDeleteDialog
        open={confirmOpen}
        payload={confirmPayload}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmPayload(null);
        }}
        onConfirm={(payload) => {
          void confirmDelete(payload);
          setConfirmOpen(false);
          setConfirmPayload(null);
        }}
      />
      <Dialog fullScreen open={playerOpen} onClose={closePlayer}>
        {playerOpen && (
          <VideoPlayer
            saveDirectory={currentPlayerSaveDir}
            fileName={currentPlayerFileName}
            title={currentPlayerVideoTitle}
            subTitleFile={currentPlayerSubTitleFile}
            onClose={closePlayer}
            items={items}
            itemCount={itemCount}
            page={page}
            start={start}
            currentPlayerIndex={currentPlayerIndex}
            setPage={(newPage) => handleChangePage(null, newPage)}
            openPlayer={openPlayer}
            playlistDirectory={playlistDirectory}
            thumbUrls={thumbUrls}
            loadedPlayList={loadedPlayList}
            rowsPerPage={rowsPerPage}
          />
        )}
      </Dialog>
    </>
  );
}

SubList.propTypes = {
  setPlayListUrl: PropTypes.func.isRequired,
  loadedPlayList: PropTypes.string,
  subListIndex: PropTypes.number.isRequired,
  setSubListIndex: PropTypes.func.isRequired,
  downloadedItem: PropTypes.object.isRequired,
  reFetch: PropTypes.string.isRequired,
  setReFetch: PropTypes.func.isRequired,
  tableContainerHeight: PropTypes.string.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  setRowsPerPage: PropTypes.func.isRequired,
  playerVideoUrl: PropTypes.string,
  setPlayerVideoUrl: PropTypes.func,
  // Mobile props
  isMobile: PropTypes.bool,
  onBack: PropTypes.func,
  onOpenAddDialog: PropTypes.func,
  activePlaylistTitle: PropTypes.string,
};

function SubListFab({ selectedItems, clear, download, mobileBackMode }) {
  const isNoItemsSelected =
    Object.keys(selectedItems).length === 0 ||
    Object.values(selectedItems).every((val) => !val);

  const handleClick = isNoItemsSelected ? clear : download;

  const icon = isNoItemsSelected ? (
    mobileBackMode ? (
      <ArrowBackIcon />
    ) : (
      <ClearIcon />
    )
  ) : (
    <DownloadIcon />
  );

  return (
    <Fab
      color="primary"
      aria-label={
        isNoItemsSelected
          ? mobileBackMode
            ? "back to playlists"
            : "clear list"
          : "download selected"
      }
      onClick={handleClick}
    >
      {icon}
    </Fab>
  );
}

SubListFab.propTypes = {
  selectedItems: PropTypes.object.isRequired,
  download: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  mobileBackMode: PropTypes.bool,
};

export default memo(SubList);
