import { forwardRef, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { TableVirtuoso } from 'react-virtuoso';
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import TableSortLabel from "@mui/material/TableSortLabel";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Link from "@mui/material/Link";

const VirtuosoTableComponents = {
    // eslint-disable-next-line react/display-name
    Scroller: forwardRef((props, ref) => (
        <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
        <Table stickyHeader size="small" aria-label="sub-list table" {...props} />
    ),
    TableHead,
    // eslint-disable-next-line react/prop-types, no-unused-vars
    TableRow: ({ item: _item, ...props }) => <TableRow hover role="checkbox" tabIndex={-1} {...props} />,
    // eslint-disable-next-line react/display-name
    TableBody: forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};

export default function ReactVirtualizedTable() {
    const [selectedItems, updateSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);

    const handleSelection = (event) => {
        const { id, checked } = event.target;
        updateSelected((prevItems) => ({ ...prevItems, [id]: checked }));
    };
    
    const bulkAction = () => {
        const tempState = {};
        data['rows'].forEach((element) => {
            tempState[element.id] = !selectAll;
        });
        updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
        setSelectAll(!selectAll);
    };

    function fixedHeaderContent() {
        return (
            <TableRow>
                <TableCell
                    padding="checkbox"
                    key="check-head"
                    align="center"
                    style={{ minWidth: 10 }}
                >
                    <Checkbox
                        color="primary"
                        indeterminate={
                            selectAll
                                ? false
                                : Object.values(selectedItems).filter((value) => value)
                                    .length > 0
                        }
                        checked={selectAll}
                        onChange={bulkAction}
                        inputProps={{
                            "aria-label": "select all items",
                        }}
                    />
                </TableCell>
                <TableCell
                    key="title-head"
                    align="center"
                    style={{ minWidth: 10 }}
                    sx={{ width: "75%" }}
                >
                    <TextField
                        id="title-input"
                        label="Title"
                        variant="outlined"
                        size="small"
                        sx={{ width: "100%" }}
                    // onKeyUp={debouncedQuery}
                    />
                </TableCell>
                <TableCell
                    key="saved-head"
                    align="center"
                    style={{ minWidth: 10 }}
                >
                    <TableSortLabel
                        // active={sort}
                        // direction={sort ? "asc" : "desc"}
                        // onClick={handleSort}
                        sx={{ paddingInlineStart: 2 }}
                    >
                        Saved
                    </TableSortLabel>
                </TableCell>
            </TableRow>
        );
    }
    
    function rowContent(_index, row) {
        return (
            <>
                <TableCell
                    padding="checkbox"
                    key={_index + "-check"}
                    align="center"
                    style={{ minWidth: 10 }}
                >
                    <Checkbox
                        color="primary"
                        checked={selectedItems[row.id] || false}
                        onChange={handleSelection}
                        id={row.id}
                    />
                </TableCell>
                <TableCell
                    key={_index + "-title"}
                    align="left"
                    sx={{ width: "75%" }}
                >
                    <Link
                        href={row.url}
                        color={
                            row.available
                                ? "inherit"
                                : row.title === "[Deleted video]"
                                    ? "error"
                                    : row.title === "[Private video]"
                                        ? "#f57c00"
                                        : "inherit"
                        }
                        underline="hover"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {row.title}
                    </Link>
                </TableCell>
                <TableCell
                    key={_index + "-status"}
                    padding="checkbox"
                    align="center"
                    style={{ minWidth: 10 }}
                >
                    {row.downloaded ? (
                        <CheckCircleIcon color="success" />
                    ) : (
                        <CancelIcon color="error" />
                    )}
                </TableCell>
            </>
        );
    }
    const data = {
        "count": 129,
        "rows": [
            {
                "url": "https://www.youtube.com/watch?v=eu6STuj4njw",
                "id": "eu6STuj4njw",
                "title": "The Greatest, Terrible Book Ever Made - The Story too Disturbing to be a Movie: Blood Meridian",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 0,
                "createdAt": "2023-04-25T13:21:14.463Z",
                "updatedAt": "2023-04-25T13:21:14.463Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=X1FbwooXssQ",
                "id": "X1FbwooXssQ",
                "title": "The Most Painful Death Ever (VIEWER DISCRETION)",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 1,
                "createdAt": "2023-04-25T13:21:14.464Z",
                "updatedAt": "2023-04-25T13:21:14.464Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ZwA1xqB6l6o",
                "id": "ZwA1xqB6l6o",
                "title": "The Devil vs. Jesus - The Battle of Paradise Regained Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 2,
                "createdAt": "2023-04-25T13:21:14.472Z",
                "updatedAt": "2023-04-25T13:21:14.472Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=hKcXzCHdkLo",
                "id": "hKcXzCHdkLo",
                "title": "The Bizarre Death of Gloria Ramirez - The Toxic Lady Incident",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 3,
                "createdAt": "2023-04-25T13:21:14.475Z",
                "updatedAt": "2023-04-25T13:21:14.475Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=XxqmE4gJdlk",
                "id": "XxqmE4gJdlk",
                "title": "The Mystery of the Bomb Collar Bank Heist",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 4,
                "createdAt": "2023-04-25T13:21:14.570Z",
                "updatedAt": "2023-04-25T13:21:14.570Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=YJyO6YR_cXc",
                "id": "YJyO6YR_cXc",
                "title": "Skinamarink Explained - A Forgotten Nightmare",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 5,
                "createdAt": "2023-04-25T13:21:14.687Z",
                "updatedAt": "2023-04-25T13:21:14.687Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=_1P2CYSOdG0",
                "id": "_1P2CYSOdG0",
                "title": "The Mandela Revelations",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 6,
                "createdAt": "2023-04-25T13:21:14.816Z",
                "updatedAt": "2023-04-25T13:21:14.816Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=TZAL-CNnP7k",
                "id": "TZAL-CNnP7k",
                "title": "The Unexplainable Disappearance of Dennis Martin - Missing 411",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 7,
                "createdAt": "2023-04-25T13:21:14.817Z",
                "updatedAt": "2023-04-25T13:21:14.817Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ivyQn5oDxFQ",
                "id": "ivyQn5oDxFQ",
                "title": "Exploring An Abandoned Nuclear Power Plant",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 8,
                "createdAt": "2023-04-25T13:21:14.819Z",
                "updatedAt": "2023-04-25T13:21:14.819Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=idqPwX1XQOg",
                "id": "idqPwX1XQOg",
                "title": "The Lost Books of the Bible",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 9,
                "createdAt": "2023-04-25T13:21:14.820Z",
                "updatedAt": "2023-04-25T13:21:14.820Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=YhsNinzPEb8",
                "id": "YhsNinzPEb8",
                "title": "The Controversial Missing Children Milk Carton Program",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 10,
                "createdAt": "2023-04-25T13:21:15.029Z",
                "updatedAt": "2023-04-25T13:21:15.029Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=4T6mwZd1T9M",
                "id": "4T6mwZd1T9M",
                "title": "The Haunting Mystery of the Brown Mountain Lights",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 11,
                "createdAt": "2023-04-25T13:21:15.039Z",
                "updatedAt": "2023-04-25T13:21:15.039Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=B9m9e_AXOgA",
                "id": "B9m9e_AXOgA",
                "title": "YouTube's Scariest Videos - Charity Challenge w/ Mista GG",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 12,
                "createdAt": "2023-04-25T13:21:15.035Z",
                "updatedAt": "2023-04-25T13:21:15.035Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=8TzH0ayIcdo",
                "id": "8TzH0ayIcdo",
                "title": "The Darkest Story I've Ever Read",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 13,
                "createdAt": "2023-04-25T13:21:15.043Z",
                "updatedAt": "2023-04-25T13:21:15.043Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=3pfsSh_fTAc",
                "id": "3pfsSh_fTAc",
                "title": "That Time the CIA Faked a Vampire Attack to Take Over a Country",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 14,
                "createdAt": "2023-04-25T13:21:15.038Z",
                "updatedAt": "2023-04-25T13:21:15.038Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=HvojrXpY3f8",
                "id": "HvojrXpY3f8",
                "title": "The Most Disturbing Black & White Movie Ever Made",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 15,
                "createdAt": "2023-04-25T13:21:15.053Z",
                "updatedAt": "2023-04-25T13:21:15.053Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=VbO9qJdXpYU",
                "id": "VbO9qJdXpYU",
                "title": "Frankenstein - The Original Horror Story",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 16,
                "createdAt": "2023-04-25T13:21:15.059Z",
                "updatedAt": "2023-04-25T13:21:15.059Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=BU8JdsjrgiE",
                "id": "BU8JdsjrgiE",
                "title": "The Mystery of Vincent Van Gogh's Death",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 17,
                "createdAt": "2023-04-25T13:21:15.059Z",
                "updatedAt": "2023-04-25T13:21:15.059Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=UFCzDl3_KeQ",
                "id": "UFCzDl3_KeQ",
                "title": "A Maze of Terror - The Backrooms Series Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 18,
                "createdAt": "2023-04-25T13:21:15.060Z",
                "updatedAt": "2023-04-25T13:21:15.060Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=QI_qpsODXck",
                "id": "QI_qpsODXck",
                "title": "The Devil's Story of Eden - Paradise Lost Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 19,
                "createdAt": "2023-04-25T13:21:15.062Z",
                "updatedAt": "2023-04-25T13:21:15.062Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ScHzMnAcn_s",
                "id": "ScHzMnAcn_s",
                "title": "The Time Germans & Americans Fought TOGETHER in WWII - The Battle of Castle Itter",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 20,
                "createdAt": "2023-04-25T13:21:15.090Z",
                "updatedAt": "2023-04-25T13:21:15.090Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=aFjUMezv2bE",
                "id": "aFjUMezv2bE",
                "title": "The Most Disturbing Haunted House of All Time: McKamey Manor",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 21,
                "createdAt": "2023-04-25T13:21:15.091Z",
                "updatedAt": "2023-04-25T13:21:15.091Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=6cSFF0he8G8",
                "id": "6cSFF0he8G8",
                "title": "The Unexplainable Disappearances of Missing 411",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 22,
                "createdAt": "2023-04-25T13:21:15.092Z",
                "updatedAt": "2023-04-25T13:21:15.092Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=RMABlI7TDbQ",
                "id": "RMABlI7TDbQ",
                "title": "The Boys on the Tracks & a 35 Year Cover-up",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 23,
                "createdAt": "2023-04-25T13:21:15.127Z",
                "updatedAt": "2023-04-25T13:21:15.127Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=sPYZxNao1Bg",
                "id": "sPYZxNao1Bg",
                "title": "The Mandela Catalogue's Conquest of Fear",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 24,
                "createdAt": "2023-04-25T13:21:15.129Z",
                "updatedAt": "2023-04-25T13:21:15.129Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=xZwFxWb0y7w",
                "id": "xZwFxWb0y7w",
                "title": "The Cult, Standoff, & Conspiracy of Waco",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 25,
                "createdAt": "2023-04-25T13:21:15.136Z",
                "updatedAt": "2023-04-25T13:21:15.136Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=tLfxzhp2M2A",
                "id": "tLfxzhp2M2A",
                "title": "The Story & Footage of LA's Most Infamous Heist Gone Wrong",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 26,
                "createdAt": "2023-04-25T13:21:15.137Z",
                "updatedAt": "2023-04-25T13:21:15.137Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=b__PdJegZTA",
                "id": "b__PdJegZTA",
                "title": "Dante's Paradiso & The 9 Levels of Heaven Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 27,
                "createdAt": "2023-04-25T13:21:15.138Z",
                "updatedAt": "2023-04-25T13:21:15.138Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=CQBOA061ugE",
                "id": "CQBOA061ugE",
                "title": "The Conspiracy Theory Iceberg",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 28,
                "createdAt": "2023-04-25T13:21:15.208Z",
                "updatedAt": "2023-04-25T13:21:15.208Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=tRW8gO_fBNk",
                "id": "tRW8gO_fBNk",
                "title": "Salad Fingers Explained: An Analysis of Broken Imaginations",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 29,
                "createdAt": "2023-04-25T13:21:15.205Z",
                "updatedAt": "2023-04-25T13:21:15.205Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=eS1YssDSXBY",
                "id": "eS1YssDSXBY",
                "title": "The American Broadcaster Convicted of Treason: Tokyo Rose",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 30,
                "createdAt": "2023-04-25T13:21:15.206Z",
                "updatedAt": "2023-04-25T13:21:15.206Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=8EQcBL5v9To",
                "id": "8EQcBL5v9To",
                "title": "The Downfall of Henry Ford's Secret Country in Brazil",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 31,
                "createdAt": "2023-04-25T13:21:15.210Z",
                "updatedAt": "2023-04-25T13:21:15.210Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=rBANOQm3w9E",
                "id": "rBANOQm3w9E",
                "title": "The Lost Footage of the Hypnagogic Archive",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 32,
                "createdAt": "2023-04-25T13:21:15.211Z",
                "updatedAt": "2023-04-25T13:21:15.211Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=Yi16FrMjmlQ",
                "id": "Yi16FrMjmlQ",
                "title": "The Hypnagogic Archive: An Anthology ARG",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 33,
                "createdAt": "2023-04-25T13:21:15.221Z",
                "updatedAt": "2023-04-25T13:21:15.221Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=DKdXajrLt4M",
                "id": "DKdXajrLt4M",
                "title": "The FNAF VHS Tapes: An Analog Horror Adaptation",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 34,
                "createdAt": "2023-04-25T13:21:15.223Z",
                "updatedAt": "2023-04-25T13:21:15.223Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=I4PulJyAy3k",
                "id": "I4PulJyAy3k",
                "title": "The Complete Five Nights at Freddy's Story Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 35,
                "createdAt": "2023-04-25T13:21:15.229Z",
                "updatedAt": "2023-04-25T13:21:15.229Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=g8iMxX8dH3o",
                "id": "g8iMxX8dH3o",
                "title": "The Bizarre Mystery of the Khamar Daban Deaths",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 36,
                "createdAt": "2023-04-25T13:21:15.226Z",
                "updatedAt": "2023-04-25T13:21:15.226Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=P8kFYozFKFg",
                "id": "P8kFYozFKFg",
                "title": "The Deadliest Shipwreck & Shark Attack in Naval History",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 37,
                "createdAt": "2023-04-25T13:21:15.239Z",
                "updatedAt": "2023-04-25T13:21:15.239Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=oMlJjWKIaBY",
                "id": "oMlJjWKIaBY",
                "title": "The Controversial Disease with Illegal Symptoms",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 38,
                "createdAt": "2023-04-25T13:21:15.237Z",
                "updatedAt": "2023-04-25T13:21:15.237Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=gCUFztOkrEU",
                "id": "gCUFztOkrEU",
                "title": "Dante's Purgatorio & The 9 Levels of Purgatory Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 39,
                "createdAt": "2023-04-25T13:21:15.239Z",
                "updatedAt": "2023-04-25T13:21:15.239Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=bHvc-XsYf80",
                "id": "bHvc-XsYf80",
                "title": "The Tragic Voyage of Terror: The Lost Franklin Expedition",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 40,
                "createdAt": "2023-04-25T13:21:15.252Z",
                "updatedAt": "2023-04-25T13:21:15.252Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=_KkTTD1Dlwg",
                "id": "_KkTTD1Dlwg",
                "title": "The Mass Hysteria Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 41,
                "createdAt": "2023-04-25T13:21:15.246Z",
                "updatedAt": "2023-04-25T13:21:15.246Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=4TA2AIuAuW8",
                "id": "4TA2AIuAuW8",
                "title": "The Conspiracy Behind MLK’s Assassination",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 42,
                "createdAt": "2023-04-25T13:21:15.259Z",
                "updatedAt": "2023-04-25T13:21:15.259Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ReSau7rQGxs",
                "id": "ReSau7rQGxs",
                "title": "If I'm Disturbed, I Donate - Youtube's Scariest Videos w/ Mista GG",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 43,
                "createdAt": "2023-04-25T13:21:15.257Z",
                "updatedAt": "2023-04-25T13:21:15.257Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=AVDrZYI_tHs",
                "id": "AVDrZYI_tHs",
                "title": "The Conspiracy Theory Tier List",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 44,
                "createdAt": "2023-04-25T13:21:15.258Z",
                "updatedAt": "2023-04-25T13:21:15.258Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=qhMXFnAcS30",
                "id": "qhMXFnAcS30",
                "title": "The Final Depths of the Conspiracy Theory Iceberg",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 45,
                "createdAt": "2023-04-25T13:21:15.275Z",
                "updatedAt": "2023-04-25T13:21:15.275Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=FaqHyMOxqiw",
                "id": "FaqHyMOxqiw",
                "title": "The Man Who Stepped Off the Earth: Chris McCandless",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 46,
                "createdAt": "2023-04-25T13:21:15.280Z",
                "updatedAt": "2023-04-25T13:21:15.280Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=pUZuD61AkA0",
                "id": "pUZuD61AkA0",
                "title": "The Monsters Beneath Us: The Monument Mythos",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 47,
                "createdAt": "2023-04-25T13:21:15.292Z",
                "updatedAt": "2023-04-25T13:21:15.292Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=WyseR8_J1kY",
                "id": "WyseR8_J1kY",
                "title": "The Horrific Serial Killer Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 48,
                "createdAt": "2023-04-25T13:21:15.296Z",
                "updatedAt": "2023-04-25T13:21:15.296Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ilMxnexlhZ0",
                "id": "ilMxnexlhZ0",
                "title": "The Monstrous Serial Killer Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 49,
                "createdAt": "2023-04-25T13:21:15.297Z",
                "updatedAt": "2023-04-25T13:21:15.297Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=52pNGNMeYec",
                "id": "52pNGNMeYec",
                "title": "Sunday Studies: Absalom's Folly",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 50,
                "createdAt": "2023-04-25T13:21:23.478Z",
                "updatedAt": "2023-04-25T13:21:23.478Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=IZa2Uo1hrcc",
                "id": "IZa2Uo1hrcc",
                "title": "A Hopeful Hell: I Have No Mouth and I Must Scream",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 51,
                "createdAt": "2023-04-25T13:21:23.498Z",
                "updatedAt": "2023-04-25T13:21:23.498Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=_hB7D5RH0Qw",
                "id": "_hB7D5RH0Qw",
                "title": "The Conspiracy Theory Iceberg (part 9 3/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 52,
                "createdAt": "2023-04-25T13:21:23.499Z",
                "updatedAt": "2023-04-25T13:21:23.499Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=RdfuxE8ggQM",
                "id": "RdfuxE8ggQM",
                "title": "The Most Terrifying Ocean Mysteries",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 53,
                "createdAt": "2023-04-25T13:21:23.500Z",
                "updatedAt": "2023-04-25T13:21:23.500Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=VO-ZvVrknfc",
                "id": "VO-ZvVrknfc",
                "title": "The True Stories of the Warren Hauntings: The Conjuring, Annabelle, Amityville, and Other Encounters",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 54,
                "createdAt": "2023-04-25T13:21:23.505Z",
                "updatedAt": "2023-04-25T13:21:23.505Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ftop4SpTHO8",
                "id": "ftop4SpTHO8",
                "title": "The Most Disturbing Analog Horror Story: The Mandela Catalogue",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 55,
                "createdAt": "2023-04-25T13:21:23.519Z",
                "updatedAt": "2023-04-25T13:21:23.519Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=NGbuZ-65Qz8",
                "id": "NGbuZ-65Qz8",
                "title": "Dante's Inferno & The 9 Levels of Hell Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 56,
                "createdAt": "2023-04-25T13:21:23.523Z",
                "updatedAt": "2023-04-25T13:21:23.523Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=BHXw3E1VqK4",
                "id": "BHXw3E1VqK4",
                "title": "The Weird & Dirty Social Experiment - The Acali Raft",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 57,
                "createdAt": "2023-04-25T13:21:23.523Z",
                "updatedAt": "2023-04-25T13:21:23.523Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=9i3QPva-tdw",
                "id": "9i3QPva-tdw",
                "title": "The 9 Types of Biblical Angels Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 58,
                "createdAt": "2023-04-25T13:21:23.532Z",
                "updatedAt": "2023-04-25T13:21:23.532Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=jLoTkHI_vFU",
                "id": "jLoTkHI_vFU",
                "title": "The Conspiracy Theory Iceberg (part 9 2/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 59,
                "createdAt": "2023-04-25T13:21:23.535Z",
                "updatedAt": "2023-04-25T13:21:23.535Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=3Vslc-SvYMc",
                "id": "3Vslc-SvYMc",
                "title": "The Dementia Simulation - Everywhere at the End of Time Reaction",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 60,
                "createdAt": "2023-04-25T13:21:23.534Z",
                "updatedAt": "2023-04-25T13:21:23.534Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=igpPobyAJSc",
                "id": "igpPobyAJSc",
                "title": "The Walking Dead Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 61,
                "createdAt": "2023-04-25T13:21:23.549Z",
                "updatedAt": "2023-04-25T13:21:23.549Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=Zg429WIGBGo",
                "id": "Zg429WIGBGo",
                "title": "The Depraved Serial Killer Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 62,
                "createdAt": "2023-04-25T13:21:23.555Z",
                "updatedAt": "2023-04-25T13:21:23.555Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=zJr4rZazQy4",
                "id": "zJr4rZazQy4",
                "title": "Every Political Ideology Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 63,
                "createdAt": "2023-04-25T13:21:23.556Z",
                "updatedAt": "2023-04-25T13:21:23.556Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=XLmJxnT1cuY",
                "id": "XLmJxnT1cuY",
                "title": "The Conspiracy Theory Iceberg (part 9 1/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 64,
                "createdAt": "2023-04-25T13:21:23.563Z",
                "updatedAt": "2023-04-25T13:21:23.563Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ItyX8onyUsk",
                "id": "ItyX8onyUsk",
                "title": "The Spy Who Hilariously Won World War 2",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 65,
                "createdAt": "2023-04-25T13:21:23.564Z",
                "updatedAt": "2023-04-25T13:21:23.564Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=zcKR0KhTgHg",
                "id": "zcKR0KhTgHg",
                "title": "Mystery Flesh Pit National Park",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 66,
                "createdAt": "2023-04-25T13:21:23.560Z",
                "updatedAt": "2023-04-25T13:21:23.560Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=uOpMgvPKItw",
                "id": "uOpMgvPKItw",
                "title": "The Oddest Serial Killer Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 67,
                "createdAt": "2023-04-25T13:21:23.570Z",
                "updatedAt": "2023-04-25T13:21:23.570Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=Dv2fzJ2BOo4",
                "id": "Dv2fzJ2BOo4",
                "title": "The Psychopath Test - Hare Psychopathy Checklist",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 68,
                "createdAt": "2023-04-25T13:21:23.574Z",
                "updatedAt": "2023-04-25T13:21:23.574Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=2NFW6EJpecQ",
                "id": "2NFW6EJpecQ",
                "title": "Sunday Studies: Aaron & Hur",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 69,
                "createdAt": "2023-04-25T13:21:23.576Z",
                "updatedAt": "2023-04-25T13:21:23.576Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ulBDEDP1rCU",
                "id": "ulBDEDP1rCU",
                "title": "The Cannibal Killing of Michael Rockefeller",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 70,
                "createdAt": "2023-04-25T13:21:23.577Z",
                "updatedAt": "2023-04-25T13:21:23.577Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=plLSDeO8R_Q",
                "id": "plLSDeO8R_Q",
                "title": "The Conspiracy Theory Iceberg (part 8 3/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 71,
                "createdAt": "2023-04-25T13:21:23.581Z",
                "updatedAt": "2023-04-25T13:21:23.581Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=qN6YFa2scFA",
                "id": "qN6YFa2scFA",
                "title": "The Weirdest Serial Killers Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 72,
                "createdAt": "2023-04-25T13:21:23.610Z",
                "updatedAt": "2023-04-25T13:21:23.610Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=9zP1SzLxkJ4",
                "id": "9zP1SzLxkJ4",
                "title": "The Conspiracy Theory Iceberg (part 8 2/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 73,
                "createdAt": "2023-04-25T13:21:23.610Z",
                "updatedAt": "2023-04-25T13:21:23.610Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=sPiUiDc--vQ",
                "id": "sPiUiDc--vQ",
                "title": "Sunday Studies: The Death of David",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 74,
                "createdAt": "2023-04-25T13:21:23.611Z",
                "updatedAt": "2023-04-25T13:21:23.611Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=qMpLduv8fqg",
                "id": "qMpLduv8fqg",
                "title": "The Scariest Series on YouTube: Gemini Home Entertainment",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 75,
                "createdAt": "2023-04-25T13:21:23.612Z",
                "updatedAt": "2023-04-25T13:21:23.612Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=sFXTOto8Bcw",
                "id": "sFXTOto8Bcw",
                "title": "The Serial Killer Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 76,
                "createdAt": "2023-04-25T13:21:23.613Z",
                "updatedAt": "2023-04-25T13:21:23.613Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=VRChStTYLxA",
                "id": "VRChStTYLxA",
                "title": "A director sent us \"The Most Disturbing Movie Ever Made\" ft. Mista GG & Plagued Moth",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 77,
                "createdAt": "2023-04-25T13:21:23.631Z",
                "updatedAt": "2023-04-25T13:21:23.631Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=kwvguW8xBx0",
                "id": "kwvguW8xBx0",
                "title": "The Bible Theory Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 78,
                "createdAt": "2023-04-25T13:21:23.628Z",
                "updatedAt": "2023-04-25T13:21:23.628Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=017pOV2pb1U",
                "id": "017pOV2pb1U",
                "title": "Resident Evil 8 WOLFSBANE 2 HOUR SPEEDRUN",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 79,
                "createdAt": "2023-04-25T13:21:23.637Z",
                "updatedAt": "2023-04-25T13:21:23.637Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=XV8fX7tEbXg",
                "id": "XV8fX7tEbXg",
                "title": "The Conspiracy Theory Iceberg (part 8 1/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 80,
                "createdAt": "2023-04-25T13:21:23.639Z",
                "updatedAt": "2023-04-25T13:21:23.639Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=M9LzHT1bI44",
                "id": "M9LzHT1bI44",
                "title": "Black Ops 1 but it’s 2020",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 81,
                "createdAt": "2023-04-25T13:21:23.648Z",
                "updatedAt": "2023-04-25T13:21:23.648Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=-r_SIhqC3qs",
                "id": "-r_SIhqC3qs",
                "title": "The Story of the 38 Minute War",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 82,
                "createdAt": "2023-04-25T13:21:23.644Z",
                "updatedAt": "2023-04-25T13:21:23.644Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=bptr7UvrCbQ",
                "id": "bptr7UvrCbQ",
                "title": "The Unsolved True Crime Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 83,
                "createdAt": "2023-04-25T13:21:23.650Z",
                "updatedAt": "2023-04-25T13:21:23.650Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=5DYZEft2m3M",
                "id": "5DYZEft2m3M",
                "title": "The Hilarious Death of Archduke Ferdinand",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 84,
                "createdAt": "2023-04-25T13:21:23.675Z",
                "updatedAt": "2023-04-25T13:21:23.675Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=zdBPgu2Ku24",
                "id": "zdBPgu2Ku24",
                "title": "The Conspiracy Theory Iceberg (part 7 3/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 85,
                "createdAt": "2023-04-25T13:21:23.676Z",
                "updatedAt": "2023-04-25T13:21:23.676Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=jzdC1zxXgpE",
                "id": "jzdC1zxXgpE",
                "title": "The Most Disturbing Cult of All Time: The Ant Hill Kids",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 86,
                "createdAt": "2023-04-25T13:21:23.681Z",
                "updatedAt": "2023-04-25T13:21:23.681Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ZLE7p7jb9pY",
                "id": "ZLE7p7jb9pY",
                "title": "The Religion & Cult Iceberg Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 87,
                "createdAt": "2023-04-25T13:21:23.682Z",
                "updatedAt": "2023-04-25T13:21:23.682Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=4e-A6oZ_4RM",
                "id": "4e-A6oZ_4RM",
                "title": "100k Q&A",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 88,
                "createdAt": "2023-04-25T13:21:23.687Z",
                "updatedAt": "2023-04-25T13:21:23.687Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=5Z46tZqV7G8",
                "id": "5Z46tZqV7G8",
                "title": "The Conspiracy Theory Iceberg Explained (part 7 2/3)",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 89,
                "createdAt": "2023-04-25T13:21:23.685Z",
                "updatedAt": "2023-04-25T13:21:23.685Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=W5En4vfsq18",
                "id": "W5En4vfsq18",
                "title": "No Country For Old Men Explained: The Rule of Fire",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 90,
                "createdAt": "2023-04-25T13:21:23.693Z",
                "updatedAt": "2023-04-25T13:21:23.693Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=ma8xM52jcgU",
                "id": "ma8xM52jcgU",
                "title": "Lost Tapes: The Show Made to Scare Kids",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 91,
                "createdAt": "2023-04-25T13:21:23.695Z",
                "updatedAt": "2023-04-25T13:21:23.695Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=JXB5fuXQuPQ",
                "id": "JXB5fuXQuPQ",
                "title": "The Conspiracy Theory Iceberg Explained (Part 7 1/3)",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 92,
                "createdAt": "2023-04-25T13:21:23.696Z",
                "updatedAt": "2023-04-25T13:21:23.696Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=_ZSPgiu4WIo",
                "id": "_ZSPgiu4WIo",
                "title": "The Disturbing Movie Iceberg Explained (GRAPHIC CONTENT)",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 93,
                "createdAt": "2023-04-25T13:21:23.698Z",
                "updatedAt": "2023-04-25T13:21:23.698Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=TGCkekDnEog",
                "id": "TGCkekDnEog",
                "title": "The Game that can Destroy the World: AI in a Box",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 94,
                "createdAt": "2023-04-25T13:21:23.701Z",
                "updatedAt": "2023-04-25T13:21:23.701Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=J5UwbkpIzjs",
                "id": "J5UwbkpIzjs",
                "title": "THE CONSPIRACY THEORY ICEBERG (Part 6 3/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 95,
                "createdAt": "2023-04-25T13:21:23.703Z",
                "updatedAt": "2023-04-25T13:21:23.703Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=sNLkYNUxy2U",
                "id": "sNLkYNUxy2U",
                "title": "Childhood Trauma Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 96,
                "createdAt": "2023-04-25T13:21:23.706Z",
                "updatedAt": "2023-04-25T13:21:23.706Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=8fLSGK8BLDE",
                "id": "8fLSGK8BLDE",
                "title": "Every SCP-001 Proposal Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 97,
                "createdAt": "2023-04-25T13:21:23.709Z",
                "updatedAt": "2023-04-25T13:21:23.709Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=2Nf-eJ08zO0",
                "id": "2Nf-eJ08zO0",
                "title": "THE CONSPIRACY THEORY ICEBERG (Part 6 2/3) Explained",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 98,
                "createdAt": "2023-04-25T13:21:23.713Z",
                "updatedAt": "2023-04-25T13:21:23.713Z"
            },
            {
                "url": "https://www.youtube.com/watch?v=-eBu96ET6-0",
                "id": "-eBu96ET6-0",
                "title": "The SCP Iceberg Explained (COGNITOHAZARD)",
                "downloaded": false,
                "available": true,
                "reference": "https://www.youtube.com/@Wendigoon/videos",
                "list_order": 99,
                "createdAt": "2023-04-25T13:21:23.716Z",
                "updatedAt": "2023-04-25T13:21:23.716Z"
            }
        ]
    };

    return (
        <Paper style={{ height: '100%', width: '50%' }}>
            <TableVirtuoso
                data={data['rows']}
                components={VirtuosoTableComponents}
                fixedHeaderContent={fixedHeaderContent}
                itemContent={rowContent}
            />
        </Paper>
    );
}

// https://codesandbox.io/s/magical-wave-ij21t5?file=/demo.tsx:3444-3466
// https://mui.com/material-ui/react-table/#virtualized-table