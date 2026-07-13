import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial values from localStorage
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  let user: User | null = null;
  
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
  }

  return {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    setToken: (token) => {
      localStorage.setItem('token', token);
      set({ token, isAuthenticated: true });
    },
    login: (token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, isAuthenticated: false });
    },
    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUser));
        return { user: newUser };
      });
    },
  };
});
