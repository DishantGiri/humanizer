'use client';

import React, { useRef, useEffect } from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  isOutput?: boolean;
  maxLength?: number;
}

export default function TextInput({
  value,
  onChange,
  placeholder = 'Paste or type your text here...',
  readOnly = false,
  isOutput = false,
  maxLength = 10000,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(280, el.scrollHeight) + 'px';
    }
  }, [value]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="text-panel__wrapper">
      <textarea
        ref={textareaRef}
        id={isOutput ? 'output-text' : 'input-text'}
        className={`text-panel__textarea ${isOutput ? 'text-panel__textarea--output' : ''}`}
        value={value}
        onChange={(e) => {
          if (!readOnly && e.target.value.length <= maxLength) {
            onChange(e.target.value);
          }
        }}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={!readOnly}
      />
      {!isOutput && (
        <div className="text-panel__counter">
          {wordCount} words · {charCount.toLocaleString()}/{maxLength.toLocaleString()} chars
        </div>
      )}
      {isOutput && value && (
        <div className="text-panel__counter">
          {wordCount} words · {charCount.toLocaleString()} chars
        </div>
      )}
    </div>
  );
}
