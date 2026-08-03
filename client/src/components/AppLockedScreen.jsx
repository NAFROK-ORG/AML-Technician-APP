import { APP_LOCK_MESSAGE } from "../config/appLock";

const C = {
  pageBg:  "#EEF2F7",
  card:    "#FFFFFF",
  border:  "#DDE3EE",
  navy:    "#1E3A8A",
  ink:     "#0A1628",
  mid:     "#374151",
  muted:   "#6B7A99",
  amber:   "#D97706",
};

// Simple inline SVGs — no external icon package needed, zero new dependencies.
function LockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke={C.amber} strokeWidth="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke={C.amber} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill={C.amber} />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={C.muted} strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke={C.muted} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={C.navy} strokeWidth="2" />
      <path d="m4 7 8 6 8-6" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AppLockedScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: `radial-gradient(circle at 50% 0%, #F4F7FB 0%, ${C.pageBg} 60%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: "10px",
          padding: "44px 36px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 12px 32px -12px rgba(10, 22, 40, 0.18)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#FEF3E7",
            border: "1px solid #FCE1BE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
          }}
        >
          <LockIcon />
        </div>

        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "28px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: C.ink,
            margin: "0 0 14px",
          }}
        >
          {APP_LOCK_MESSAGE.title}
        </h1>

        <p
          style={{
            color: C.mid,
            fontSize: "14.5px",
            lineHeight: 1.65,
            margin: "0 0 24px",
          }}
        >
          {APP_LOCK_MESSAGE.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "12px",
            color: C.muted,
            background: C.pageBg,
            border: `1px solid ${C.border}`,
            borderRadius: "6px",
            padding: "10px 14px",
            marginBottom: "20px",
          }}
        >
          <ClockIcon />
          <span>We're on it — check back soon</span>
        </div>

        <div
          style={{
            paddingTop: "18px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <MailIcon />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            AML Motors · Contact Admin
          </span>
        </div>
      </div>
    </div>
  );
}