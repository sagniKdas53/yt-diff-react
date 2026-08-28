/**
 * GENERATED FILE — do not edit.
 *
 * Regenerate from the backend repository with `deno task gen:api`. The source
 * of truth is the endpoint table in `src/routes/endpoints.ts` plus the
 * response schemas in `src/routes/openapi.ts`; `openapi.json` at that repo's
 * root is emitted alongside this file and describes the same shapes.
 *
 * Consumed from plain JavaScript through `checkJs`: `post("/getsub", body)`
 * in `src/api/client.js` is typed by the route union below, so both the
 * request body and the parsed response have real types at every call site.
 */

/**
 * @typedef {{
  "urlList": Array<string>,
  "chunkSize"?: (string | number),
  "sleep"?: boolean,
  "monitoringType"?: string,
}} ListRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": "Listing initiated",
  "items": Array<{
    "url": string,
    "type": string,
    "currentMonitoringType"?: string,
    "previousMonitoringType"?: string,
    "reason": string,
  }>,
  "queueDepthBefore": number,
}} ListResponse
 */

/**
 * @typedef {{
  "urlList": Array<string>,
  "playListUrl"?: string,
}} DownloadRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": "Downloads initiated",
  "items": Array<{
    "url": string,
    "title": string,
    "saveDirectory": string,
    "videoId": string,
  }>,
}} DownloadResponse
 */

/**
 * @typedef {{
  "url": string,
  "watch": string,
}} WatchRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": string,
}} WatchResponse
 */

/**
 * @typedef {{
  "start"?: number,
  "stop"?: number,
  "sort"?: string,
  "order"?: string,
  "query"?: string,
}} GetplayRequest
 */

/**
 * @typedef {{
  "count": number,
  "rows": Array<{
    "id": number,
    "playlistUrl": string,
    "title": string,
    "monitoringType": string,
    "sortOrder": number,
    "saveDirectory"?: (string | null),
    "lastUpdatedByScheduler"?: (string | null),
    "createdAt"?: string,
    "updatedAt"?: string,
  }>,
}} GetplayResponse
 */

/**
 * @typedef {{
  "playListUrl": string,
  "deleteAllVideosInPlaylist"?: boolean,
  "deletePlaylist"?: boolean,
  "cleanUp"?: boolean,
}} DelplayRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": string,
  "cleanUp": boolean,
  "deletePlaylist": boolean,
  "deleteAllVideosInPlaylist": boolean,
}} DelplayResponse
 */

/**
 * @typedef {{
  "url"?: string,
  "start"?: number,
  "stop"?: number,
  "query"?: string,
  "sortDownloaded"?: boolean,
}} GetsubRequest
 */

/**
 * @typedef {{
  "count": number,
  "rows": Array<{
    "id": string,
    "positionInPlaylist": number,
    "playlistUrl": string,
    "video_metadatum": {
      "title"?: string,
      "videoId"?: string,
      "videoUrl"?: string,
      "downloadStatus"?: boolean,
      "isAvailable"?: boolean,
      "fileName"?: (string | null),
      "thumbNailFile"?: (string | null),
      "onlineThumbnail"?: (string | null),
      "subTitleFile"?: (string | null),
      "descriptionFile"?: (string | null),
      "isMetaDataSynced"?: boolean,
      "saveDirectory"?: (string | null),
    },
  }>,
  "saveDirectory": string,
  "playlistTitle": (string | null),
}} GetsubResponse
 */

/**
 * @typedef {{
  "playListUrl": string,
  "mappingIds"?: Array<string>,
  "videoUrls"?: Array<string>,
  "cleanUp"?: boolean,
  "deleteVideoMappings"?: boolean,
  "deleteVideosInDB"?: boolean,
}} DelsubRequest
 */

/**
 * @typedef {{
  "message": string,
  "deleted": Array<string>,
  "failed": Array<string>,
  "cleanUp": boolean,
  "deleteVideoMappings": boolean,
  "deleteVideosInDB": boolean,
}} DelsubResponse
 */

/**
 * @typedef {{
  "saveDirectory"?: string,
  "fileName": string,
}} GetfileRequest
 */

/**
 * @typedef {{
  "status": "success",
  "signedUrlId": string,
  "expiry": number,
}} GetfileResponse
 */

/**
 * @typedef {{
  "fileId": string,
}} RefreshfileRequest
 */

/**
 * @typedef {{
  "status": "success",
  "expiry": number,
}} RefreshfileResponse
 */

/**
 * @typedef {{
  "fileIds": Array<string>,
}} RefreshfilesRequest
 */

/**
 * @typedef {{
  "status": "success",
  "files": { [key: string]: ({
    "signedUrlId"?: string,
    "expiry"?: number,
  } | null) },
}} RefreshfilesResponse
 */

/**
 * @typedef {{
  "files": Array<{
    "saveDirectory"?: string,
    "fileName"?: string,
  }>,
}} GetfilesRequest
 */

/**
 * @typedef {{
  "status": "success",
  "files": { [key: string]: ({
    "signedUrlId"?: string,
    "expiry"?: number,
  } | null) },
}} GetfilesResponse
 */

/**
 * @typedef {{
  "start"?: (string | number),
  "stop"?: (string | number),
  "siteFilter"?: string,
  "chunkSize"?: (string | number),
}} ReindexallRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": string,
  "queued": number,
  "total": number,
  "start"?: number,
  "stop"?: number,
  "siteFilter"?: string,
  "chunkSize"?: number,
  "batchId"?: (string | null),
}} ReindexallResponse
 */

/**
 * @typedef {{
  "dryRun"?: boolean,
  "siteFilter"?: string,
}} DedupUnlistedRequest
 */

/**
 * @typedef {{
  "status": "success",
  "dryRun"?: boolean,
  "siteFilter"?: string,
  "videoDuplicatesFound": number,
  "videoMergedCount": number,
  "videoDetails": Array<{ [key: string]: unknown }>,
  "playlistDuplicatesFound"?: number,
  "playlistMergedCount"?: number,
  "playlistDetails"?: Array<{ [key: string]: unknown }>,
}} DedupUnlistedResponse
 */

/**
 * @typedef {{
  "dryRun"?: boolean,
  "siteFilter"?: string,
}} DedupPlaylistsRequest
 */

/**
 * @typedef {{
  "status": "success",
  "dryRun"?: boolean,
  "siteFilter"?: string,
  "videoDuplicatesFound"?: number,
  "videoMergedCount"?: number,
  "videoDetails"?: Array<{ [key: string]: unknown }>,
  "playlistDuplicatesFound": number,
  "playlistMergedCount": number,
  "playlistDetails": Array<{ [key: string]: unknown }>,
}} DedupPlaylistsResponse
 */

/**
 * @typedef {Record<string, never>} QueuestatusRequest
 */

/**
 * @typedef {{
  "status": "success",
  "generation": (string | number),
  "queue": Array<{
    "url": string,
    "title": string,
    "status": string,
    "queuePosition": number,
  }>,
}} QueuestatusResponse
 */

/**
 * @typedef {Record<string, never>} RefreshRequest
 */

/**
 * @typedef {{
  "status": "success",
  "token": string,
  "expiresAt": number,
}} RefreshResponse
 */

/**
 * @typedef {{
  "username": string,
  "password": string,
}} RegisterRequest
 */

/**
 * @typedef {{
  "status": "success",
  "message": string,
}} RegisterResponse
 */

/**
 * @typedef {{
  "username": string,
  "password": string,
}} LoginRequest
 */

/**
 * @typedef {{
  "status": "success",
  "token": string,
  "expiresAt": number,
}} LoginResponse
 */

/**
 * @typedef {{
  "sendStats"?: boolean,
}} IsregallowedRequest
 */

/**
 * @typedef {{
  "registrationAllowed": boolean,
  "currentUsers"?: number,
  "maxUsers"?: number,
}} IsregallowedResponse
 */

/** @typedef {{path: "/list", request: ListRequest, response: ListResponse}} ListRoute */
/** @typedef {{path: "/download", request: DownloadRequest, response: DownloadResponse}} DownloadRoute */
/** @typedef {{path: "/watch", request: WatchRequest, response: WatchResponse}} WatchRoute */
/** @typedef {{path: "/getplay", request: GetplayRequest, response: GetplayResponse}} GetplayRoute */
/** @typedef {{path: "/delplay", request: DelplayRequest, response: DelplayResponse}} DelplayRoute */
/** @typedef {{path: "/getsub", request: GetsubRequest, response: GetsubResponse}} GetsubRoute */
/** @typedef {{path: "/delsub", request: DelsubRequest, response: DelsubResponse}} DelsubRoute */
/** @typedef {{path: "/getfile", request: GetfileRequest, response: GetfileResponse}} GetfileRoute */
/** @typedef {{path: "/refreshfile", request: RefreshfileRequest, response: RefreshfileResponse}} RefreshfileRoute */
/** @typedef {{path: "/refreshfiles", request: RefreshfilesRequest, response: RefreshfilesResponse}} RefreshfilesRoute */
/** @typedef {{path: "/getfiles", request: GetfilesRequest, response: GetfilesResponse}} GetfilesRoute */
/** @typedef {{path: "/reindexall", request: ReindexallRequest, response: ReindexallResponse}} ReindexallRoute */
/** @typedef {{path: "/dedup-unlisted", request: DedupUnlistedRequest, response: DedupUnlistedResponse}} DedupUnlistedRoute */
/** @typedef {{path: "/dedup-playlists", request: DedupPlaylistsRequest, response: DedupPlaylistsResponse}} DedupPlaylistsRoute */
/** @typedef {{path: "/queuestatus", request: QueuestatusRequest, response: QueuestatusResponse}} QueuestatusRoute */
/** @typedef {{path: "/refresh", request: RefreshRequest, response: RefreshResponse}} RefreshRoute */
/** @typedef {{path: "/register", request: RegisterRequest, response: RegisterResponse}} RegisterRoute */
/** @typedef {{path: "/login", request: LoginRequest, response: LoginResponse}} LoginRoute */
/** @typedef {{path: "/isregallowed", request: IsregallowedRequest, response: IsregallowedResponse}} IsregallowedRoute */

/**
 * Every route, as a discriminated union on `path`.
 *
 * @typedef {ListRoute
 *   | DownloadRoute
 *   | WatchRoute
 *   | GetplayRoute
 *   | DelplayRoute
 *   | GetsubRoute
 *   | DelsubRoute
 *   | GetfileRoute
 *   | RefreshfileRoute
 *   | RefreshfilesRoute
 *   | GetfilesRoute
 *   | ReindexallRoute
 *   | DedupUnlistedRoute
 *   | DedupPlaylistsRoute
 *   | QueuestatusRoute
 *   | RefreshRoute
 *   | RegisterRoute
 *   | LoginRoute
 *   | IsregallowedRoute} ApiRoute
 */

export {};
