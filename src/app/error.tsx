"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Remembered across boundary re-renders: up to 3 quiet retries with growing
// delays per failure streak (a streak resets after 30s), so a database that
// takes a few seconds to wake up recovers on its own — without looping.
const AUTO_RETRY_DELAYS = [1500, 3000, 5000];
let streakStartedAt = 0;
let autoRetriesUsed = 0;

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // Decided once per error (a boundary can stay mounted across retries, so
  // this is re-evaluated whenever a new error arrives). Most failures are
  // the database waking up after a pause: quietly retry a few times first.
  const [seenError, setSeenError] = useState<Error | null>(null);
  const [autoDelay, setAutoDelay] = useState<number | null>(null);
  if (error !== seenError) {
    setSeenError(error);
    setAutoDelay(nextAutoRetryDelay());
  }
  const autoRetry = autoDelay != null;
  const [manualRetry, setManualRetry] = useState(false);
  const retrying = autoRetry || manualRetry;
  const diagnosis = useDiagnosis(!retrying);

  useEffect(() => {
    console.error(error);
    if (autoDelay == null) return;
    const timer = setTimeout(() => retry(), autoDelay);
    return () => clearTimeout(timer);
  }, [error, retry, autoDelay]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <RefreshCw className={retrying ? "h-8 w-8 animate-spin text-[#019c86]" : "h-8 w-8 text-slate-400"} />
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-white">
          {retrying ? "Connexion au serveur…" : "Le serveur ne répond pas"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {retrying ? "Un instant, on réessaie." : "Vérifie ta connexion puis réessaie."}
        </p>
      </div>
      {!retrying && (
        <Button
          type="button"
          onClick={() => {
            setManualRetry(true);
            retry();
          }}
        >
          Réessayer
        </Button>
      )}
      {!retrying && diagnosis && (
        <p className="max-w-sm text-xs break-words text-slate-500 select-text">{diagnosis}</p>
      )}
      {error.digest && <p className="text-[11px] text-slate-300">Code : {error.digest}</p>}
    </main>
  );
}

function nextAutoRetryDelay(): number | null {
  if (Date.now() - streakStartedAt > 30_000) {
    streakStartedAt = Date.now();
    autoRetriesUsed = 0;
  }
  if (autoRetriesUsed >= AUTO_RETRY_DELAYS.length) return null;
  return AUTO_RETRY_DELAYS[autoRetriesUsed++];
}

/** Once the automatic retries are over, asks /api/health what actually
 *  fails (production pages only expose an opaque code) and shows it. */
function useDiagnosis(enabled: boolean): string | null {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (body?.ok) setDiagnosis("Diagnostic : la base de données répond normalement.");
        else if (body) setDiagnosis(`Diagnostic (${body.step}) : ${body.message}`);
        else setDiagnosis(`Diagnostic : réponse ${res.status} du serveur.`);
      })
      .catch(() => !cancelled && setDiagnosis("Diagnostic : serveur injoignable (connexion internet ?)."));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return diagnosis;
}
