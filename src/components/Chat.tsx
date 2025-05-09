import "./Chat.css";
import Sidebar from "./Sidebar";
import ThoughtBubble from "./Avatar/Thinking";

import ToggleSwitch from "./ToggleSwitch";
import {
  Mic,
  SendHorizontal,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Play,
  Pause,
  LogOut
} from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RecordRTC from "recordrtc";
import Avatar from "./Avatar/Avatar"; // Import the BaymaxAvatar component
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";

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
  const [thinkingFlag, setThinkingFlag] = useState(false); // flag for Thinking
  const [animations, setAnimations] = useState([1]);
  const [Speed, setSpeed] = useState(1);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
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
   */
  
  const { date } = useParams<{ date: string }>(); // Get chat date from URL params

  const [sessionId, setSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  // const startSession = async () => {
  //   const response = await fetch("/api/start-session", { method: "POST" });
  //   const data = await response.json();
  //   if (data.sessionId) {
  //     setSessionId(data.sessionId);
  //     setSessionActive(true);
  //     navigate(`/chat/${data.sessionId}`); // Navigate to the session route
  //   }
  // };

  // const stopSession = async () => {
  //   if (!sessionId) return;
  //   await fetch(`/api/end-session/${sessionId}`, { method: "POST" });
  //   setSessionId(null);
  //   setSessionActive(false);
  //   navigate("/chat"); // Optionally go back to a default chat view
  // };

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
    ws.onmessage = (event) => {
      const receivedMessage = event.data;
      console.log("Received message");
      if (receivedMessage instanceof Blob) {
      // If the received message is a Blob (audio data)
      const audioUrl = URL.createObjectURL(receivedMessage);
      const audio = new Audio(audioUrl);
      setTalkFlag(true);
      audio.play();
      audio.onended = () => {
        setTalkFlag(false);
        setIdleFlag(true);
      };
      } else {
      // If the received message is text
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: receivedMessage, isUser: false }, // Server message
      ]);
      }
    };
    // Handle incoming messages
    // ws.onmessage = (event) => {
    //   const receivedMessage = event.data;
    //   //console.log("Received message:", receivedMessage);

    //   // Update state with server's message
    //   setMessages((prevMessages) => [
    //     ...prevMessages,
    //     { text: receivedMessage, isUser: false }, // Server message
    //   ]);
    //};

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
      setSpeed(0.75);
      setWaveFlag(false);
      setTalkFlag(false);
    } else if (thinkingFlag) {
      console.log(thinkingFlag);
      setSpeed(0.7)
      newAnimations = [4];
    }

    setAnimations(newAnimations);
  }, [waveFlag, talkFlag, idleFlag, thinkingFlag]);

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
        setTalkFlag(false); // to be removed
        setHasWaved(true);
      }, 4500);

      return () => clearTimeout(waveTimer);
    }
  }, [isChatMode, hasWaved]);

  const captureAndSendFrame = () => {
    if (!canvasRef.current) {
      console.warn("Canvas reference is not ready.");
      return;
    }
    if (!videoRef.current) {
      console.warn("Video reference is not ready.");
      return;
    }
    if (!socket) {
      console.warn("Socket is not connected.");
      return;
    }
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
  
    if (!ctx) {
      console.error("Failed to get canvas 2D context.");
      return;
    }
  
    // Ensure canvas matches video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob && socket.readyState === WebSocket.OPEN) {
          const prefix = new TextEncoder().encode("IMG_");
          const imageData = await new Blob([prefix, blob]).arrayBuffer();
          socket.send(imageData);
          //console.log("Sent frame image to server");
        }
      }, "image/jpeg");
    }
  
    // Convert canvas content to base64 image
    const frameData = canvas.toDataURL("image/jpeg");
    const timestamp = Date.now();
  
  
    //console.log(`📤 Sent frame at ${new Date(timestamp).toLocaleTimeString()}`);
  };
  
  
  const sendChunk = useCallback(
    async (blob: Blob, isFinal: boolean) => {
      if (socket?.readyState === WebSocket.OPEN) {
        const prefix = new TextEncoder().encode(isFinal ? "AUDEND_" : "AUD_");
        try {
          const arrayBuffer = await new Blob([prefix, blob]).arrayBuffer();
          socket.send(arrayBuffer);
          // console.log(
          //   `Sent chunk: ${
          //     isFinal ? "Final (AUDEND_)" : "Intermediate (AUD_)"
          //   }, Size: ${arrayBuffer.byteLength}`
          // );
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

    //console.log("Attempting to start recording...");
    setIsRecording(true);
    setIdleFlag(false);
    setThinkingFlag(true);
    console.log("thinkingFlag: ", thinkingFlag);
    console.log("animations: ", animations);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        video: true, 
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const recorderInstance = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm;codecs=opus",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 10000, // 10 seconds
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        disableLogs: true,
        ondataavailable: (blob) => {
          //console.log("ondataavailable: received blob, size: ", blob.size);
          if (socket && socket.readyState === WebSocket.OPEN && blob.size > 0) {
            //console.log(`Sending chunk of size ${blob.size}`);
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

      frameIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000);

      //console.log("Recording started successfully with 10s chunks.");
    } catch (error) {
      console.error("Error starting recording:", error);
      // await sleep(3000); // Delay 1 second
      setIsRecording(false);
      setIdleFlag(true);
      setThinkingFlag(false);
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
      //console.log("Stopping recording...");

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      const recorder = recorderRef.current;
      const stream = streamRef.current;

      recorderRef.current = null;
      streamRef.current = null;
      setIsRecording(false);
      setThinkingFlag(false);
      setIdleFlag(true);


      if (recorder) {
        recorder.stopRecording(() => {
          //console.log("Final stopRecording callback entered.");
          const blob = recorder.getBlob();
          if (blob && blob.size > 0) {
            //console.log(`Sending final chunk, size: ${blob.size}`);
            sendChunk(blob, true);
          } else {
            console.warn(
              "No final blob generated. Sending empty AUDEND_ marker."
            );
            sendChunk(new Blob([]), true);
          }

          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            //console.log("Media stream tracks stopped.");
          }

          try {
            if (typeof recorder.destroy === "function") {
              recorder.destroy();
              //console.log("RecordRTC instance destroyed.");
            }
          } catch (e) {
            console.error("Error destroying recorder:", e);
          }
        });
      } else {
        console.warn("stopRecording called but recorderRef was already null.");
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          //console.log("Media stream tracks stopped (no recorder case).");
        }
        sendChunk(new Blob([]), true);
      }
    },
    [isRecording, sendChunk]
  );

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
        //.log("Sent message to server:", message);
      } else {
        console.warn("WebSocket is not open.");
      }

      setMessage("");
    }
  };
  // const getEmotionLabel = (emoji: string): string => {
  //   const emotion = emotions.find((e) => e.emoji === emoji);
  //   return emotion ? emotion.label : "Unknown";
  // };
  // const [sessionActive, setSessionActive] = useState(false);
  // const toggleSession = () => {
  //   setSessionActive((prev) => !prev);
  // };

  const handleEndSession = async () => {
    const apiUrl = import.meta.env.VITE_ENDSESSION_API;
    if (!apiUrl) {
      alert("End Session API URL is not defined.");
      return;
    }
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found. Please log in.");
      return;
    }
    
    try {
      const response = await axios.post(apiUrl, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    
      if (response.status === 200) {
        alert("Session ended successfully!");
      } else {
        alert("Error ending session. Please try again.");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  return (
    <div className="chat-layout">
      <div className="sidebar-toggles">
        <ToggleSwitch
          isChatMode={isChatMode}
          onToggle={() => setIsChatMode(!isChatMode)}
        />
      </div>
      <Sidebar resetChat={resetChat} /> {/* Old sidebar remains untouched */}
      <div className="logout-icon-wrapper">

        <Link to="/">
          <LogOut className="LogOut" onClick={() => handleEndSession()}/>
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
            <Avatar mode={animations} speed={Speed} />
            <ThoughtBubble flag = {thinkingFlag}/>
            <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />


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


/**
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
*/
