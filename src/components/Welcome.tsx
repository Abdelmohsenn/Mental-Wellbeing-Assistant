import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";
import Avatar from "./Avatar/Avatar"; // Import the BaymaxAvatar component

const message = "Helllo, I'm Nano. What's going through your mind?";

export default function WelcomePage() {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < message.length - 1) {
        setText((prev) => prev + message[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="welcome-page">
      <header className="nav-header">
        <div className="nav-container">
          <div className="logo-section">
            <img src="src/assets/welcomeavatar.png" alt="Nano Logo" className="nav-logo" />
            <h4 className="brand-name">Nano</h4>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link">Tech</a>
            <a href="#" className="nav-link">About</a>
            <a href="#" className="nav-link">Contacts</a>
          </nav>
        </div>
      </header>
      
      <div className="welcome-container">
        <div className="welcome-content">
        <div className="hero-section">
          <div className="welcome-text-container">
            <h1 className="welcome-title">{text}</h1>
          </div>
          <div className="welcome-image">
          <Avatar />
         </div>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Accurate Emotion Detection</h3>
            <p>Using advanced camera and microphone technology</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Intelligent Conversations</h3>
            <p>Powered by LLM chatbot for meaningful interactions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌟</div>
            <h3>Enhanced Wellbeing</h3>
            <p>Elevating mental health through personalized support</p>
          </div>
        </div>

        <button className="welcome-button" onClick={() => navigate("/login")}>
          Start Conversation
        </button>
      </div>
    </div>
  </div>
  );
}