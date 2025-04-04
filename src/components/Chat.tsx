import React, { useState } from 'react';
import './Chat.css';
import Sidebar from './Sidebar';
import ToggleSwitch from './ToggleSwitch';
import { Mic } from 'lucide-react';

const Chat: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [isChatMode, setIsChatMode] = useState(true); // NEW

  // Function to clear chat messages
  const resetChat = () => {
    setMessages([]); // Reset chat when "New Chat" is clicked
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, isUser: true }, // User message
        {
          text: 'Hello, I am Nano, your Personal WellBeing Assistant. How can I help you today?',
          isUser: false,
        }, // System response
      ]);
      setMessage('');
    }
  };

  return (
    <div className="chat-layout">
      <div className="sidebar-toggles">
        <ToggleSwitch isChatMode={isChatMode} onToggle={() => setIsChatMode(!isChatMode)} />
      </div>

      <Sidebar resetChat={resetChat} /> {/* Old sidebar remains untouched */}

      <div className="chat-container">
        {isChatMode ? (
          <div className="chat-box">
            <h2>Chat Room</h2>
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.isUser ? 'user-message' : 'system-message'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="input-area">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        ) : (
          <div className="voice-box">
            <Mic className="mic-icon" size={100} color="#3B82F6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
