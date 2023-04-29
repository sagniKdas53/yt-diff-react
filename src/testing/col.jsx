const columns = [
  {
    id: "id",
    label: "ID",
    align: "center",
    searchable: false,
    sortable: true,
    idx: 1,
    style: { minWidth: 10, paddingInlineEnd: "0px" }
  },
  {
    id: "title",
    label: "Title",
    align: "left",
    searchable: true,
    sortable: false,
    idx: 2,
    style: { minWidth: 10, paddingInline: "0px" }
  },
  {
    id: "watch",
    label: "Updated",
    align: "center",
    searchable: false,
    sortable: true,
    idx: 3,
    style: { minWidth: 10, paddingInlineEnd: "0px" }
  },
  {
    id: "expand",
    label: "Load",
    align: "center",
    searchable: false,
    sortable: false,
    idx: 4,
    style: { minWidth: 10, paddingInlineEnd: "2px" }
  },
];
{columns.map((column) => (
    <TableCell
      key={column.id}
      align={column.align}
      /*padding: top | right and bottom | left */
      style={column.style}
    >
      {column.searchable ? (
        <TextField
          id="title-input"
          label="Title"
          variant="outlined"
          size="small"
          sx={{ width: "100%" }}
          onKeyUp={debouncedQuery}
        />
      ) : (
        <SortHeader
          sortable={column.sortable}
          lable={column.label}
          id={column.idx}
          sort={sort}
          setSort={updateSort}
          order={order}
          setOrder={updateOrder}
        />
      )}
    </TableCell>
  ))}