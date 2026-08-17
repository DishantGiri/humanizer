'use client';

import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export interface NavbarProps {
  activeMenu?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function Navbar({
  activeMenu = 'humanizer',
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
        <ThemeToggle size="md" />
      </div>
    </header>
  );
}
