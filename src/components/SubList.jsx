import { Add as AddIcon } from "@mui/icons-material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { Download as DownloadIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";
import { NotificationContext } from "../contexts/NotificationContext";
import { DownloadContext } from "../contexts/DownloadContext";
import { useApi } from "../hooks/useApi.js";
import { assetBase } from "../config.js";
import TablePaginationActions from "./Pagination.jsx";
import SubListItemCard from "./SubListItemCard.jsx";
import VideoPlayer from "./VideoPlayer.jsx";

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
  // Mobile props (optional — only passed on mobile)
  isMobile,
  onBack,
  onOpenAddDialog,
  activePlaylistTitle,
}) {
  const { setSnack, addNotification } = useContext(NotificationContext);
  const { activeDownloads, queuedItems, queueDownloads } =
    useContext(DownloadContext);
  const apiFetch = useApi();

  // Query and sort state
  const [query, updateQuery] = useState("");
  const [sort, updateSort] = useState(false);
  // These are the controls
  const [localQuery, setLocalQuery] = useState("");
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(8);
  const [page, setPage] = useState(0);
  // actual table data
  const [items, setItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [selectedItems, updateSelected] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [playlistDirectory, setPlaylistDirectory] = useState("init");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [thumbUrls, setThumbUrls] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentPlayerSaveDir, setCurrentPlayerSaveDir] = useState("");
  const [currentPlayerFileName, setCurrentPlayerFileName] = useState("");
  const [currentPlayerVideoTitle, setCurrentPlayerVideoTitle] = useState("");
  const [currentPlayerSubTitleFile, setCurrentPlayerSubTitleFile] =
    useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(-1);
  const thumbMetaRef = useRef({});
  const thumbRefreshTimerRef = useRef(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const clearThumbnailRefreshTimer = useCallback(() => {
    if (thumbRefreshTimerRef.current) {
      clearTimeout(thumbRefreshTimerRef.current);
      thumbRefreshTimerRef.current = null;
    }
  }, []);

  const scheduleThumbnailRefresh = useCallback(() => {
    clearThumbnailRefreshTimer();

    const activeEntries = Object.values(thumbMetaRef.current).filter(
      (entry) => entry?.fileId && entry?.expiry,
    );
    if (activeEntries.length === 0) return;

    const nextExpiry = Math.min(...activeEntries.map((entry) => entry.expiry));
    const timeUntilExpiry = nextExpiry - Date.now();
    const refreshTime = Math.max(0, timeUntilExpiry - 300000);

    thumbRefreshTimerRef.current = setTimeout(async () => {
      const entries = Object.entries(thumbMetaRef.current).filter(
        ([, entry]) => entry?.fileId && entry?.expiry,
      );
      const dueEntries = entries.filter(
        ([, entry]) => entry.expiry - Date.now() <= 300000,
      );
      if (dueEntries.length === 0) {
        scheduleThumbnailRefresh();
        return;
      }

      try {
        const response = await apiFetch("/refreshfiles", {
          method: "post",
          body: JSON.stringify({
            fileIds: dueEntries.map(([, entry]) => entry.fileId),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "success" && data.files) {
            dueEntries.forEach(([fileName, entry]) => {
              const refreshed = Reflect.get(data.files, entry.fileId);
              if (refreshed?.expiry) {
                Reflect.set(thumbMetaRef.current, fileName, {
                  ...Reflect.get(thumbMetaRef.current, fileName),
                  expiry: refreshed.expiry,
                });
              } else {
                Reflect.deleteProperty(thumbMetaRef.current, fileName);
                setThumbUrls((prev) => {
                  const next = { ...prev };
                  Reflect.set(next, fileName, null);
                  return next;
                });
              }
            });
          }
        }
        // 401 is already reported and logged out by apiFetch.
      } catch (_error) {
        // Let the next bulk fetch recover if this refresh fails.
      }

      scheduleThumbnailRefresh();
    }, refreshTime);
  }, [apiFetch, clearThumbnailRefreshTimer]);
  // const functions and normal functions
  const handleChangePage = useCallback(
    (_event, newPage) => {
      //console.log("handleChangePage: Page: ", newPage);
      const validPage = Math.max(0, newPage);
      setPage(validPage);
      setStart(validPage * rowsPerPage);
      setStop((validPage + 1) * rowsPerPage);
    },
    [rowsPerPage, setPage, setStart, setStop],
  );

  const handleChangeRowsPerPage = (event) => {
    //console.log("handleChangeRowsPerPage: Rows per page: ", event.target.value);
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
    setSelectAll(!selectAll);
  };

  const handleSort = () => {
    updateSort(!sort);
  };

  const clearList = () => {
    setPlayListUrl("init");
    setPlaylistDirectory("init");
    handleChangePage(null, 0);
    setSubListIndex(0);
    // On mobile, navigate back to playlists after clearing
    if (isMobile && onBack) {
      onBack();
    }
  };

  const openPlayer = (saveDir, fileName, title, index, subTitleFile = null) => {
    setCurrentPlayerSaveDir(saveDir);
    setCurrentPlayerFileName(fileName);
    setCurrentPlayerVideoTitle(title);
    setCurrentPlayerSubTitleFile(subTitleFile);
    setCurrentPlayerIndex(index);
    setPlayerOpen(true);
  };

  const closePlayer = () => {
    setPlayerOpen(false);
    setCurrentPlayerSaveDir("");
    setCurrentPlayerFileName("");
    setCurrentPlayerSubTitleFile(null);
    setCurrentPlayerIndex(-1);
  };

  async function downloadFunc() {
    const data = Object.keys(selectedItems).filter((key) =>
      Reflect.get(selectedItems, key),
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
    if (acceptedUrls.length > 0) setSelectAll(false);
  }

  const getFileAndDownload = useCallback(
    async (saveDirectory, fileName) => {
      if (!fileName) {
        setSnack("No file available", "error");
        return;
      }

      try {
        // perform the request and stream the response so we can report progress
        //console.log("Requesting file: ", { saveDirectory, fileName });
        setSnack(`Downloading: ${fileName}`, "info");
        const response = await apiFetch("/getfile", {
          method: "post",
          headers: { Accept: "application/octet-stream" },
          body: JSON.stringify({ saveDirectory, fileName }),
        });

        if (!response.ok) {
          // 401 is already reported and logged out by apiFetch.
          if (response.status !== 401) {
            const text = await response.json().catch(() => response.statusText);
            setSnack(`Failed to download file: ${text.message}`, "error");
            addNotification(
              `Failed to download file: ${text.message}`,
              "error",
            );
          }
          return;
        }

        // Now the backend sends a json response with the signed
        const data = await response.text();
        const json_data = JSON.parse(data);
        if (json_data.status === "success" && json_data.signedUrlId) {
          const downloadUrl = new URL(assetBase + "/getfile");
          downloadUrl.searchParams.append("fileId", json_data.signedUrlId);
          //console.log("Opening download URL: ", downloadUrl.toString());
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
        setSnack(`Error downloading file: ${error.message}`, "error");
        addNotification(
          `Error downloading file ${fileName}: ${error.message}`,
          "error",
        );
      }
    },
    [apiFetch, setSnack, addNotification],
  );

  /**
   * Delete a video from the playlist.
   * @param {string} playListUrl The playlist to delete from.
   * @param {string} videoUrl The URL of the video to delete.
   * @param {string} title The title of the video to delete.
   * @param {boolean} cleanUp Whether to clean up the downloaded files.
   * @param {boolean} deleteVideoMappings Whether to delete the video mappings from the database.
   * @param {boolean} deleteVideosInDB Whether to delete the video itself from the database.
   * @returns {Promise<void>} A promise that resolves when the deletion is complete.
   */
  const deleteVideo = async (
    playListUrl,
    mappingId,
    videoUrl,
    title,
    cleanUp,
    deleteVideoMappings,
    deleteVideosInDB,
  ) => {
    setSnack(`Deleting: ${videoUrl}`, "info");
    const response = await apiFetch("/delsub", {
      method: "post",
      body: JSON.stringify({
        playListUrl: playListUrl,
        mappingIds: mappingId ? [mappingId] : [],
        videoUrls: mappingId ? [] : [videoUrl],
        cleanUp: cleanUp,
        deleteVideoMappings: deleteVideoMappings,
        deleteVideosInDB: deleteVideosInDB,
      }),
    });
    if (response.ok) {
      setSnack("Video deleted successfully.", "success");
      addNotification(`Deleted ${title ? title : videoUrl}`, "info");
      //console.log(`Deleted: ${videoUrl}`);
      setReFetch(
        "delete-sublist-item" + playListUrl + videoUrl + Date.now().toString(),
      );
      setSubListIndex(start); // Reset to start index after deletion
    }
    if (!response.ok) {
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

  /**
   * Fetches sub-list items from the backend with the given parameters
   * @param {AbortController} controller - an AbortController to handle aborting the request
   * @returns {Promise<void>} - a promise that resolves when the request is complete
   */
  const fetchData = async (controller) => {
    //console.log("Fetching items with params: ", { start, stop, sort, query, url: loadedPlayList });

    try {
      const response = await apiFetch("/getsub", {
        method: "post",
        signal: controller.signal,
        body: JSON.stringify({
          start,
          stop,
          sortDownloaded: sort,
          query,
          url: loadedPlayList,
        }),
      });

      if (controller.signal.aborted) return; // Don't update state if component unmounted

      if (response.ok) {
        const data = await response.text();
        const json_data = JSON.parse(data);
        setItems(json_data["rows"]);
        setPlaylistDirectory(json_data["saveDirectory"]);
        setPlaylistTitle(json_data["playlistTitle"] || "");
        setItemCount(parseInt(json_data["count"]));
      } else {
        // 401 is already reported and logged out by apiFetch.
        setItems([
          {
            positionInPlaylist: 1,
            id: "error-row",
            playlistUrl: loadedPlayList,
            video_metadatum: {
              title: `Error in fetching sub-lists: ${response.status} ${response.statusText}`,
              videoId: "",
              videoUrl: "",
              downloadStatus: false,
              isAvailable: false,
            },
          },
        ]);
        setItemCount(1);
      }
    } catch (_error) {
      if (!controller.signal.aborted) {
        //console.error("Fetch error:", error);
      }
    }
  };
  // useEffects  to load items
  // Fetch data when dependencies change
  useEffect(() => {
    // Handle initial "init" playlist state, unless doing a global search
    if (loadedPlayList === "init" && !query.startsWith("global:")) {
      setItems([]);
      setItemCount(0);
      return;
    }
    const abortController = new AbortController();
    fetchData(abortController);
    return () => abortController.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch, start, stop, sort, query, loadedPlayList, reFetch]);

  // Responsive card media height using MUI breakpoints
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const mediaHeight = isXs ? 220 : isSm ? 200 : isMd ? 160 : 140;

  // Bulk fetch thumbnails
  useEffect(() => {
    if (!items || items.length === 0 || playlistDirectory === "init") return;

    const fetchThumbnails = async () => {
      const filesToFetch = items
        .map((item) => {
          const thumb = item.video_metadatum?.thumbNailFile;
          if (thumb && thumbUrls[thumb] === undefined) {
            return {
              saveDirectory:
                item.video_metadatum?.saveDirectory ?? playlistDirectory,
              fileName: thumb,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (filesToFetch.length === 0) return;

      // Mark as in-progress
      const newThumbUrls = {};
      filesToFetch.forEach((f) => Reflect.set(newThumbUrls, f.fileName, null));
      setThumbUrls((prev) => ({ ...prev, ...newThumbUrls }));

      try {
        const response = await apiFetch("/getfiles", {
          method: "post",
          body: JSON.stringify({ files: filesToFetch }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "success" && data.files) {
            const updates = {};
            Object.entries(data.files).forEach(([fileName, fileData]) => {
              if (fileData?.signedUrlId) {
                Reflect.set(
                  updates,
                  fileName,
                  assetBase + "/getfile?fileId=" + fileData.signedUrlId,
                );
                Reflect.set(thumbMetaRef.current, fileName, {
                  fileId: fileData.signedUrlId,
                  expiry: fileData.expiry,
                });
              } else {
                Reflect.set(updates, fileName, null);
                Reflect.deleteProperty(thumbMetaRef.current, fileName);
              }
            });
            setThumbUrls((prev) => ({ ...prev, ...updates }));
            scheduleThumbnailRefresh();
          }
        }
        // 401 is already reported and logged out by apiFetch.
      } catch (_error) {
        //console.error("Error fetching thumbnails:", error);
      }
    };

    fetchThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, playlistDirectory, apiFetch]);

  useEffect(() => {
    if (downloadedItem.url !== null) {
      //console.log(downloadedItem);
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
  }, [downloadedItem, sort, loadedPlayList, setReFetch]);

  useEffect(() => {
    updateSelected({});
    setSelectAll(false);
    updateSort(false);
    clearThumbnailRefreshTimer();
    thumbMetaRef.current = {};
    setThumbUrls({});
  }, [clearThumbnailRefreshTimer, loadedPlayList]);

  useEffect(() => {
    return () => {
      clearThumbnailRefreshTimer();
    };
  }, [clearThumbnailRefreshTimer]);

  useEffect(() => {
    updateSelected((prevSelected) => {
      const next = { ...prevSelected };
      // Only initialize new items — preserve existing selections
      items.forEach((element) => {
        const url = element.video_metadatum.videoUrl;
        if (!(url in next)) {
          Reflect.set(next, url, false);
        }
      });
      // Remove keys not present in current items
      const currentUrls = new Set(
        items.map((el) => el.video_metadatum.videoUrl),
      );
      Object.keys(next).forEach((key) => {
        if (!currentUrls.has(key)) {
          Reflect.deleteProperty(next, key);
        }
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (
      !(
        Object.keys(selectedItems).length === 0 &&
        selectedItems.constructor === Object
      )
    )
      setSelectAll(
        Object.values(selectedItems).every((value) => {
          return value === true;
        }),
      );
  }, [selectedItems]);

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
      handleChangePage(null, 0); // Reset to the first page if subListIndex is -1
    } else {
      //console.log("subListIndex: ", subListIndex, "itemCount: ", itemCount);
      // Calculate the current page based on the response index
      const currentIndex =
        subListIndex < itemCount ? subListIndex : itemCount - 1;
      const calculatedPage = Math.floor(currentIndex / rowsPerPage);
      //console.log("currentIndex: ", currentIndex, "calculatedPage: ", calculatedPage);
      handleChangePage(null, calculatedPage);
    }
  }, [subListIndex, handleChangePage, rowsPerPage, itemCount]);

  const handleRemove = useCallback(
    (id) => {
      const element = itemsRef.current.find((item) => item.id === id);
      if (!element) return;
      const meta = element.video_metadatum || {};
      setConfirmPayload({
        playListUrl: loadedPlayList,
        mappingId: element.id,
        videoUrl: meta.videoUrl,
        title: meta.title,
        cleanUp: false,
        deleteVideoMappings: true,
        deleteVideosInDB: false,
      });
      setConfirmOpen(true);
    },
    [loadedPlayList],
  );

  const handleDeleteDownloaded = useCallback(
    (id) => {
      const element = itemsRef.current.find((item) => item.id === id);
      if (!element) return;
      const meta = element.video_metadatum || {};
      setConfirmPayload({
        playListUrl: loadedPlayList,
        mappingId: element.id,
        videoUrl: meta.videoUrl,
        title: meta.title,
        cleanUp: true,
        deleteVideoMappings: false,
        deleteVideosInDB: false,
      });
      setConfirmOpen(true);
    },
    [loadedPlayList],
  );

  const handleDeleteDB = useCallback(
    (id) => {
      const element = itemsRef.current.find((item) => item.id === id);
      if (!element) return;
      const meta = element.video_metadatum || {};
      setConfirmPayload({
        playListUrl: loadedPlayList,
        mappingId: element.id,
        videoUrl: meta.videoUrl,
        title: meta.title,
        cleanUp: true,
        deleteVideoMappings: true,
        deleteVideosInDB: true,
      });
      setConfirmOpen(true);
    },
    [loadedPlayList],
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
    [playlistDirectory],
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
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="confirm-delete-title-sub"
      >
        <DialogTitle id="confirm-delete-title-sub">Confirm delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmPayload ? (
              <>
                Are you sure you want to{" "}
                <strong>
                  {confirmPayload.cleanUp &&
                  confirmPayload.deleteVideoMappings &&
                  confirmPayload.deleteVideosInDB
                    ? "Delete from DB and file system"
                    : confirmPayload.cleanUp &&
                        !confirmPayload.deleteVideoMappings
                      ? "Delete downloaded files"
                      : !confirmPayload.cleanUp &&
                          confirmPayload.deleteVideoMappings
                        ? "Delete video from playlist"
                        : "Delete"}
                </strong>{" "}
                for video <strong>{confirmPayload.title}</strong>?
              </>
            ) : (
              "Are you sure you want to perform this delete operation?"
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmPayload) {
                deleteVideo(
                  confirmPayload.playListUrl,
                  confirmPayload.mappingId,
                  confirmPayload.videoUrl,
                  confirmPayload.title,
                  confirmPayload.cleanUp,
                  confirmPayload.deleteVideoMappings,
                  confirmPayload.deleteVideosInDB,
                );
              }
              setConfirmOpen(false);
              setConfirmPayload(null);
            }}
            color="error"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
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
            setCurrentPlayerIndex={setCurrentPlayerIndex}
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
