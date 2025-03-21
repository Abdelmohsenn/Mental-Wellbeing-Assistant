import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  resetChat: () => void; // Define the prop type for resetting chat
}

const Sidebar: React.FC<SidebarProps> = ({ resetChat }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Menu'}
      </button>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/Chat" onClick={resetChat}>New Chat</Link>
          </li>
          <li><Link to="/History">History</Link></li>
          <li><Link to="/Settings">Settings</Link></li>
          <li><Link to="/Login">Log Out</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
