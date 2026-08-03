// ─────────────────────────────────────────────────────────────
// APP LOCK SWITCH
//
// Set to `true` to block all authenticated pages (dashboard, admin,
// security, everything) behind a full-screen message. Login/Signup/
// About/Forgot-Password remain fully functional — only what's
// rendered AFTER a successful login is blocked.
//
// To REMOVE the block entirely: set this back to `false`.
// Nothing else needs to change — auth, JWT, routing all untouched.
// ─────────────────────────────────────────────────────────────
export const APP_LOCKED = true;

// Optional: customize the message shown on the lock screen.
export const APP_LOCK_MESSAGE = {
  title: "App Paused",
  body: "This application is paused right now and all services have been temporarily stopped. Please reach out to your administrator for more info.",
};