import React from 'react';
import { Mic, MessageCircle } from 'lucide-react';

interface ToggleSwitchProps {
  isChatMode: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isChatMode, onToggle }) => {
  return (
    <div className="outside-toggle-wrapper">
      <span className="outside-icon">
        <MessageCircle className = "MessageCircle" />
      </span>

      <div
        className={`outside-toggle-track ${isChatMode ? 'left' : 'right'}`}
        onClick={onToggle}
      >
        <div className="outside-toggle-thumb" />
      </div>

      <span className="outside-icon">
        <Mic className="Mic" />
      </span>
    </div>
  );
};

export default ToggleSwitch;
