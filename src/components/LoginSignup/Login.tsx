import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import navigate hook
import "./Login.css";
import axios from "axios";

interface LoginProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate(); // Initialize navigate

  // WORKING BACKEND
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill out all fields");
      return;
    }

    const apiUrl = import.meta.env.VITE_LOGIN_API;
    if (!apiUrl) {
      alert("Login API URL is not defined.");
      return;
    }

    try {
      const response = await axios.post(apiUrl, {
        username: email,
        password: password,
      });

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        setIsLoggedIn(true);
        alert("Login successful!");
        navigate("/chat");
      } else {
        alert("Login failed! Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("An error occurred during login.");
    }
  };

  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   if (email && password) {
  //     setIsLoggedIn(true);
  //     alert('Login successful!');
  //     navigate('/chat'); // Redirect to chat page after login
  //   } else {
  //     alert('Please fill out all fields');
  //   }
  // };

  return (
    <div className="form-container1">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <button type="submit" className="btn-submit">
          Login
        </button>
      </form>

      <p>
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
};

export default Login;
