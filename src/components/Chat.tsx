import React, { useState } from 'react';
import './Chat.css';
import Sidebar from './Sidebar';

const Chat: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);

  // Function to clear chat messages
  const resetChat = () => {
    setMessages([]); // Reset chat when "New Chat" is clicked
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, isUser: true }, // User message
        { text: 'Hello, I am Nano, your Personal WellBeing Assistant. How can I help you today?', isUser: false } // System response
      ]);
      setMessage('');
    }
  };

  return (
    <div className="chat-layout">
      <Sidebar resetChat={resetChat} /> {/* Pass reset function to Sidebar */}
      <div className="chat-container">
        <h2>Chat Room</h2>
        <div className="chat-box">
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
      </div>
    </div>
  );
};

export default Chat;
