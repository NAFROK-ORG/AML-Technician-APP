import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// FIX Bug 3: Guard flag prevents the race condition where multiple concurrent
// requests all return 401 simultaneously (e.g. on dashboard mount with 3-4
// parallel API calls when a JWT expires).
//
// Without this flag:
//   - All 401 responses fire logout() + window.location.href = "/login" at once
//   - logout() clears localStorage multiple times in a race
//   - React state updates hit already-unmounting components
//
// The flag resets naturally on page reload (window.location.href navigates away
// and the module re-executes fresh), so it never gets "stuck" as true.
let isLoggingOut = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;