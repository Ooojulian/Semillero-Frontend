import { User } from '../types';

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const isAuthenticated = () =>
  typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
