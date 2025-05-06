import "./Chat.css";
import Sidebar from "./Sidebar";
import ToggleSwitch from "./ToggleSwitch";
import {
  Mic,
  SendHorizontal,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Play,
  Pause,
} from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RecordRTC from "recordrtc";
import Avatar from "./Avatar/Avatar"; // Import the BaymaxAvatar component
import { useParams, Link, useNavigate } from "react-router-dom";

const Chat: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>(
    []
  );
  const recorderRef = useRef<InstanceType<typeof RecordRTC> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isChatMode, setIsChatMode] = useState(true); // NEW

  const [hasWaved, setHasWaved] = useState(false);
  const [talkFlag, setTalkFlag] = useState(false); // Flag for talking
  const [idleFlag, setIdleFlag] = useState(false); //flag for idle state (breathing)
  const [waveFlag, setWaveFlag] = useState(false); // flag for waving
  const [animations, setAnimations] = useState([1]);
  const [Speed, setSpeed] = useState(1);

  const [facialEmotion, setFacialEmotion] = useState("🙂");
  const [voiceEmotion, setVoiceEmotion] = useState("😠");
  const [textEmotion, setTextEmotion] = useState("😊");

  const emotions = [
    { label: "Happiness", emoji: "😊" },
    { label: "Sadness", emoji: "😢" },
    { label: "Anger", emoji: "😠" },
    { label: "Fear", emoji: "😨" },
    { label: "Surprise", emoji: "😲" },
    { label: "Neutral", emoji: "😐" },
  ];
  const { date } = useParams<{ date: string }>(); // Get chat date from URL params

  const [sessionId, setSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  const startSession = async () => {
    const response = await fetch("/api/start-session", { method: "POST" });
    const data = await response.json();
    if (data.sessionId) {
      setSessionId(data.sessionId);
      setSessionActive(true);
      navigate(`/chat/${data.sessionId}`); // Navigate to the session route
    }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    await fetch(`/api/end-session/${sessionId}`, { method: "POST" });
    setSessionId(null);
    setSessionActive(false);
    navigate("/chat"); // Optionally go back to a default chat view
  };

  useEffect(() => {
    if (date) {
      // Simulate fetching chat history based on the date
      const fetchedMessages = [
        { text: `Chat history for ${date}`, isUser: false },
        { text: "This is a sample message.", isUser: true },
        { text: "Sample system response", isUser: false },
      ];
      setMessages(fetchedMessages);
    }
  }, [date]); // Run this effect when 'date' changes

  useEffect(() => {
    const ws = new WebSocket(
      `wss://localhost:7039/ws/media?token=${localStorage.getItem("token")}`
    );

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

  useEffect(() => {
    let newAnimations: number[] = [];

    if (waveFlag) {
      newAnimations = [5];
      setSpeed(0.8);
      setIdleFlag(true);
    } else if (talkFlag) {
      newAnimations = [2];
      setSpeed(0.5);
      setIdleFlag(false);
    } else if (idleFlag) {
      newAnimations = [1];
      setSpeed(0.35);
      setWaveFlag(false);
      setTalkFlag(false);
    }

    setAnimations(newAnimations);
  }, [waveFlag, talkFlag, idleFlag]);

  useEffect(() => {
    if (isChatMode) {
      setHasWaved(false);
    }
  }, [isChatMode]);

  useEffect(() => {
    if (!isChatMode && !hasWaved) {
      // Start wave animation
      setWaveFlag(true);
      setIdleFlag(false);
      setTalkFlag(false);

      // After timeout, switch to idle
      const waveTimer = setTimeout(() => {
        setWaveFlag(false);
        setIdleFlag(true);
        setTalkFlag(true); // to be removed
        setHasWaved(true);
      }, 4500);

      return () => clearTimeout(waveTimer);
    }
  }, [isChatMode, hasWaved]);

  const sendChunk = useCallback(
    async (blob: Blob, isFinal: boolean) => {
      if (socket?.readyState === WebSocket.OPEN) {
        const prefix = new TextEncoder().encode(isFinal ? "AUDEND_" : "AUD_");
        try {
          const arrayBuffer = await new Blob([prefix, blob]).arrayBuffer();
          socket.send(arrayBuffer);
          console.log(
            `Sent chunk: ${
              isFinal ? "Final (AUDEND_)" : "Intermediate (AUD_)"
            }, Size: ${arrayBuffer.byteLength}`
          );
        } catch (error) {
          console.error("Error creating/sending blob:", error);
        }
      } else {
        console.warn("WebSocket not open. Chunk not sent.");
      }
    },
    [socket]
  );

  const requestData = useCallback(() => {
    if (
      recorderRef.current &&
      typeof recorderRef.current.requestData === "function"
    ) {
      recorderRef.current.requestData();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || recorderRef.current) {
      console.warn("Recording already in progress or recorder exists.");
      return;
    }

    console.log("Attempting to start recording...");
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const recorderInstance = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm;codecs=opus",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 10000, // 10 seconds
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        disableLogs: true,
        ondataavailable: (blob) => {
          console.log("ondataavailable: received blob, size: ", blob.size);
          if (socket && socket.readyState === WebSocket.OPEN && blob.size > 0) {
            console.log(`Sending chunk of size ${blob.size}`);
            sendChunk(blob, false);
          }
        },
      });

      recorderRef.current = recorderInstance;
      recorderInstance.startRecording();

      // Alternative approach: Set up an interval to request data
      intervalRef.current = setInterval(() => {
        requestData();
      }, 10000);

      console.log("Recording started successfully with 10s chunks.");
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (recorderRef.current) {
        if (typeof recorderRef.current.destroy === "function") {
          recorderRef.current.destroy();
        }
        recorderRef.current = null;
      }
    }
  }, [isRecording, sendChunk, socket, requestData]);

  const stopRecording = useCallback(
    (forceStop = false) => {
      if (!isRecording && !forceStop) {
        console.warn("Stop recording called but not recording.");
        return;
      }
      console.log("Stopping recording...");

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const recorder = recorderRef.current;
      const stream = streamRef.current;

      recorderRef.current = null;
      streamRef.current = null;
      setIsRecording(false);

      if (recorder) {
        recorder.stopRecording(() => {
          console.log("Final stopRecording callback entered.");
          const blob = recorder.getBlob();
          if (blob && blob.size > 0) {
            console.log(`Sending final chunk, size: ${blob.size}`);
            sendChunk(blob, true);
          } else {
            console.warn(
              "No final blob generated. Sending empty AUDEND_ marker."
            );
            sendChunk(new Blob([]), true);
          }

          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            console.log("Media stream tracks stopped.");
          }

          try {
            if (typeof recorder.destroy === "function") {
              recorder.destroy();
              console.log("RecordRTC instance destroyed.");
            }
          } catch (e) {
            console.error("Error destroying recorder:", e);
          }
        });
      } else {
        console.warn("stopRecording called but recorderRef was already null.");
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          console.log("Media stream tracks stopped (no recorder case).");
        }
        sendChunk(new Blob([]), true);
      }
    },
    [isRecording, sendChunk]
  );

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
        // {
        //   text: 'I am really sorry you are feeling this way. Tell me more about it.',
        //   isUser: false,
        // }, // System response
      ]);

      // Send message to backend if socket is open
      if (socket?.readyState === WebSocket.OPEN) {
        const textMessage = new TextEncoder().encode("MSG_" + message);
        socket.send(textMessage);
        console.log("Sent message to server:", message);
      } else {
        console.warn("WebSocket is not open.");
      }

      setMessage("");
    }
  };
  const getEmotionLabel = (emoji: string): string => {
    const emotion = emotions.find((e) => e.emoji === emoji);
    return emotion ? emotion.label : "Unknown";
  };
  const [sessionActive, setSessionActive] = useState(false);
  const toggleSession = () => {
    setSessionActive((prev) => !prev);
  };

  return (
    <div className="chat-layout">
      <div className="sidebar-toggles">
        <ToggleSwitch
          isChatMode={isChatMode}
          onToggle={() => setIsChatMode(!isChatMode)}
        />
      </div>
      <Sidebar resetChat={resetChat} /> {/* Old sidebar remains untouched */}
      <div className="profile-icon-wrapper">
        <Link to="/profile">
          <UserCircle className="UserCircle" />
        </Link>
      </div>
      <div className="chat-container">
        {isChatMode ? (
          <div className="chat-box">
            <div className="messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${
                    msg.isUser ? "user-message" : "system-message"
                  }`}
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
                placeholder="Write Your Message.."
              />
              <button onClick={handleSendMessage}>
                <SendHorizontal className="SendHorizontal" />
              </button>
            </div>
          </div>
        ) : (
          <div className="voice-box">
            <div className="Indicators">
              <h4 style={{ marginTop: "10px", fontWeight: "bold" }}>
                Facial Emotion:{" "}
                <span className="emotion">
                  {facialEmotion} ({getEmotionLabel(facialEmotion)})
                </span>
              </h4>
              <h4 style={{ marginTop: "10px", fontWeight: "bold" }}>
                Voice Emotion:{" "}
                <span className="emotion">
                  {voiceEmotion} ({getEmotionLabel(voiceEmotion)})
                </span>
              </h4>
              <h4 style={{ marginTop: "10px", fontWeight: "bold" }}>
                Text Emotion:{" "}
                <span className="emotion">
                  {textEmotion} ({getEmotionLabel(textEmotion)})
                </span>
              </h4>
            </div>
            <Avatar mode={animations} speed={Speed} />

              <button 
               className="session-button"
               onClick={startRecording} disabled={isRecording}>
                {isRecording ? "Recording..." : "Start Recording"}
              </button >
              {isRecording && (
                <button className="session-button"
                onClick={() => stopRecording()}>Stop Recording</button>
              )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
