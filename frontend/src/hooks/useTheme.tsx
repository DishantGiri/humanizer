'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme, e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'humyn_theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage and get current system theme
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    
    const currentSysTheme = getSystemTheme();
    setSystemTheme(currentSysTheme);
    setThemeState(initialTheme);
    setMounted(true);

    // Apply resolved theme to DOM
    const resolved = initialTheme === 'system' ? currentSysTheme : initialTheme;
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  // Listen for OS color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSysTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSysTheme);
      
      // If current preference is 'system', update DOM immediately
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (!saved || saved === 'system') {
        document.documentElement.setAttribute('data-theme', newSysTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (!mounted) return 'dark';
    if (theme === 'system') return systemTheme;
    return theme;
  }, [theme, systemTheme, mounted]);

  const setTheme = useCallback(
    (newTheme: Theme, e?: React.MouseEvent) => {
      const nextResolved: ResolvedTheme =
        newTheme === 'system' ? getSystemTheme() : newTheme;

      const updateDOM = () => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        document.documentElement.setAttribute('data-theme', nextResolved);
      };

      // If view transitions are supported and user didn't request reduced motion, use circular wipe
      if (
        e &&
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const right = window.innerWidth - rect.left;
        const bottom = window.innerHeight - rect.top;
        const maxRadius = Math.hypot(
          Math.max(rect.left, right),
          Math.max(rect.top, bottom)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transition = (document as any).startViewTransition(() => {
          updateDOM();
        });

        transition.ready?.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 400,
              easing: 'ease-in-out',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        });
      } else {
        updateDOM();
      }
    },
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
