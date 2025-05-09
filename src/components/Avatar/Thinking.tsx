import React, { useState, useEffect } from 'react';
import "./Thinking.css";

const ThoughtBubble = ({ flag = false }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(flag);
  
  useEffect(() => {
    let animationTimeout;
    
    if (flag) {
      animationTimeout = setTimeout(() => {
        setVisible(true);
      }, 300);
    } else {
      setVisible(false);
    }
    
    return () => {
      clearTimeout(animationTimeout);
    };
  }, [flag]);
  
  // Only unmount component when animation is complete
  useEffect(() => {
    if (flag) {
      setMounted(true);
    } else if (!visible && !flag) {
      // Wait for transition to complete before unmounting
      const unmountTimeout = setTimeout(() => {
        setMounted(false);
      }, 800); // Match this with the CSS transition duration
      
      return () => clearTimeout(unmountTimeout);
    }
  }, [visible, flag]);
  
  if (!mounted) return null;
  
  return (
    <div className="flex items-center justify-center w-full">
      <div className="relative">
        {/* The GIF component with CSS class-based animation */}
        <img
          src="src/components/Avatar/giphy.gif"
          alt="thinking animation"
          className={`Thinking ${visible ? 'visible' : ''}`}
        />
      </div>
    </div>
  );
};

export default ThoughtBubble;