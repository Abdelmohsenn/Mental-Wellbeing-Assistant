import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  History,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from "lucide-react";
import "./Sidebar.css";

interface SidebarProps {
  resetChat: () => void;
  flag: boolean;
  LoggedIn?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ resetChat, flag, LoggedIn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toggleHistory = () => setShowHistory(!showHistory);

  const previousChats = [
    { id: "session1", date: "April 18, 2025" },
    { id: "session2", date: "April 17, 2025" },
    { id: "session3", date: "April 16, 2025" },
    { id: "session4", date: "April 15, 2025" },
    { id: "session5", date: "April 14, 2025" },
    { id: "session6", date: "April 13, 2025" },
    { id: "session7", date: "April 12, 2025" },
    { id: "session8", date: "April 11, 2025" },
  ];

  const { id: sessionId } = useParams();
  useEffect(() => {
    if (sessionId) {
      console.log("Load session with ID:", sessionId);
    }
  }, [sessionId]);

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <button
        className={flag ? "menu-button" : "menu-button2"}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <PanelLeftClose className="PanelLeftClose" />
        ) : (
          <PanelLeftOpen className="PanelLeftOpen" />
        )}
      </button>

      <nav className="sidebar-nav">
        <ul>
          {flag && (
            <>
              <li>
                <Link to="/Chat" onClick={resetChat} className="sidebar-link">
                  <MessageSquare size={24} />
                  <span> New Chat</span>
                </Link>
              </li>
              <li>
                <button className="sidebar-link" onClick={toggleHistory}>
                  <History size={24} />
                  <span> History</span>
                  {showHistory ? (
                    <ChevronUp size={16} style={{ marginLeft: "auto" }} />
                  ) : (
                    <ChevronDown size={16} style={{ marginLeft: "auto" }} />
                  )}
                </button>
                {showHistory && (
                  <div
                    className={`chat-history-list ${
                      previousChats.length > 5 ? "scrollable" : ""
                    }`}
                  >
                    {previousChats.map((session) => (
                      <Link
                        to={`/chat/${session.id}`}
                        className="chat-history-item"
                        key={session.id}
                      >
                        {session.date}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            </>
          )}
          
          {/* If flag is false, show menu based on LoggedIn */}
          {!flag && LoggedIn && (
            <>
              <li>
                <Link to="/Settings" className="sidebar-link">
                  <Settings size={24} />
                  <span> Settings</span>
                </Link>
              </li>
              <li>
                <Link to="/logout" className="sidebar-link">
                  <LogOut size={24} />
                  <span> Log Out</span>
                </Link>
              </li>
            </>
          )}

          {!flag && !LoggedIn && (
            <>
              <li>
                <Link to="/login" className="sidebar-link">
                  <LogOut size={24} />
                  <span> Login</span>
                </Link>
              </li>
              <li>
                <Link to="/signup" className="sidebar-link">
                  <UserPlus size={24} />
                  <span> Sign Up</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;