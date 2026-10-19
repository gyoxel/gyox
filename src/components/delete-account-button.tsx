"use client";

import { useState } from "react";
import { DownloadSimple, Trash } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { forgetDeviceData } from "@/lib/forget-device-data";
import { localizeMessage } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

/**
 * Supprimer mon compte: everything goes, for good. The sheet offers the
 * export first, and the word SUPPRIMER (in the device's language) must be
 * typed before the button works.
 */
export function DeleteAccountButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = t("SUPPRIMER");
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();

  async function remove() {
    if (!confirmed) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }).catch(() => null);
    if (!res?.ok) {
      const message = res ? ((await res.json().catch(() => null))?.error ?? "Erreur serveur.") : "Connexion impossible. Réessaie.";
      setError(localizeMessage(message, t));
      setPending(false);
      return;
    }
    await forgetDeviceData();
    window.location.replace("/connexion?compte=supprime");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setError(null);
          setOpen(true);
        }}
        className="mx-auto flex items-center gap-1.5 py-1 text-xs font-medium text-rose-500 underline underline-offset-2 active:text-rose-700 dark:text-rose-400"
      >
        <Trash weight="bold" className="h-3.5 w-3.5" />
        {t("Supprimer mon compte")}
      </button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("Supprimer ton compte ?")}</DialogTitle>
            <DialogDescription>
              {t(
                "Ton compte et toutes tes données (dépenses, dettes, revenus, darets, argent prêté, épargne, objectifs, notes…) seront supprimés pour toujours. On ne pourra pas les récupérer.",
              )}
            </DialogDescription>
          </DialogHeader>
          <a
            href="/api/export"
            download
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:active:bg-slate-800"
          >
            <DownloadSimple weight="bold" className="h-4 w-4" />
            {t("Télécharger mes données d'abord")}
          </a>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="delete-confirm" className="text-sm text-slate-600 dark:text-slate-300">
              {t("Pour confirmer, écris {word} :", { word })}
            </label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={word}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => setOpen(false)}>
              {t("Annuler")}
            </Button>
            <Button type="button" variant="destructive" className="flex-1" disabled={!confirmed || pending} onClick={remove}>
              <Trash weight="bold" className="h-4 w-4" />
              {pending ? t("Suppression…") : t("Supprimer")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
