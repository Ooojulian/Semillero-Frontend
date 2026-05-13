import { api } from '../lib/api';
import { AuthTokens } from '../types';

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  register: (email: string, password: string, full_name: string, role = 'candidate') =>
    api.post<AuthTokens['user']>('/auth/register', { email, password, full_name, role }),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }),
};
