export default function PoweredBy() {
  return (
    <div
      style={{
        position:       "fixed",
        bottom:         "16px",
        left:           "16px",
        zIndex:         9999,

        /* Glassmorphism */
        background:     "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:         "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius:   "8px",

        /* Layout */
        display:        "flex",
        alignItems:     "center",
        gap:            "7px",
        padding:        "7px 12px",

        /* Don't block taps beneath it */
        pointerEvents:  "none",
        userSelect:     "none",
      }}
    >
      {/* Dot accent */}
      <span
        style={{
          width:        "5px",
          height:       "5px",
          borderRadius: "50%",
          background:   "linear-gradient(135deg, #4C70F5, #10C090)",
          flexShrink:   0,
        }}
      />

      {/* Text */}
      <span
        style={{
          fontSize:      "9px",
          fontWeight:    "600",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color:         "rgba(255, 255, 255, 0.30)",
          fontFamily:    "'IBM Plex Sans', sans-serif",
          whiteSpace:    "nowrap",
          lineHeight:    1,
        }}
      >
        Powered by{" "}
        <span
          style={{
            color:      "rgba(255, 255, 255, 0.70)",
            fontWeight: "800",
            letterSpacing: "0.18em",
          }}
        >
          NAFROK
        </span>
      </span>
    </div>
  );
}