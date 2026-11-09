import { ImageResponse } from "next/og";
export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#142c46",
        color: "white",
        flexDirection: "column",
        padding: 80,
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 42, color: "#9bbfff", marginBottom: 36 }}>
        NIHONPATH
      </div>
      <div style={{ fontSize: 76, fontWeight: 700 }}>
        Your path to Japanese.
      </div>
      <div style={{ fontSize: 36, marginTop: 32 }}>
        A worldwide community of learners.
      </div>
      <div style={{ fontSize: 28, color: "#c8d9f2", marginTop: 50 }}>
        Learn · Practice · Prepare for Japan
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
