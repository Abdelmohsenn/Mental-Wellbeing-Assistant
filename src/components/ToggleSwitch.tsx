import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 relative transition-colors">
        <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
      </div>
      <span className="ml-2 text-blue-800 font-semibold">{label}</span>
    </label>
  );
};

export default ToggleSwitch;
