# TODO

1. [ ] Use react virtuiso to speed things up, it's getting really slow when more data is available
2. [x] Write a readme
3. [x] Make playlist table header static and fix the alignments
4. [x] Use build time variables to make building faster and easier.
5. [x] Find buttons that work best in dark mode. [the default is good enough for me]
6. [x] Make the New list adding smoother, like the sublist loads before the main list it's not okey
   1. [x] There should be a way to find the size of the playlist before it's fully processed right
   2. [x] If there is not I can just trick the pagenition to believe there is more data by setting the count to be rowsPerPage + 1 and when it next page is loaded it will sort it out itself
7. [x] Make a input form component just to get the feel of things
8. [x] Make the input dialog display properly when on different platforms
9. [x] Use code splitting to make the page load faster
10. [x] Figure out why the sub-list fetching works only when the sub-list is unloaded
    1. [x] It's as if the pageination is what that breaks the whole thing
    2. [x] Although the whole thing (This passing the rows per page to parent and then to playlist) is done to make pagination work seemlessly
    3. [x] Perhaps resetting the page to zero when the sub-list is loaded form the playlist adding and loading wouldn't be such a bad idea, It will also elemiante this type of warnings
