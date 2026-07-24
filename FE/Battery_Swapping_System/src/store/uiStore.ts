import { create } from 'zustand';

type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('batteryswap-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem('batteryswap-theme', theme);
};

const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') applyTheme(initialTheme);

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: initialTheme,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    return { theme };
  }),
}));
