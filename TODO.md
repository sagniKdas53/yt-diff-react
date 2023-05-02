# TODO

- [x] Make playlist table header static and fix the alignments
- [ ] Use build time variables to make building faster and easier.
- [ ] Find buttons that work best in dark mode.
- [ ] Use react virtuiso to speed things up, it's getting really slow when using this
- [x] Make the New list adding smoother, like the sublist loads before the main list it's not okey
  - [x] There should be a way to find the size of the playlist before it's fully processed right
  - [x] If there is not I can just trick the pagenition to believe there is more data by setting the count to be rowsPerPage + 1 and when it next page is loaded it will sort it out itself
- [x] Make a input form component just to get the feel of things
- [x] Make the input dialog display properly when on different platforms
- [x] Use code splitting to make the page load faster
