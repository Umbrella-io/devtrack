import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const login = searchParams.get("login") || "Developer";
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const commits = searchParams.get("commits") || "0";
    const prs = searchParams.get("prs") || "0";
    const language = searchParams.get("language") || "Code";
    const streak = searchParams.get("streak") || "0";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#09090b",
            fontFamily: "sans-serif",
            color: "white",
            padding: "40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "40px" }}>
            <h1 style={{ fontSize: "60px", fontWeight: "bold", margin: 0, color: "#a855f7" }}>
              {year} Year in Code
            </h1>
            <p style={{ fontSize: "30px", color: "#a1a1aa", marginTop: "10px" }}>
              @{login}&apos;s DevTrack Recap
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#18181b", padding: "24px", borderRadius: "16px", minWidth: "250px" }}>
              <span style={{ fontSize: "20px", color: "#a1a1aa" }}>Total Commits</span>
              <span style={{ fontSize: "48px", fontWeight: "bold", color: "#e879f9" }}>{commits}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#18181b", padding: "24px", borderRadius: "16px", minWidth: "250px" }}>
              <span style={{ fontSize: "20px", color: "#a1a1aa" }}>PRs Merged</span>
              <span style={{ fontSize: "48px", fontWeight: "bold", color: "#38bdf8" }}>{prs}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#18181b", padding: "24px", borderRadius: "16px", minWidth: "250px" }}>
              <span style={{ fontSize: "20px", color: "#a1a1aa" }}>Top Language</span>
              <span style={{ fontSize: "48px", fontWeight: "bold", color: "#4ade80" }}>{language}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#18181b", padding: "24px", borderRadius: "16px", minWidth: "250px" }}>
              <span style={{ fontSize: "20px", color: "#a1a1aa" }}>Longest Streak</span>
              <span style={{ fontSize: "48px", fontWeight: "bold", color: "#facc15" }}>{streak} days</span>
            </div>
          </div>
          
          <div style={{ position: "absolute", bottom: "30px", right: "40px", fontSize: "24px", color: "#52525b" }}>
            devtrack.com/wrapped
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
