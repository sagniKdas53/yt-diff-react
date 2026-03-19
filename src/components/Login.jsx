import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

export default function Login({
    backEnd,
    setToken,
    setSnack,
    height,
    toggleSignUpComponent
}) {
    const [userName, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const [isSignUpEnabled, setIsSignUpEnabled] = useState(true);


    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleRemembered = () => {
        setRememberMe(!rememberMe);
    }

    const handleLogin = async () => {
        // Send login request to backend
        if (userName === "" || password === "") {
            setSnack("Username or password is empty", "error");
            return;
        }
        const response = await fetch(backEnd +
            "/login",
            {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                mode: "cors",
                body: JSON.stringify({
                    userName, password
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
                setSnack(`${data.message}`, "error");
            }
        } catch (error) {
            setSnack("Error in signing in", "error");
        }
    };

    const regEnableCheck = async () => {
        const response = await fetch(backEnd +
            "/isregallowed",
            {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                mode: "cors",
                body: JSON.stringify({
                    "sendStats": false
                }),
            }
        );

        // Handle response (e.g., store token)
        const data = await response.json();
        // Propagate it to the main app
        try {
            if (response.ok) {
                setIsSignUpEnabled(data.registrationAllowed);
            } else {
                setSnack(`${data.message}`, "error");
            }
        } catch (error) {
            setSnack("Error in checking signup availability", "error");
        }
    };

    // Check if signup is allowed on component mount, wonder if this should be memoized
    useEffect(() => {
        // Whenever the login component is shown, i.e. First time opening up the app
        // or switching back from signup to login, check if signup is allowed
        regEnableCheck();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
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
                    <TextField
                        sx={{ m: 0, width: "100%" }}
                        label="Username"
                        variant="outlined"
                        autoComplete="username"
                        value={userName}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                </Grid>
                <Grid xs={12}>
                    <TextField
                        sx={{ m: 0, width: "100%" }}
                        label="Password"
                        variant="outlined"
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        InputProps={{
                            endAdornment: (
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
                            ),
                        }} />
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
                    <Button fullWidth variant="contained" color="primary"
                        sx={{ float: "right" }} onClick={handleLogin}>
                        <Typography sx={{ m: 0, px: 0, pt: "3px", pb: 0, fontWeight: 600 }}>
                            Login
                        </Typography>
                    </Button>
                </Grid>
                {isSignUpEnabled && (
                    <Grid xs={12}>
                        <Button fullWidth variant="contained" color="primary"
                            sx={{ float: "right" }} onClick={() => toggleSignUpComponent(true)}>
                            <Typography sx={{ m: 0, px: 0, pt: "3px", pb: 0, fontWeight: 600 }}>
                                Sign Up
                            </Typography>
                        </Button>
                    </Grid>
                )}
            </Grid>
        </Grid>
    );
}

Login.propTypes = {
    backEnd: PropTypes.string.isRequired,
    setToken: PropTypes.func.isRequired,
    setSnack: PropTypes.func.isRequired,
    height: PropTypes.string.isRequired,
    toggleSignUpComponent: PropTypes.func.isRequired
};
