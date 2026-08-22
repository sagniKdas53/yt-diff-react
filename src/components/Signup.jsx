import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import PropTypes from "prop-types";
import { useContext, useState } from "react";
import { NotificationContext } from "../contexts/NotificationContext";
import { ApiError } from "../api/client.js";
import { useApiClient } from "../hooks/useApiClient.js";

export default function Signup({ height, toggleSignUpComponent }) {
  const { setSnack } = useContext(NotificationContext);
  const api = useApiClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSignup = async (event) => {
    if (event) {
      event.preventDefault();
    }
    // Send signup request to backend
    if (username === "" || password === "") {
      setSnack("Username or password is empty", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/register", { username, password });

      setSnack("Account successfully created.", "success");
      toggleSignUpComponent(false);
    } catch (error) {
      // A refusal carries the server's own message; anything else never
      // reached the server.
      setSnack(
        error instanceof ApiError ? error.message : "Signup failed.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid
      container
      justifyContent="center" // Centers horizontally
      alignItems="center" // Centers vertically
      spacing={0}
      sx={{ my: 0, p: 0, height: height }}
    >
      <form
        onSubmit={handleSignup}
        style={{ width: "100%", maxWidth: "360px" }}
      >
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
              id="signup-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={loading}
              inputProps={{
                spellCheck: false,
              }}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              sx={{ m: 0, width: "100%" }}
              label="Password"
              variant="outlined"
              autoComplete="new-password"
              id="signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid xs={12}>
            <Box sx={{ flexGrow: 1 }}></Box>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ float: "right", minHeight: "36.5px" }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <Typography variant="button">Sign Up</Typography>
              )}
            </Button>
          </Grid>
          <Grid xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ float: "right" }}
              onClick={() => toggleSignUpComponent(false)}
              disabled={loading}
            >
              <Typography variant="button">Login</Typography>
            </Button>
          </Grid>
        </Grid>
      </form>
    </Grid>
  );
}

Signup.propTypes = {
  height: PropTypes.string.isRequired,
  toggleSignUpComponent: PropTypes.func.isRequired,
};
