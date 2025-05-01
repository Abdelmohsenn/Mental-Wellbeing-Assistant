import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

const message =
  "Hii, I'm Nano, your Mental Wellbeing Assistant. What's going through your mind?";

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
    <div className="welcome-container">
      <div className="welcome-layout">
        <div className="text-and-image">
          <p className="welcome-text">{text}</p>
          <div className="welcome-image">
            <img src="src/assets/welcomeavatar.png" alt="Nano Avatar" />
          </div>
        </div>

        <div className="feature-boxes">
          <div className="feature">Detect Emotions Accurately using Camera and Microphone</div>
          <div className="feature">Hold a Beneficial Conversation with User with LLM Chatbot</div>
          <div className="feature">Elevate the Mental Wellbeing of the User</div>
        </div>

        <button className="welcome-button" onClick={() => navigate("/login")}>
          Start Conversation
        </button>
      </div>
    </div>
  );
}