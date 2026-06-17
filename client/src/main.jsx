import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";

// VITE_SENTRY_DSN is optional. If it's not set in your client .env file,
// Sentry.init() becomes a no-op — nothing else here changes, and the app
// behaves exactly as before. Add it to .env (and to Vercel's environment
// variables) once you have a frontend Sentry project DSN.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // 10% of sessions get full performance traces — enough signal without
  // burning through the free Sentry plan's event quota.
  tracesSampleRate: 0.1,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);