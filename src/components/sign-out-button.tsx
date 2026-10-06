"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { forgetDeviceData } from "@/lib/forget-device-data";

/** Signs out, forgetting what this device kept of the account's data. */
export async function signOut(): Promise<void> {
  await forgetDeviceData();
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  window.location.replace("/connexion");
}

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3.5 text-[15px] font-semibold text-rose-600 shadow-sm transition-transform active:scale-[0.98] dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Déconnexion
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Se déconnecter ?"
        description="Tes données restent enregistrées : tu les retrouves en te reconnectant avec Google."
        confirmLabel="Déconnexion"
        pending={pending}
        onConfirm={() => {
          setPending(true);
          void signOut();
        }}
      />
    </>
  );
}
