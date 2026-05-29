"use client";

import { QRCodeSVG } from "qrcode.react";

// A scannable QR for the pupil join URL. Always rendered on a solid white
// card with navy modules so it scans reliably on both the light wizard
// surface and the dark projector display. navy900 = #0D2A4A (brand token).
export function JoinQR({
  url,
  size = 96,
  label,
}: {
  url: string;
  size?: number;
  label?: string;
}) {
  if (!url) return null;
  const pad = Math.round(size * 0.1);
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: pad,
          borderRadius: 10,
          lineHeight: 0,
          boxShadow: "0 1px 3px rgba(13,42,74,0.18)",
        }}
      >
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0D2A4A"
          marginSize={0}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.65,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
