import Link from "next/link";
import { Crest } from "@/components/shared/Crest";

// Styled 404 in the Bridewell register (replaces Next's default).
export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
      <div style={{ maxWidth: 460, display: "grid", gap: 14, justifyItems: "center" }}>
        <Crest size={32} />
        <h1 className="bw-display" style={{ fontSize: 26, margin: 0 }}>Page not found</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          That page doesn&apos;t exist. Check the link, or head back to the start.
        </p>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <Link href="/" className="bw-btn-primary">Back to start</Link>
          <Link href="/join" className="bw-btn-secondary">Join a lesson</Link>
        </div>
      </div>
    </main>
  );
}
