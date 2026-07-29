'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

export interface NavbarProps {
  activeMenu?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function Navbar({
  activeMenu = 'humanizer',
  theme = 'dark',
  onToggleTheme,
}: NavbarProps) {
  const breadcrumbText =
    activeMenu === 'dashboard'
      ? 'Dashboard'
      : activeMenu === 'plans'
      ? 'Plans & Pricing'
      : activeMenu === 'account'
      ? 'Account'
      : 'Humanizer';

  return (
    <header className="navbar">
      <div className="navbar__breadcrumb">
        <span className="navbar__breadcrumb-current">{breadcrumbText}</span>
      </div>

      <div className="navbar__actions">
        {onToggleTheme && (
          <button
            type="button"
            className="global-navbar__theme-btn"
            onClick={(e) => onToggleTheme(e)}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}
