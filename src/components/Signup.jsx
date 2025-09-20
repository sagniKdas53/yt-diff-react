import { useState } from "react";
import PropTypes from "prop-types";
import Grid from "@mui/material/Unstable_Grid2";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Typography from "@mui/material/Typography";

export default function Signup({
    backEnd,
    setSnack,
    height,
    setIsSigningUp
}) {

    const [userName, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleSignup = async () => {
        // Send signup request to backend
        if (userName === "" || password === "") {
            setSnack("Username or password is empty", "error");
            return;
        }
        const response = await fetch(backEnd +
            "/register",
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
                setSnack("Signed up successfully", "success");
                setIsSigningUp(false);
            } else {
                setSnack(`${data.message}`, "error");
            }
        } catch (error) {
            setSnack("Error in signing up", "error");
        }
    };


    return (
        <Grid container
            justifyContent="center" // Centers horizontally
            alignItems="center" // Centers vertically
            spacing={0} sx={{ my: 0, p: 0, height: height }}>
            <Grid container spacing={3} sx={{ m: 1 }}>
                <Grid xs={12} sx={{ alignItems: "center" }}>
                    <Typography component="h1" variant="h5">
                        Sign Up
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
                        autoComplete="new-password"
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
                    <Box sx={{ flexGrow: 1 }}></Box>
                    <Button fullWidth variant="contained" color="primary"
                        sx={{ float: "right" }} onClick={handleSignup}>
                        Sign Up
                    </Button>
                </Grid>
            </Grid>
        </Grid>
    );
}

Signup.propTypes = {
    backEnd: PropTypes.object.isRequired,
    setSnack: PropTypes.func.isRequired,
    height: PropTypes.string.isRequired,
    setIsSigningUp: PropTypes.func.isRequired
};