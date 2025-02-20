import React, { useState } from 'react';
import './Chat.css'; // We'll define the styles for the chatbox here.

const Chat: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<string[]>([]);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages((prevMessages) => [...prevMessages, message]);
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="chat-box">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className="message">
              {msg}
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
  );
};

export default Chat;
