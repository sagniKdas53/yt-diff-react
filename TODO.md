# Major Goals

1. [ ] Use redux to make state management less of a problem
   1. [ ] It will also solve the multiple refresh when data loads all at onec
   2. [ ] It could alos be the fix of #4 in [TODO][link]
2. [ ] Move from react-bootsrap to [Material UI](https://mui.com/material-ui/)
   1. [ ] Make the watch functionality on playlists add component less ugly.
3. [ ] Add a dark theme
4. [ ] [ ] Reduce the bundle size


## TODO

1. [x] Add react-router-dom and make only the input and playlist views change the sublist can based on paths stay constant [Bad_idea]
2. [x] Find out why the button scrolls away with the table body [Fixed]
3. [x] Add an intermediate state for when the download is done but the description, webp and json are downloading
4. [ ] It would be ideal if the selected items in the sublists can remain selected when the download button is pressed
   1. [ ] Use the id from the socket to operate on selectedItems and set it to be downloaded or not if it fails, this not only doesn't fetch data so many times but also would be faster
   2. [ ] When data is fetched make it so that selectedItems is checked against the fetched data and then the check boxes are assigned as required, this is bad as too much fetching but is simpler to code according to me for now.
5. [ ] Find out and fix why sockets work but the nav bar shows it to be disconnected

[link]: #todo