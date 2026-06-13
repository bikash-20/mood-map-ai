// Axios instance with automatic Firebase ID token attachment
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { auth } from './firebase';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const user = auth?.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(/* forceRefresh */ false);
        config.headers.set('Authorization', `Bearer ${token}`);
      } catch (e) {
        // Token retrieval failed — let the request proceed unauthenticated
        console.warn('Failed to attach auth token', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized error handler — auto sign-out on 401
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token invalid or expired — sign out silently
      try {
        await auth?.signOut();
      } catch {
        /* noop */
      }
    }
    return Promise.reject(error);
  }
);
