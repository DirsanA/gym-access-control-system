import Link from "next/link";
 
export default function Home() {
  return (
    <main className="scanner-shell">
      <section className="scanner-panel" style={{ minHeight: "min(620px, calc(100dvh - 44px))" }}>
        <div className="scanner-content">
          <div className="scanner-ready rise-in">
            <p className="status-label">NEXUS ATHLETIC CLUB</p>
            <h1 style={{ fontSize: "clamp(38px, 7vw, 64px)", lineHeight: ".96", letterSpacing: "-.065em", margin: "14px 0" }}>
              Gym management, built for the entrance.
            </h1>
            <p className="scanner-copy">The smart membership scanner is ready for the first member workflow.</p>
            <Link href="/scanner" className="scanner-form" style={{ display: "block", padding: 5, textDecoration: "none" }}>
              <span style={{ display: "block", padding: 14, borderRadius: 8, color: "#121a0a", background: "var(--lime)", fontSize: 11, fontWeight: 900, letterSpacing: ".08em" }}>
                OPEN ENTRANCE SCANNER
              </span>
            </Link>
            <Link href="/admin/members/new" style={{ display: "inline-block", marginTop: 15, color: "var(--lime)", fontSize: 11, fontWeight: 900, letterSpacing: ".08em" }}>
              OPEN ADMIN MEMBER REGISTRATION
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
