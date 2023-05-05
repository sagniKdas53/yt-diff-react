import { forwardRef, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { TableVirtuoso } from 'react-virtuoso';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import TableSortLabel from "@mui/material/TableSortLabel";
import Select from "@mui/material/Select";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";

const VirtuosoTableComponents = {
    // eslint-disable-next-line react/display-name
    Scroller: forwardRef((props, ref) => (
        <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
        <Table stickyHeader size="small" aria-label="play-list vidoes table" {...props} />
    ),
    TableHead,
    // eslint-disable-next-line react/prop-types, no-unused-vars
    TableRow: ({ item: _item, ...props }) => <TableRow hover role="checkbox" tabIndex={-1} {...props} />,
    // eslint-disable-next-line react/display-name
    TableBody: forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};

export default function ReactVirtualizedTable() {
    // eslint-disable-next-line no-unused-vars
    const [url, setUrl] = useState("");
    function fixedHeaderContent() {
        return (
            <TableRow>
                <TableCell
                    key="play-head-order"
                    align="justify"
                    /*padding: top | right and bottom | left */
                    style={{ paddingInlineEnd: "0px" }}
                >
                    <TableSortLabel
                    // active={1 === sort}
                    // direction={order === 1 ? "asc" : "desc"}
                    // onClick={() => createSortHandler(1)}
                    >
                        ID
                    </TableSortLabel>
                </TableCell>
                <TableCell
                    key="play-head-title"
                    align="left"
                    sx={{ width: "75%" }}
                    style={{ paddingInline: "0px", overflow: "hidden", textOverflow: "ellipsis" }}
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
                    key="play-head-watch"
                    align="center"
                    style={{ paddingInlineEnd: "0px" }}
                >
                    <TableSortLabel
                    // active={3 === sort}
                    // direction={order === 1 ? "asc" : "desc"}
                    // onClick={() => createSortHandler(3)}
                    >
                        Updated
                    </TableSortLabel>
                </TableCell>
                <TableCell
                    key="play-head-expand"
                    align="center"
                    style={{ paddingInline: "8px" }}
                >
                    Load
                </TableCell>
            </TableRow>
        );
    }

    function rowContent(_index, row) {
        return (
            <>
                <TableCell
                    key={row.order_added + "-order"}
                    align="justify"
                    style={{ paddingInlineEnd: "0px" }}
                >
                    {+row.order_added + 1}
                </TableCell>
                <TableCell
                    key={row.order_added + "-title"}
                    align="left"
                    sx={{ width: "75%" }}
                    style={{ paddingInline: "0px", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                    <Link
                        href={row.url}
                        color="inherit"
                        underline="hover"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {row.title}
                    </Link>
                </TableCell>
                <TableCell
                    key={row.order_added + "-watch"}
                    align="right"
                    style={{ paddingInlineEnd: "0px", paddingTop: "0px" }}
                >
                    <FormControl
                        variant="standard"
                        sx={{ m: 0, minWidth: 80, minHeight: 45 }}
                        size="small"
                    >
                        <InputLabel id={row.order_added + "-label"}>
                            {/* {lastUpdateCalc(row.updatedAt)} */}
                            Will be added later
                        </InputLabel>
                        <Select
                            labelId={row.order_added + "-label"}
                            id={row.order_added + "-select"}
                            value={row.watch}
                            label="Watch"
                        // onChange={(e) => changeWatch(e, row.url)}
                        >
                            <MenuItem value={"1"}>NA</MenuItem>
                            <MenuItem value={"2"}>Full</MenuItem>
                            <MenuItem value={"3"}>Fast</MenuItem>
                        </Select>
                    </FormControl>
                </TableCell>
                <TableCell
                    key={row.order_added + "-button"}
                    align="center"
                    style={{ paddingInline: "8px" }}
                >
                    <Button
                        size="small"
                        variant="contained"
                        color={url === row.url ? "success" : "secondary"}
                    // onClick={() => handleLoad(row.url)}
                    >
                        {url === row.url ? "DONE" : "LIST"}
                    </Button>
                </TableCell>
            </>
        );
    }

    const data = {
        "count": 75,
        "rows": [
            {
                "title": "Rimworld: Catharsis",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOFvXJ-H0AiscPQGxk3Ceucf",
                "order_added": 0,
                "watch": 2,
                "save_dir": "Rimworld: Catharsis",
                "createdAt": "2023-04-25T05:38:00.344Z",
                "updatedAt": "2023-05-04T18:30:26.058Z"
            },
            {
                "title": "【Merurin's Express Mail】",
                "url": "https://www.youtube.com/playlist?list=PL-7GrDKcrUlOIxWhbaG7rksRBrkyAxGtl",
                "order_added": 1,
                "watch": 1,
                "save_dir": "[Merurin's Express Mail】",
                "createdAt": "2023-04-25T05:38:32.989Z",
                "updatedAt": "2023-04-25T05:38:32.989Z"
            },
            {
                "title": "Sexy Sect Babes",
                "url": "https://www.youtube.com/playlist?list=PL4j9sdcFKwqnw_yeKEEHpfVZYuS7YuZQ9",
                "order_added": 2,
                "watch": 3,
                "save_dir": "Sexy Sect Babes",
                "createdAt": "2023-04-25T13:20:55.737Z",
                "updatedAt": "2023-05-04T18:30:14.851Z"
            },
            {
                "title": "Humans Don't Make Good Familiars",
                "url": "https://www.youtube.com/playlist?list=PL4j9sdcFKwqmKCOSfVShs16sofOdJirWX",
                "order_added": 3,
                "watch": 1,
                "save_dir": "Humans Don't Make Good Familiars",
                "createdAt": "2023-04-25T13:21:03.146Z",
                "updatedAt": "2023-04-25T13:21:03.146Z"
            },
            {
                "title": "A Job For A Deathworlder by u/Lanzen_Jars",
                "url": "https://www.youtube.com/playlist?list=PL4j9sdcFKwqmqZHilHBjn_GkkEkvVLmKC",
                "order_added": 4,
                "watch": 1,
                "save_dir": "A Job For A Deathworlder by u/Lanzen_Jars",
                "createdAt": "2023-04-25T13:21:09.693Z",
                "updatedAt": "2023-04-25T13:21:09.693Z"
            },
            {
                "title": "Wendigoon - Videos",
                "url": "https://www.youtube.com/@Wendigoon/videos",
                "order_added": 5,
                "watch": 1,
                "save_dir": "Wendigoon - Videos",
                "createdAt": "2023-04-25T13:21:16.593Z",
                "updatedAt": "2023-04-25T13:21:16.593Z"
            },
            {
                "title": "Trash Taste - Videos",
                "url": "https://www.youtube.com/@TrashTaste/videos",
                "order_added": 6,
                "watch": 1,
                "save_dir": "Trash Taste - Videos",
                "createdAt": "2023-04-25T13:21:24.418Z",
                "updatedAt": "2023-04-25T13:21:24.418Z"
            },
            {
                "title": "Junferno - Videos",
                "url": "https://www.youtube.com/@Junferno/videos",
                "order_added": 7,
                "watch": 1,
                "save_dir": "Junferno - Videos",
                "createdAt": "2023-04-25T13:21:31.121Z",
                "updatedAt": "2023-04-25T13:21:31.121Z"
            },
            {
                "title": "The Code Report",
                "url": "https://www.youtube.com/playlist?list=PL0vfts4VzfNjnYhJMfTulea5McZbQLM7G",
                "order_added": 8,
                "watch": 1,
                "save_dir": "The Code Report",
                "createdAt": "2023-04-25T13:21:42.322Z",
                "updatedAt": "2023-04-26T06:30:08.259Z"
            },
            {
                "title": "Sansad Watch",
                "url": "https://www.youtube.com/playlist?list=PLpHbno9djTOSBzPSjHE8q7QQWIHUsu-ef",
                "order_added": 9,
                "watch": 1,
                "save_dir": "Sansad Watch",
                "createdAt": "2023-04-25T13:21:48.180Z",
                "updatedAt": "2023-04-25T13:21:48.180Z"
            },
            {
                "title": "Nightmare Raid",
                "url": "https://www.youtube.com/playlist?list=PLR4r1sF-m8S3n-Q0oZGtLiIEWRtCkpLK8",
                "order_added": 10,
                "watch": 1,
                "save_dir": "Nightmare Raid",
                "createdAt": "2023-04-25T13:21:53.960Z",
                "updatedAt": "2023-04-25T13:21:53.960Z"
            },
            {
                "title": "Neuro-sama - Videos",
                "url": "https://www.youtube.com/@Neurosama/videos",
                "order_added": 11,
                "watch": 1,
                "save_dir": "Neuro-sama - Videos",
                "createdAt": "2023-04-25T13:21:58.317Z",
                "updatedAt": "2023-04-29T18:30:22.758Z"
            },
            {
                "title": "TV Newsance",
                "url": "https://www.youtube.com/playlist?list=PLpHbno9djTOSaBHKTrtbsKkn6MDUujQxX",
                "order_added": 12,
                "watch": 1,
                "save_dir": "TV Newsance",
                "createdAt": "2023-04-25T13:22:05.741Z",
                "updatedAt": "2023-04-25T13:22:05.741Z"
            },
            {
                "title": "Triple-Q - Videos",
                "url": "https://www.youtube.com/@Triple-Q/videos",
                "order_added": 13,
                "watch": 1,
                "save_dir": "Triple-Q - Videos",
                "createdAt": "2023-04-25T13:22:10.749Z",
                "updatedAt": "2023-04-25T13:22:10.749Z"
            },
            {
                "title": "Pan Piano - Videos",
                "url": "https://www.youtube.com/@panpianoatelier/videos",
                "order_added": 14,
                "watch": 1,
                "save_dir": "Pan Piano - Videos",
                "createdAt": "2023-04-25T13:22:16.505Z",
                "updatedAt": "2023-04-25T13:22:16.505Z"
            },
            {
                "title": "WARHAMMER 40,000 - LORE / HISTORY [ In Order ]",
                "url": "https://www.youtube.com/playlist?list=PLl6BRvEJ-auZ5aYPHj1B3pKJ_pLjg9qNU",
                "order_added": 15,
                "watch": 1,
                "save_dir": "WARHAMMER 40,000 - LORE / HISTORY [ In Order ]",
                "createdAt": "2023-04-25T13:22:26.604Z",
                "updatedAt": "2023-04-25T13:22:26.604Z"
            },
            {
                "title": "MULTI-EPI 40K LORE SERIES",
                "url": "https://www.youtube.com/playlist?list=PLl6BRvEJ-auYXCE5qUv6BmNNha71igoNj",
                "order_added": 16,
                "watch": 1,
                "save_dir": "MULTI-EPI 40K LORE SERIES",
                "createdAt": "2023-04-25T13:22:32.282Z",
                "updatedAt": "2023-04-25T13:22:32.282Z"
            },
            {
                "title": "Hibiki's Dad 響爹 Ch. - Videos",
                "url": "https://www.youtube.com/@Hibiki_dad/videos",
                "order_added": 17,
                "watch": 1,
                "save_dir": "Hibiki's Dad 響爹 Ch. - Videos",
                "createdAt": "2023-04-25T13:22:38.348Z",
                "updatedAt": "2023-04-25T13:22:38.348Z"
            },
            {
                "title": "The Nature of Predators",
                "url": "https://www.youtube.com/playlist?list=PLcfzFNUhrNS0NFLZg4bQv40qcZHvAzGvB",
                "order_added": 18,
                "watch": 1,
                "save_dir": "The Nature of Predators",
                "createdAt": "2023-04-25T13:22:47.287Z",
                "updatedAt": "2023-04-25T13:22:47.287Z"
            },
            {
                "title": "Onsen Girls Channel - Videos",
                "url": "https://www.youtube.com/@onsengirls_ch/videos",
                "order_added": 19,
                "watch": 1,
                "save_dir": "Onsen Girls Channel - Videos",
                "createdAt": "2023-04-25T13:22:54.611Z",
                "updatedAt": "2023-04-25T13:22:54.611Z"
            },
            {
                "title": "温泉女子会公式 - Videos",
                "url": "https://www.youtube.com/@onsen_girls/videos",
                "order_added": 20,
                "watch": 1,
                "save_dir": "温泉女子会公式 - Videos",
                "createdAt": "2023-04-25T13:23:03.724Z",
                "updatedAt": "2023-04-25T13:23:03.724Z"
            },
            {
                "title": "温泉チャンネルQ - Videos",
                "url": "https://www.youtube.com/@user-zk3ef2xv9z/videos",
                "order_added": 21,
                "watch": 1,
                "save_dir": "温泉チャンネルQ - Videos",
                "createdAt": "2023-04-25T13:23:11.004Z",
                "updatedAt": "2023-04-25T13:23:11.004Z"
            },
            {
                "title": "あんちゃんのお部屋 - Videos",
                "url": "https://www.youtube.com/@user-xz7dx2yx2m/videos",
                "order_added": 22,
                "watch": 1,
                "save_dir": "あんちゃんのお部屋 - Videos",
                "createdAt": "2023-04-25T13:23:20.067Z",
                "updatedAt": "2023-04-25T13:23:20.067Z"
            },
            {
                "title": "ちゃづり - Videos",
                "url": "https://www.youtube.com/@user-rb6sl7yj3n/videos",
                "order_added": 23,
                "watch": 1,
                "save_dir": "ちゃづり - Videos",
                "createdAt": "2023-04-25T13:23:28.804Z",
                "updatedAt": "2023-04-25T13:23:28.804Z"
            },
            {
                "title": "温泉女子ろこ - Videos",
                "url": "https://www.youtube.com/@marochan_onsen/videos",
                "order_added": 24,
                "watch": 1,
                "save_dir": "温泉女子ろこ - Videos",
                "createdAt": "2023-04-25T13:23:34.988Z",
                "updatedAt": "2023-04-25T13:23:34.988Z"
            },
            {
                "title": "KOTENO - Videos",
                "url": "https://www.youtube.com/@koteno/videos",
                "order_added": 25,
                "watch": 1,
                "save_dir": "KOTENO - Videos",
                "createdAt": "2023-04-25T13:23:41.143Z",
                "updatedAt": "2023-04-25T13:23:41.143Z"
            },
            {
                "title": "田中みかと温泉 - Videos",
                "url": "https://www.youtube.com/@mikachanonsen/videos",
                "order_added": 26,
                "watch": 1,
                "save_dir": "田中みかと温泉 - Videos",
                "createdAt": "2023-04-25T13:23:47.775Z",
                "updatedAt": "2023-04-25T13:23:47.775Z"
            },
            {
                "title": "混浴カップルany&fuu - Videos",
                "url": "https://www.youtube.com/@anyfuu/videos/videos",
                "order_added": 27,
                "watch": 1,
                "save_dir": "混浴カップルany&fuu - Videos",
                "createdAt": "2023-04-25T13:24:00.272Z",
                "updatedAt": "2023-04-25T13:24:00.272Z"
            },
            {
                "title": "温泉女子りり - Videos",
                "url": "https://www.youtube.com/@user-wm4yg3it6y/videos",
                "order_added": 28,
                "watch": 1,
                "save_dir": "温泉女子りり - Videos",
                "createdAt": "2023-04-25T13:24:11.735Z",
                "updatedAt": "2023-04-25T13:24:11.735Z"
            },
            {
                "title": "My Next Life as a VILLAINESS: ALL ROUTES LEAD TO DOOM! X [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl0e6fhvpxjXXSVUCRXak4D-",
                "order_added": 29,
                "watch": 1,
                "save_dir": "My Next Life as a VILLAINESS: ALL ROUTES LEAD TO DOOM! X [English Sub]",
                "createdAt": "2023-04-26T16:23:44.834Z",
                "updatedAt": "2023-05-04T18:30:32.691Z"
            },
            {
                "title": "Galactic High",
                "url": "https://www.youtube.com/playlist?list=PL4j9sdcFKwqkNj4WRREQ9sEB9AYmzQBdH",
                "order_added": 30,
                "watch": 3,
                "save_dir": "Galactic High",
                "createdAt": "2023-04-26T17:34:04.560Z",
                "updatedAt": "2023-05-04T18:30:23.926Z"
            },
            {
                "title": "hentai-tv",
                "url": "https://www.pornhub.com/model/hentai-tv/videos",
                "order_added": 31,
                "watch": 1,
                "save_dir": "hentai-tv",
                "createdAt": "2023-04-26T18:15:44.896Z",
                "updatedAt": "2023-04-26T18:15:44.896Z"
            },
            {
                "title": "I Got a CHEAT SKILL in ANOTHER WORLD and Became UNRIVALED in the REAL WORLD, Too [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl3NIzWVo6NiXcorugfvyvVg",
                "order_added": 32,
                "watch": 1,
                "save_dir": "I Got a CHEAT SKILL in ANOTHER WORLD and Became UNRIVALED in the REAL WORLD, Too [English Sub]",
                "createdAt": "2023-04-27T04:43:04.928Z",
                "updatedAt": "2023-04-27T04:43:04.928Z"
            },
            {
                "title": "Welcome To Demon School! Iruma-kun Season 3 [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl3qq9KSn9zKK_DpaXxSxiKA",
                "order_added": 33,
                "watch": 1,
                "save_dir": "Welcome To Demon School! Iruma-kun Season 3 [English Sub]",
                "createdAt": "2023-04-27T04:47:42.321Z",
                "updatedAt": "2023-04-27T04:47:42.321Z"
            },
            {
                "title": "(S2) BOFURI: I Don't Want to Get Hurt, so I'll Max Out My Defense. Season 2 [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl0Kfd0S0D1PELpHYRUz-Owo",
                "order_added": 34,
                "watch": 1,
                "save_dir": "(S2) BOFURI: I Don't Want to Get Hurt, so I'll Max Out My Defense. Season 2 [English Sub]",
                "createdAt": "2023-04-27T04:51:41.971Z",
                "updatedAt": "2023-04-27T04:51:41.971Z"
            },
            {
                "title": "《異世界魔王與召喚少女的奴隸魔術Ω》|《How NOT to Summon a Demon Lord Ω》【Ani-One ULTRA】",
                "url": "https://www.youtube.com/playlist?list=PLxSscENEp7Jhq3b0mH_rLalCw8ttjbHnP",
                "order_added": 35,
                "watch": 1,
                "save_dir": "《異世界魔王與召喚少女的奴隸魔術Ω》|《How NOT to Summon a Demon Lord Ω》【Ani-One ULTRA】",
                "createdAt": "2023-04-27T05:05:04.751Z",
                "updatedAt": "2023-04-27T05:05:04.751Z"
            },
            {
                "title": "Animenz Popular Anime Songs sheet music book vol.1 & vol.2",
                "url": "https://www.youtube.com/playlist?list=PL3_NLXp9puXUXEpCuln7Rwdy5lO0QzViT",
                "order_added": 36,
                "watch": 1,
                "save_dir": "Animenz Popular Anime Songs sheet music book vol.1 & vol.2",
                "createdAt": "2023-04-27T05:58:07.457Z",
                "updatedAt": "2023-04-27T05:58:07.457Z"
            },
            {
                "title": "Uto Ch. 天使うと - Videos",
                "url": "https://www.youtube.com/@utoch.6000/videos",
                "order_added": 37,
                "watch": 1,
                "save_dir": "Uto Ch. 天使うと - Videos",
                "createdAt": "2023-04-29T18:38:45.047Z",
                "updatedAt": "2023-04-29T18:38:45.047Z"
            },
            {
                "title": "在异世界获得超强能力的我，在现实世界照样无敌 [中字]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl3jxgfDVYQilfd1jRMW8B-Q",
                "order_added": 38,
                "watch": 1,
                "save_dir": "在异世界获得超强能力的我，在现实世界照样无敌 [中字]",
                "createdAt": "2023-05-01T06:52:05.010Z",
                "updatedAt": "2023-05-01T06:52:05.010Z"
            },
            {
                "title": "ano-ano-chan",
                "url": "https://www.pornhub.com/model/ano-ano-chan/videos",
                "order_added": 39,
                "watch": 1,
                "save_dir": "ano-ano-chan",
                "createdAt": "2023-05-01T08:12:37.991Z",
                "updatedAt": "2023-05-01T08:12:37.991Z"
            },
            {
                "title": "namasa_mi",
                "url": "https://www.pornhub.com/model/namasa_mi/videos",
                "order_added": 40,
                "watch": 1,
                "save_dir": "namasa_mi",
                "createdAt": "2023-05-01T08:14:08.591Z",
                "updatedAt": "2023-05-01T08:14:08.591Z"
            },
            {
                "title": "kawaii-peach",
                "url": "https://www.pornhub.com/model/kawaii-peach/videos",
                "order_added": 41,
                "watch": 1,
                "save_dir": "kawaii-peach",
                "createdAt": "2023-05-01T09:01:46.506Z",
                "updatedAt": "2023-05-01T09:01:46.506Z"
            },
            {
                "title": "Rokudo's Bad Girls [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl1ko2ZtycDHdgIovdrzT1QX",
                "order_added": 42,
                "watch": 1,
                "save_dir": "Rokudo's Bad Girls [English Sub]",
                "createdAt": "2023-05-02T05:41:29.485Z",
                "updatedAt": "2023-05-02T05:41:29.485Z"
            },
            {
                "title": "Rimworld: Android Utopia",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOF1D7aUHi4IHhtis2ezPmVd",
                "order_added": 43,
                "watch": 1,
                "save_dir": "Rimworld: Android Utopia",
                "createdAt": "2023-05-02T05:52:03.670Z",
                "updatedAt": "2023-05-02T05:52:03.670Z"
            },
            {
                "title": "Rimworld: The Hive",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOH1ebNLeyqD9Avviliymkkz",
                "order_added": 44,
                "watch": 1,
                "save_dir": "Rimworld: The Hive",
                "createdAt": "2023-05-02T05:52:10.764Z",
                "updatedAt": "2023-05-02T05:52:10.764Z"
            },
            {
                "title": "Rimworld: RPG Adventures",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOHznnLAMzwpy-pO0pR7Wr6r",
                "order_added": 45,
                "watch": 1,
                "save_dir": "Rimworld: RPG Adventures",
                "createdAt": "2023-05-02T05:52:21.465Z",
                "updatedAt": "2023-05-02T05:52:21.465Z"
            },
            {
                "title": "Rimworld: Blood Feast",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOH0YRAF3FiRJPp36agrQtaS",
                "order_added": 46,
                "watch": 1,
                "save_dir": "Rimworld: Blood Feast",
                "createdAt": "2023-05-02T05:53:09.624Z",
                "updatedAt": "2023-05-02T05:53:09.624Z"
            },
            {
                "title": "HERMITCRAFT 9",
                "url": "https://www.youtube.com/playlist?list=PLFm1tTY1NA4ebglc7QWni3Vx6Zzdx0PQu",
                "order_added": 47,
                "watch": 1,
                "save_dir": "HERMITCRAFT 9",
                "createdAt": "2023-05-02T05:54:25.274Z",
                "updatedAt": "2023-05-02T05:54:25.274Z"
            },
            {
                "title": "NetworkChuck - Videos",
                "url": "https://www.youtube.com/@NetworkChuck/videos",
                "order_added": 48,
                "watch": 1,
                "save_dir": "NetworkChuck - Videos",
                "createdAt": "2023-05-02T06:23:25.419Z",
                "updatedAt": "2023-05-02T06:23:25.419Z"
            },
            {
                "title": "Rin Penrose Ch. idol-EN - Videos",
                "url": "https://www.youtube.com/@rinpenrose/videos",
                "order_added": 49,
                "watch": 1,
                "save_dir": "Rin Penrose Ch. idol-EN - Videos",
                "createdAt": "2023-05-02T06:25:42.503Z",
                "updatedAt": "2023-05-02T06:25:42.503Z"
            },
            {
                "title": "Christian Lempa - Videos",
                "url": "https://www.youtube.com/@christianlempa/videos",
                "order_added": 50,
                "watch": 1,
                "save_dir": "Christian Lempa - Videos",
                "createdAt": "2023-05-02T15:44:55.824Z",
                "updatedAt": "2023-05-02T15:44:55.824Z"
            },
            {
                "title": "Garnt - Videos",
                "url": "https://www.youtube.com/@GarntM/videos",
                "order_added": 51,
                "watch": 1,
                "save_dir": "Garnt - Videos",
                "createdAt": "2023-05-02T20:19:19.342Z",
                "updatedAt": "2023-05-02T20:19:19.342Z"
            },
            {
                "title": "Dagger Sicar Hall of Trials Fights",
                "url": "https://www.youtube.com/playlist?list=PLR4r1sF-m8S0WOKFuWRVnW6mhkSk1ttFU",
                "order_added": 52,
                "watch": 1,
                "save_dir": "Dagger Sicar Hall of Trials Fights",
                "createdAt": "2023-05-02T21:26:07.190Z",
                "updatedAt": "2023-05-04T18:30:41.039Z"
            },
            {
                "title": "Kurzgesagt – In a Nutshell - Videos",
                "url": "https://www.youtube.com/@kurzgesagt/videos",
                "order_added": 53,
                "watch": 1,
                "save_dir": "Kurzgesagt – In a Nutshell - Videos",
                "createdAt": "2023-05-02T21:30:09.508Z",
                "updatedAt": "2023-05-02T21:30:09.508Z"
            },
            {
                "title": "Yii - Videos",
                "url": "https://www.youtube.com/@HiImYii/videos",
                "order_added": 54,
                "watch": 1,
                "save_dir": "Yii - Videos",
                "createdAt": "2023-05-02T21:33:51.203Z",
                "updatedAt": "2023-05-02T21:33:51.203Z"
            },
            {
                "title": "Web Dev Simplified - Videos",
                "url": "https://www.youtube.com/@WebDevSimplified/videos",
                "order_added": 55,
                "watch": 1,
                "save_dir": "Web Dev Simplified - Videos",
                "createdAt": "2023-05-03T06:08:33.839Z",
                "updatedAt": "2023-05-03T06:08:33.839Z"
            },
            {
                "title": "HELLUVA BOSS",
                "url": "https://www.youtube.com/playlist?list=PL-uopgYBi65HwiiDR9Y23lomAkGr9mm-S",
                "order_added": 56,
                "watch": 1,
                "save_dir": "HELLUVA BOSS",
                "createdAt": "2023-05-03T07:49:59.397Z",
                "updatedAt": "2023-05-03T07:49:59.397Z"
            },
            {
                "title": "Sequelize Tutorial Series",
                "url": "https://www.youtube.com/playlist?list=PLkqiWyX-_Lov8qmMOVn4SEQwr9yOjNn3f",
                "order_added": 57,
                "watch": 1,
                "save_dir": "Sequelize Tutorial Series",
                "createdAt": "2023-05-03T07:50:16.548Z",
                "updatedAt": "2023-05-03T07:50:16.548Z"
            },
            {
                "title": "Hunt Teams (1-Shots & Auto Teams)",
                "url": "https://www.youtube.com/playlist?list=PLR4r1sF-m8S2yOdzCDDCcNP_5oUmA21D1",
                "order_added": 58,
                "watch": 1,
                "save_dir": "Hunt Teams (1-Shots & Auto Teams)",
                "createdAt": "2023-05-03T07:53:44.546Z",
                "updatedAt": "2023-05-03T07:53:44.546Z"
            },
            {
                "title": "Users , Groups And Permissions",
                "url": "https://www.youtube.com/playlist?list=PLI-knp71HL3U4FMjzwBSddS2s_Fvo7deN",
                "order_added": 59,
                "watch": 1,
                "save_dir": "Users , Groups And Permissions",
                "createdAt": "2023-05-03T07:53:51.120Z",
                "updatedAt": "2023-05-03T07:53:51.120Z"
            },
            {
                "title": "Wandering Witch: The Journey of Elaina [English Sub]",
                "url": "https://www.youtube.com/playlist?list=PLwLSw1_eDZl0t53wDaw_s7IFG7cNLp_BL",
                "order_added": 60,
                "watch": 1,
                "save_dir": "Wandering Witch: The Journey of Elaina [English Sub]",
                "createdAt": "2023-05-03T07:53:59.022Z",
                "updatedAt": "2023-05-03T07:53:59.022Z"
            },
            {
                "title": "Linux",
                "url": "https://www.youtube.com/playlist?list=PLHE8wkAai4cpXWVhQw4vU0GOQ98NUzrnC",
                "order_added": 61,
                "watch": 1,
                "save_dir": "Linux",
                "createdAt": "2023-05-03T07:54:05.824Z",
                "updatedAt": "2023-05-03T07:54:05.824Z"
            },
            {
                "title": "Nikon School D-SLR Tutorials (In English)",
                "url": "https://www.youtube.com/playlist?list=PL0fUB1qCDbgf-HUmP9FmpYv0y0-UYBZxj",
                "order_added": 62,
                "watch": 1,
                "save_dir": "Nikon School D-SLR Tutorials (In English)",
                "createdAt": "2023-05-03T07:54:12.473Z",
                "updatedAt": "2023-05-03T07:54:12.473Z"
            },
            {
                "title": "Trigonometry",
                "url": "https://www.youtube.com/playlist?list=PLD6DA74C1DBF770E7",
                "order_added": 63,
                "watch": 1,
                "save_dir": "Trigonometry",
                "createdAt": "2023-05-03T07:54:19.195Z",
                "updatedAt": "2023-05-03T07:54:19.195Z"
            },
            {
                "title": "Fate/Extra CCC [English Subs]",
                "url": "https://www.youtube.com/playlist?list=PLtzekLVKG1PDSNm1M5npANBcvEPfDiaIZ",
                "order_added": 64,
                "watch": 1,
                "save_dir": "Fate/Extra CCC [English Subs]",
                "createdAt": "2023-05-03T08:03:06.628Z",
                "updatedAt": "2023-05-03T08:03:06.628Z"
            },
            {
                "title": "Fate/Extra CCC True Route [English Subs]",
                "url": "https://www.youtube.com/playlist?list=PLtzekLVKG1PDfZWoIMvdxxE8DbqJsduuZ",
                "order_added": 65,
                "watch": 1,
                "save_dir": "Fate/Extra CCC True Route [English Subs]",
                "createdAt": "2023-05-03T08:03:11.992Z",
                "updatedAt": "2023-05-03T08:03:11.992Z"
            },
            {
                "title": "Fate/Grand Order Voiced Valentine's Scenes",
                "url": "https://www.youtube.com/playlist?list=PLtzekLVKG1PCUdHMgRsHgntvt_VAfJwA7",
                "order_added": 66,
                "watch": 1,
                "save_dir": "Fate/Grand Order Voiced Valentine's Scenes",
                "createdAt": "2023-05-03T08:03:19.149Z",
                "updatedAt": "2023-05-03T08:03:19.149Z"
            },
            {
                "title": "Arknights - Supplies Levels",
                "url": "https://www.youtube.com/playlist?list=PLNgrku2z_iBlzKLmFg0R2BwRZUh1Cyrzt",
                "order_added": 67,
                "watch": 1,
                "save_dir": "Arknights - Supplies Levels",
                "createdAt": "2023-05-03T08:03:25.538Z",
                "updatedAt": "2023-05-03T08:03:25.538Z"
            },
            {
                "title": "Epic Seven Hunt Guide",
                "url": "https://www.youtube.com/playlist?list=PLOO4NsmB3T4eli11PYPyaGYGV0JLveI18",
                "order_added": 68,
                "watch": 1,
                "save_dir": "Epic Seven Hunt Guide",
                "createdAt": "2023-05-03T08:03:41.774Z",
                "updatedAt": "2023-05-03T08:03:41.774Z"
            },
            {
                "title": "Bangers",
                "url": "https://www.youtube.com/playlist?list=PL4Oo6H2hGqj22U9EzJEdlIwNbsUAikFN9",
                "order_added": 69,
                "watch": 1,
                "save_dir": "Bangers",
                "createdAt": "2023-05-03T08:03:49.957Z",
                "updatedAt": "2023-05-03T08:03:49.957Z"
            },
            {
                "title": "React JS Tutorial in Hindi 2022",
                "url": "https://www.youtube.com/playlist?list=PLwGdqUZWnOp3aROg4wypcRhZqJG3ajZWJ",
                "order_added": 70,
                "watch": 1,
                "save_dir": "React JS Tutorial in Hindi 2022",
                "createdAt": "2023-05-03T08:03:58.010Z",
                "updatedAt": "2023-05-03T08:03:58.010Z"
            },
            {
                "title": "Rimworld: Dryad Queen",
                "url": "https://www.youtube.com/playlist?list=PLNWGkqCSwkOHNNHqJ7ywQ1vCU9UGJzP0m",
                "order_added": 71,
                "watch": 1,
                "save_dir": "Rimworld: Dryad Queen",
                "createdAt": "2023-05-03T11:16:28.243Z",
                "updatedAt": "2023-05-03T11:16:28.243Z"
            },
            {
                "title": "【我推的孩子】|【Oshi No Ko】(Ani-One Asia ULTRA)",
                "url": "https://www.youtube.com/watch?v=mKtDH647vbo&list=PLxSscENEp7Jhas5i3D5PMB2HNS6Z6HJF2",
                "order_added": 72,
                "watch": 1,
                "save_dir": "【我推的孩子】|【Oshi No Ko】(Ani-One Asia ULTRA)",
                "createdAt": "2023-05-03T11:19:24.628Z",
                "updatedAt": "2023-05-03T11:19:24.628Z"
            },
            {
                "title": "SsethTzeentach - Videos",
                "url": "https://www.youtube.com/@SsethTzeentach/videos",
                "order_added": 73,
                "watch": 1,
                "save_dir": "SsethTzeentach - Videos",
                "createdAt": "2023-05-03T11:19:29.513Z",
                "updatedAt": "2023-05-03T11:19:29.513Z"
            },
            {
                "title": "Max0r - Videos",
                "url": "https://www.youtube.com/@Max0r/videos",
                "order_added": 74,
                "watch": 1,
                "save_dir": "Max0r - Videos",
                "createdAt": "2023-05-03T11:19:36.596Z",
                "updatedAt": "2023-05-03T11:19:36.596Z"
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