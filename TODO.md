# TODO

- [x] Make playlist table header static and fix the alignments
- [x] Use build time variables to make building faster and easier.
- [x] Find buttons that work best in dark mode. [the default is good enough for me]
- [ ] Use react virtuiso to speed things up, it's getting really slow when using this
- [x] Make the New list adding smoother, like the sublist loads before the main list it's not okey
  - [x] There should be a way to find the size of the playlist before it's fully processed right
  - [x] If there is not I can just trick the pagenition to believe there is more data by setting the count to be rowsPerPage + 1 and when it next page is loaded it will sort it out itself
- [x] Make a input form component just to get the feel of things
- [x] Make the input dialog display properly when on different platforms
- [x] Use code splitting to make the page load faster
- [ ] Figure out why the sub-list fetching works only when the sub-list is unloaded
  - [ ] It's as if the pageination is what that breaks the whole thing
  - [ ] Although the whole thing (This passing the rows per page to parent and then to playlist) is done to make pagination work seemlessly
  - [ ] Perhaps resetting the page to zero when the sub-list is loaded form the playlist adding and loading wouldn't be such a bad idea, It will also elemiante this type of warnings

  ```error
  Failed prop type: MUI: The page prop of a TablePagination is out of range (0 to 0, but page is 1).
  ```
