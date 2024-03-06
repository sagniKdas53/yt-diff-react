import { useState } from "react";
import PropTypes from "prop-types";
import Grid from "@mui/material/Unstable_Grid2";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";

export default function Login({
    backEnd,
    setToken,
    height
}) {
    const [user_name, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        // Send login request to backend
        const response = await fetch(backEnd +
            "/ytdiff/login",
            {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                mode: "cors",
                body: JSON.stringify({
                    user_name, password
                }),
            }
        );

        // Handle response (e.g., store token)
        const data = await response.json();
        // Propagate it to the main app
        setToken(data.token);
        // Store token in localStorage or sessionStorage
        localStorage.setItem("ytdiff_token", data.token);
    };

    return (
        <Paper sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
            <Grid container
                justifyContent="center" // Centers horizontally
                alignItems="center" // Centers vertically
                spacing={0} sx={{ my: 0, p: 0, height: height }}>
                <Grid container spacing={3} sx={{ m: 1 }}>
                    <Grid xs={12}>
                        <TextField
                            fullWidth
                            label="Username"
                            placeholder="Username"
                            value={user_name}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </Grid>
                    <Grid xs={12}>
                        <TextField
                            fullWidth
                            label="Password"
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Grid>
                    <Grid xs={12}>
                        <Box sx={{ flexGrow: 1 }}></Box>
                        <Button variant="contained" color="primary" sx={{ float: "right" }} onClick={handleLogin}>
                            Login
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Paper>
    );
}

Login.propTypes = {
    backEnd: PropTypes.string.isRequired,
    setToken: PropTypes.func.isRequired,
    height: PropTypes.string.isRequired,
};
