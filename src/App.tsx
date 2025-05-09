import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import SignUp from "./components/LoginSignup/Signup";
import Login from "./components/LoginSignup/Login";
import Chat from "./components/Chat";
import Profile from "./components/Profile";
import { jwtDecode } from "jwt-decode";
import ProtectedRoute from "./components/ProtectedRoute";
import Logout from "./components/Logout";
import Welcome from "./components/Welcome"; // <-- Add this import


const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isTokenValid()) {
      setIsLoggedIn(true);
    }
    setLoading(false); // Mark auth check complete

    // Redirect to the welcome page on refresh
    if (window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>; // or a spinner, splash screen, etc.
  }

  return (
    <Router>
      <div className="App">
        {location.pathname !== "/" && (
        <div className="header">
          <h1 className="title">Nano, Your Personal Wellbeing Assistant</h1>
        </div>
        )}
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/signup" element={<SignUp setIsLoggedIn={setIsLoggedIn} />} />
          <Route
            path="/login"
            element={<Login setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route
            path="/chat/:date?"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logout"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <Logout setIsLoggedIn={setIsLoggedIn} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
