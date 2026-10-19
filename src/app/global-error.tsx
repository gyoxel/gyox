"use client";

import { HTML_LANG } from "@/lib/i18n";
import { currentLang, currentT } from "@/lib/i18n/client";

// Last-resort boundary for errors in the root layout itself (outside the
// language provider: the language is read from its cookie).
export default function GlobalError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = currentT();
  return (
    <html lang={HTML_LANG[currentLang()]}>
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontWeight: 600, color: "#0f172a" }}>{t("Le serveur ne répond pas")}</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>{t("Vérifie ta connexion puis réessaie.")}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: "10px 18px", borderRadius: 12, border: 0, background: "#0f172a", color: "white", fontSize: 14 }}
          >
            {t("Réessayer")}
          </button>
          {error.digest && <p style={{ color: "#cbd5e1", fontSize: 11, marginTop: 12 }}>{t("Code : {code}", { code: error.digest })}</p>}
        </div>
      </body>
    </html>
  );
}
