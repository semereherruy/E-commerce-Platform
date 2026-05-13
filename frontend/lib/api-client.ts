import axios, { AxiosError } from 'axios';
import { clearAuthCookies } from './auth';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_URL = RAW_BASE_URL.endsWith('/api/v1') 
  ? RAW_BASE_URL 
  : `${RAW_BASE_URL.replace(/\/$/, '')}/api/v1`;

// Validate BASE_URL for client-side usage
if (typeof window !== 'undefined' && !RAW_BASE_URL) {
  console.error('CRITICAL: NEXT_PUBLIC_API_URL is not set. Client-side API calls will fail.');
}

export const api = axios.create({
  baseURL: RAW_BASE_URL ? BASE_URL : '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Network status
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

export const getNetworkStatus = () => isOnline;

// Retry function with exponential backoff
const retryRequest = async (error: AxiosError, retryCount: number = 0): Promise<any> => {
  if (retryCount >= MAX_RETRIES) {
    throw error;
  }

  // Don't retry on 4xx errors (client errors)
  if (error.response && error.response.status >= 400 && error.response.status < 500) {
    throw error;
  }

  // Don't retry if offline
  if (!isOnline) {
    throw new Error('Network is offline');
  }

  const delay = RETRY_DELAY * Math.pow(2, retryCount);
  await new Promise(resolve => setTimeout(resolve, delay));

  return api.request(error.config!);
};

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 - token refresh
    if (error.response?.status === 401 && !(originalRequest as any)?._retry) {
      (originalRequest as any)._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/jwt/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', data.access);
          if (typeof document !== 'undefined') {
            document.cookie = `access_token=${data.access}; path=/; max-age=900; samesite=lax`;
          }
          originalRequest!.headers!.Authorization = `JWT ${data.access}`;
          return api(originalRequest!);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          clearAuthCookies();
          window.location.href = '/login';
          throw err;
        }
      }
    }

    // Handle network errors with retry
    if (!error.response && error.code !== 'ECONNABORTED') {
      try {
        return await retryRequest(error);
      } catch (retryError) {
        throw new Error('Network error: Unable to connect to server. Please check your connection and try again.');
      }
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout: Server is taking too long to respond. Please try again.');
    }

    return Promise.reject(error);
  }
);

/**
 * Search products by query string.
 * @param searchQuery - The search term to query products.
 * @returns Promise resolving to the list of matching products.
 */
export const searchProducts = async (searchQuery: string) => {
  if (!searchQuery) {
    throw new Error('Search query cannot be empty');
  }
  const encoded = encodeURIComponent(searchQuery);
  const response = await api.get(`/store/products/?search=${encoded}`);
  return response.data;
};
