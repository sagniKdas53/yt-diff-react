# TODO

- [ ] Use build time variables to make rednering faster and easier.
- [ ] Find buttons that work best in dark mode.
- [ ] Use react virtuiso to speed things up, it's getting really slow when using this
- [ ] Make the New list adding smoother, like the sublist loads before the main list it's not okey
  - [ ] There should be a way to find the size of the playlist before it's fully processed right
  - [ ] If there is not I can just trick the pagenition to believe there is more data by setting the count to be rowsPerPage + 1 and when it next page is loaded it will sort it out itself
- [ ] Make a input form component just to get the feel of things
- [ ] Make the input dialog display properly when on different platforms
- [ ] Use code splitting to make the page load faster

## Viewport problems

53px table top, 52 px table bottom 48 px app bar 10 px progress bar
`const fixed = "163px";`
