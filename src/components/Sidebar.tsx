import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, MessageSquare, History, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  resetChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ resetChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toggleHistory = () => setShowHistory(!showHistory);

  const previousChats = [
    "April 18, 2025",
    "April 17, 2025",
    "April 16, 2025",
    "April 15, 2025",
    "April 14, 2025",
    "April 13, 2025",
    "April 12, 2025",
    "April 11, 2025",
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <PanelLeftClose className='PanelLeftClose' />
        ) : (
          <PanelLeftOpen className='PanelLeftOpen' />
        )}
      </button>
      <nav className="sidebar-nav">
        <ul>
          <li>
          <Link to="/Chat" onClick={resetChat} className="sidebar-link">
            <MessageSquare size={24} />
            <span>  New Chat</span>
          </Link>
          </li>
          <li>
            <button className="sidebar-link" onClick={toggleHistory}>
              <History size={24} />
              <span>  History</span>
              {showHistory ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
            </button>
            {showHistory && (
              <div className={`chat-history-list ${previousChats.length > 5 ? 'scrollable' : ''}`}>
                {previousChats.map((date, index) => (
                  <Link to={`/chat/${date}`} className="chat-history-item" key={index}>
                    {date}
                  </Link>
                ))}
              </div>
            )}
          </li>
          <li>
            <Link to="/Settings" className="sidebar-link">
              <Settings size={24} />
              <span>  Settings</span>
            </Link>
          </li>
          <li>
            <Link to="/Login" className="sidebar-link">
              <LogOut size={24} />
              <span>  Log Out</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;