import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",

  // Without a timeout, requests hang indefinitely when Render is slow (morning
  // burst). A hung request means:
  //   - User sees a spinner forever and taps submit again → duplicate requests
  //   - MongoDB connection held open longer than needed → compounds Risk 3
  //   - No error surface for the UI to recover from
  //
  // 12 000 ms gives legitimate slow queries (morning peak: 5-10s range)
  // room to complete, while cutting off truly stuck requests before users
  // start retrying manually.
  //
  // Note: this works in tandem with the backend's serverSelectionTimeoutMS:
  // 10 000 — if MongoDB itself times out (10s), Express returns a 500 well
  // within this 12s window, so the response path is always clean.
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Guard flag prevents the race condition where multiple concurrent requests
// all return 401 simultaneously (e.g. on dashboard mount with 3-4 parallel
// API calls when a JWT expires).
//
// Without this flag:
//   - All 401 responses fire logout() + window.location.href = "/login" at once
//   - logout() clears localStorage multiple times in a race
//   - React state updates hit already-unmounting components
//
// The flag resets naturally on page reload (window.location.href navigates
// away and the module re-executes fresh), so it never gets "stuck" as true.
//
// Also handles ECONNABORTED (axios timeout) — if the request times out,
// err.code === "ECONNABORTED". This is NOT a 401, so the logout guard
// doesn't trigger. The error propagates normally to the calling component,
// which should surface a "Request timed out — try again" message.
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