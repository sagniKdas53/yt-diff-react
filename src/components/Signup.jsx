// SignUpForm.js
import { useState } from "react";
import PropTypes from "prop-types";

const SignUpForm = ({
  backEnd,
  height
}) => {
  const [user_name, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    // Send sign up request to backend
    return await fetch(backEnd +
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
  };

  return (
    <div>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleSignUp}>Sign Up</button>
    </div>
  );
};

export default SignUpForm;

SignUpForm.propTypes = {
  backEnd: PropTypes.string.isRequired,
  setToken: PropTypes.func.isRequired,
  height: PropTypes.string.isRequired,
};

