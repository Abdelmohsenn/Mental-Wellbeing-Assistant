import './Chat.css';
import Sidebar from './Sidebar';
import ToggleSwitch from './ToggleSwitch';
import { Mic, SendHorizontal } from 'lucide-react';
import React, { useEffect, useRef, useState } from "react";
import RecordRTC, { StereoAudioRecorder } from "recordrtc";
import Avatar from "./Avatar/Avatar"; // Import the BaymaxAvatar component

const Chat: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [isChatMode, setIsChatMode] = useState(true); // NEW

  useEffect(() => {
    const ws = new WebSocket("wss://localhost:7039/ws/media");
    
    ws.onopen = () => console.log("Connected to WebSocket server!");
    
    // Handle incoming messages
    ws.onmessage = (event) => {
      const receivedMessage = event.data;
      console.log("Received message:", receivedMessage);
      
      // Update state with server's message
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: receivedMessage, isUser: false }, // Server message
      ]);
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    setSocket(ws);

    return () => ws.close();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: StereoAudioRecorder,
        desiredSampRate: 16000,
      });

      recorderRef.current = recorder;
      recorder.startRecording();

      console.log("Recording started...");

      setTimeout(async () => {
        recorder.stopRecording(async () => {
          const blob = recorder.getBlob();

          if (socket?.readyState === WebSocket.OPEN) {
            const prefix = new TextEncoder().encode("AUD_");
            const buffer = await new Blob([prefix, blob]).arrayBuffer();
            socket.send(buffer);
            console.log("Sent audio buffer to server");
          }
        });
      }, 10000); // Stop after 10s
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stopRecording(() => {
      console.log("Recording stopped.");
    });

    // Also stop the mic stream to release the device
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  const sendImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (
      event.target.files &&
      event.target.files[0] &&
      socket?.readyState === WebSocket.OPEN
    ) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(event.target.files[0]);
      reader.onload = async () => {
        if (reader.result) {
          const imageBlob = new Blob([
            new TextEncoder().encode("IMG_"),
            reader.result,
          ]);
          socket.send(await imageBlob.arrayBuffer());
          console.log("Sent image to server");
        }
      };
    }
  };

  // Function to clear chat messages
  const resetChat = () => {
    setMessages([]); // Reset chat when "New Chat" is clicked
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // Update UI with user's message
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, isUser: true },
      ]);
  
      // Send message to backend if socket is open
      if (socket?.readyState === WebSocket.OPEN) {
        const textMessage = new TextEncoder().encode("MSG_" + message);
        socket.send(textMessage);
        console.log("Sent message to server:", message);
      } else {
        console.warn("WebSocket is not open.");
      }
  
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
                placeholder="Type a message.."
              />
              <button onClick={handleSendMessage}><SendHorizontal /></button>
            </div>
          </div>
        ) : (
          <div className="voice-box">
            <Avatar />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
