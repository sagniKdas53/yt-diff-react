# TODO

1. [ ] When listing single vidoes, this happens, why and how IDK, need to fix it.

```
sublist_to_table:
    Start: 50
    Stop: 60
    Order: list_order
    Type: ASC
    Query: ""
    Reference: None
    sort_downloaded: null


sublist_to_table:
        Start: 40
        Stop: 50
        Order: list_order
        Type: ASC
        Query: ""
        Reference: None
        sort_downloaded: null


sublist_to_table:
        Start: 40
        Stop: 50
        Order: list_order
        Type: ASC
        Query: ""
        Reference: None
        sort_downloaded: null


sublist_to_table:
        Start: 50
        Stop: 60
        Order: list_order
        Type: ASC
        Query: ""
        Reference: None
        sort_downloaded: null


sublist_to_table:
        Start: 50
        Stop: 60
        Order: list_order
        Type: ASC
        Query: ""
        Reference: None
        sort_downloaded: null
```

2. [ ] Add react-router-dom and make only the input and playlist views change the sublist can based on paths stay constant
3. [ ] It would be ideal if the selected items in the sublists can remain selected when the download button is pressed
   1. [ ] Use the id from the socket to operate on selectedItems and set it to be downloaded or not if it fails, this not only doesn't fetch data so many times but also would be faster
   2. [ ] When data is fetched make it so that selectedItems is checked against the fetched data and then the check boxes are assigned as required, this is bad as too much fetching but is simpler to code according to me for now.
4. [ ] Move from react-bootsrap to material ui and then drop the react-bootstrap
   1. [ ] [Material UI](https://mui.com/material-ui/)
5. [ ] Make the watch function on playlists less ugly and more useable
6. [ ] Test and fix if scheduled updates are working or not
   1. [ ] I suspect they aren't need more testing
7.  [ ] Add redux to manage state better
8.  [ ] Add a dark theme
9.  [x] Find out why the button scrolls away with the table body [Fixed]
10. [ ] Add an intermediate state for when the download is done but the description, webp and json are downloading
11. [ ] Reduce the bundle size
