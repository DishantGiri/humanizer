'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export default function TypewriterText({ text, speed = 12, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    let currentLength = 0;
    setDisplayedText('');
    setIsTyping(true);

    const interval = setInterval(() => {
      currentLength += Math.min(3, text.length - currentLength);
      setDisplayedText(text.slice(0, currentLength));

      if (currentLength >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span style={{ position: 'relative', whiteSpace: 'pre-wrap', lineHeight: '1.75' }}>
      {displayedText}
      {isTyping && (
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.15em',
            backgroundColor: '#38bdf8',
            marginLeft: '3px',
            verticalAlign: 'middle',
            animation: 'blink 0.6s infinite',
            boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)',
          }}
        />
      )}
      <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </span>
  );
}
