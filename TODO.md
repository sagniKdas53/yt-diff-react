# TODO

1. [x] Reduce the number of calls that are made to the backend by un-necessary state changes
   1. [x] Like the theme changer
   2. [x] Download causing the playlist and sub-list to loose their position and queries (didn't observe this in prod only in dev)
   3. [x] Sockets that cause the playlist and sub list to update when the sub list is already fetched
   4. [x] The loop that is occurring when token expires
2. [x] Implement the sign-up feature and find a way to make it harder to sign-up maliciously
3. [x] Review the states and their useEffect's and also make sure that they are being called in the right order
4. [ ] Try building a native app from this code base.
5. [x] Add some tests
6. [x] Add more documentation
7. [x] Make download queue positions authoritative
   1. The frontend currently assigns queue positions in the order that `/download` requests are submitted.
   2. This is acceptable while a single user submits one batch at a time, but it may diverge from the backend's actual execution order if requests overlap or concurrency behavior changes.
   3. A future implementation should return or emit backend-assigned queue sequence numbers and use those values for the queue badges.
8. [x] Reconcile the download queue after socket reconnects
   1. The current `init` socket event clears the frontend queue to avoid stale entries.
   2. A temporary connection interruption does not necessarily mean the backend restarted, so active or pending downloads may continue after their frontend queue state is cleared.
   3. A future implementation should expose a backend queue snapshot or connection generation identifier so the frontend can distinguish reconnection from backend restart and restore authoritative state.
9. [-] Investigate and integrate TanStack Query for declarative data fetching to replace reFetch string hacks and manual caching.
   1. I don't think this will be useful at all. Not only is it a popular but potentially risky [library](https://npmscan.com/vulnerability/GHSA-g7cv-rxg3-hmpx), but I also don't understand how it works.
   2. I don't understand how it works
