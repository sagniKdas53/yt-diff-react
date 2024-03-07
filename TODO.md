# TODO

1. [ ] Reduce the number of calls that are made to the backend by un-necessary state changes
   1. [ ] Like the theme changer
   2. [ ] Download causing the playlist and sub-list to loose their position and queries (didn't observe this in prod only in dev)
   3. [ ] Sockets that cause the playlist and sub list to update when the sub list is already fetched
   4. [ ] The loop that is occurring when token expires
2. [ ] Implement the sign-up feature and find a way to make it harder to sign-up maliciously
3. [ ] Review the states and their useEffect's and also make sure that they are being called in the right order
4. [ ] Try building a native app from this code base.
5. [ ] Add some tests
6. [ ] Add more documentation
