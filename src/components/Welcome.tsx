import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

const message =
  "Hi, I'm Nano, your Mental Wellbeing Assistant. What's going through your mind?";

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
      <div className="welcome-box">
        <p className="welcome-text">{text}</p>
        <button className="welcome-button" onClick={() => navigate("/login")}>
          Start Conversation
        </button>
      </div>
    </div>
  );
}
