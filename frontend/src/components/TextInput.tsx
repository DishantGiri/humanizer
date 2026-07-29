'use client';

import React from 'react';

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
  return (
    <div className="text-panel__wrapper">
      <textarea
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
    </div>
  );
}
