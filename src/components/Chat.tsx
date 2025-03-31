import React, { useState } from 'react';
import './Chat.css';
import Sidebar from './Sidebar';
import ToggleSwitch from './ToggleSwitch';
import { Mic, MessageCircle } from 'lucide-react';

const Chat: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);

  const [chatOn, setChatOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);

  const resetChat = () => {
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, isUser: true },
        {
          text: 'Hello, I am Nano, your Personal WellBeing Assistant. How can I help you today?',
          isUser: false,
        },
      ]);
      setMessage('');
    }
  };

  return (
    <div className="chat-layout">
      <Sidebar resetChat={resetChat} />

      <div className="chat-container">
        <h2>Chat Room</h2>

        {/* Toggle Controls */}
        <div
          className="toggle-bar"
          style={{ display: 'flex', gap: '30px', marginBottom: '20px', justifyContent: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageCircle />
            <ToggleSwitch
              label={chatOn ? 'Chat on' : 'Chat off'}
              checked={chatOn}
              onChange={() => setChatOn(!chatOn)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mic />
            <ToggleSwitch
              label={voiceOn ? 'Voice on' : 'Voice off'}
              checked={voiceOn}
              onChange={() => setVoiceOn(!voiceOn)}
            />
          </div>
        </div>

        {/* Chat Section */}
        {chatOn && (
          <div className="chat-box">
            <div className="messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.isUser ? 'user-message' : 'system-message'}`}
                >
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
        )}

        {/* Voice Section */}
        {voiceOn && (
          <div className="voice-container">
            <Mic className="mic-icon" size={80} color="#3B82F6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
