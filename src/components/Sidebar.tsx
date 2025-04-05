import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, MessageSquare, History, Settings, LogOut } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  resetChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ resetChat }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <PanelLeftClose size={24} />
        ) : (
          <PanelLeftOpen size={24} />
        )}
      </button>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/Chat" onClick={resetChat}>
              <MessageSquare size={18} />
              <span>New Chat</span>
            </Link>
          </li>
          <li>
            <Link to="/History">
              <History size={18} />
              <span>History</span>
            </Link>
          </li>
          <li>
            <Link to="/Settings">
              <Settings size={18} />
              <span>Settings</span>
            </Link>
          </li>
          <li>
            <Link to="/Login">
              <LogOut size={18} />
              <span>Log Out</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;