"use client";

import { useState, useTransition } from "react";
import { useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteExpenseButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nav = useNavBack();
  const refreshData = useRefreshData();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("La suppression a échoué. Réessayez.");
        return;
      }
      setOpen(false);
      await refreshData();
      nav.back();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Supprimer
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer cette dépense ?</DialogTitle>
          <DialogDescription>
            « {name} » sera définitivement supprimée. Le budget, les prévisions et les crédits liés seront
            recalculés automatiquement.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
