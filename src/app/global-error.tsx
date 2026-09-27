"use client";

// Last-resort boundary for errors in the root layout itself.
export default function GlobalError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontWeight: 600, color: "#0f172a" }}>Le serveur ne répond pas</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>Vérifie ta connexion puis réessaie.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: "10px 18px", borderRadius: 12, border: 0, background: "#0f172a", color: "white", fontSize: 14 }}
          >
            Réessayer
          </button>
          {error.digest && <p style={{ color: "#cbd5e1", fontSize: 11, marginTop: 12 }}>Code : {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
