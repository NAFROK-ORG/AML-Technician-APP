export default function PoweredBy() {
  return (
    <>
      <style>{`
        @keyframes pwDotPulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.2; transform: scale(0.75); }
        }
        .pw-dot {
          animation: pwDotPulse 2.4s ease-in-out infinite;
        }
      `}</style>

      <div
        style={{
          position:      "fixed",
          bottom:        "calc(env(safe-area-inset-bottom, 0px) + 4px)",
          left:          "16px",
          zIndex:        9999,

          /* Light corporate card */
          background:    "#FFFFFF",
          border:        "1px solid #DDE3EE",
          boxShadow:     "0 1px 6px rgba(30, 58, 138, 0.07)",

          /* Layout */
          display:       "flex",
          alignItems:    "center",
          gap:           "7px",
          padding:       "7px 12px",

          /* Non-interactive */
          pointerEvents: "none",
          userSelect:    "none",
        }}
      >
        {/* Blinking status dot */}
        <span
          className="pw-dot"
          style={{
            display:      "block",
            width:        "5px",
            height:       "5px",
            borderRadius: "50%",
            background:   "linear-gradient(135deg, #4C70F5, #10C090)",
            flexShrink:   0,
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize:      "9px",
            fontWeight:    "600",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "#94A3B8",
            fontFamily:    "'IBM Plex Sans', sans-serif",
            whiteSpace:    "nowrap",
            lineHeight:    1,
          }}
        >
          Powered by{" "}
          <span
            style={{
              color:         "#1E3A8A",
              fontWeight:    "800",
              letterSpacing: "0.18em",
            }}
          >
            NAFROK
          </span>
        </span>
      </div>
    </>
  );
}