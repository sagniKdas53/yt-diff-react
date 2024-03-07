import { useState } from "react";
import PropTypes from "prop-types";
import Grid from "@mui/material/Unstable_Grid2";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

export default function Login({
    backEnd,
    setToken,
    setSnack,
    height
}) {
    const [user_name, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleRemembered = () => {
        setRememberMe(!rememberMe);
    }

    const handleLogin = async () => {
        // Send login request to backend
        if (user_name === "" || password === "") {
            setSnack("Username or password is empty", "error");
            return;
        }
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
        try {
            if (response.ok) {
                setToken(data.token);
                // Store token in localStorage or sessionStorage
                if (rememberMe) {
                    localStorage.setItem("ytdiff_token", data.token);
                }
            } else {
                setSnack(`${data.Outcome}`, "error");
            }
        } catch (error) {
            setSnack("Error in signing in", "error");
        }
    };

    return (
        <Paper elevation={4} sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
            <Grid container
                justifyContent="center" // Centers horizontally
                alignItems="center" // Centers vertically
                spacing={0} sx={{ my: 0, p: 0, height: height }}>
                <Grid container spacing={3} sx={{ m: 1 }}>
                    <Grid xs={12} sx={{ alignItems: "center" }}>
                        <Typography component="h1" variant="h5">
                            Sign in
                        </Typography>
                    </Grid>
                    <Grid xs={12}>
                        <FormControl sx={{ m: 0, width: "100%" }} variant="outlined">
                            <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
                            <OutlinedInput
                                autoComplete="username"
                                required={true}
                                fullWidth
                                id="outlined-username"
                                type="text"
                                label="Username"
                                value={user_name}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                            />
                        </FormControl>
                    </Grid>
                    <Grid xs={12}>
                        <FormControl sx={{ m: 0, width: "100%" }} variant="outlined">
                            <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
                            <OutlinedInput
                                autoComplete="current-password"
                                required={true}
                                fullWidth
                                id="outlined-adornment-password"
                                type={showPassword ? "text" : "password"}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={handleClickShowPassword}
                                            onMouseDown={handleMouseDownPassword}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                }
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                        </FormControl>
                    </Grid>
                    <Grid xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox value="remember"
                                    checked={rememberMe}
                                    onChange={handleRemembered}
                                    color="primary" />
                            }
                            label="Remember me"
                        /></Grid>
                    <Grid xs={12}>
                        <Box sx={{ flexGrow: 1 }}></Box>
                        <Button fullWidth variant="contained" color="primary"
                            sx={{ float: "right" }} onClick={handleLogin}>
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
    setSnack: PropTypes.func.isRequired,
    height: PropTypes.string.isRequired,
};
