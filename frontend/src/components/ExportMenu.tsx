'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  FileText,
  FileType,
  Globe,
  ChevronDown,
} from 'lucide-react';

interface ExportMenuProps {
  text: string;
  disabled?: boolean;
}

export default function ExportMenu({ text, disabled = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportTxt = () => {
    downloadFile(text, 'humanized-text.txt', 'text/plain');
  };

  const exportMarkdown = () => {
    downloadFile(text, 'humanized-text.md', 'text/markdown');
  };

  const exportHtml = () => {
    const paragraphs = text
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Humanized Text</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #333; }
  </style>
</head>
<body>
${paragraphs}
</body>
</html>`;
    downloadFile(html, 'humanized-text.html', 'text/html');
  };

  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        id="copy-button"
        className={`output-actions__btn ${copied ? 'output-actions__btn--copied' : ''}`}
        onClick={handleCopy}
        disabled={disabled}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <button
        type="button"
        id="export-button"
        className="output-actions__btn"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="export-menu__dropdown">
          <button type="button" className="export-menu__item" onClick={exportTxt}>
            <FileText size={14} />
            Plain Text (.txt)
          </button>
          <button type="button" className="export-menu__item" onClick={exportMarkdown}>
            <FileType size={14} />
            Markdown (.md)
          </button>
          <button type="button" className="export-menu__item" onClick={exportHtml}>
            <Globe size={14} />
            HTML (.html)
          </button>
        </div>
      )}
    </div>
  );
}
