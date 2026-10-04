"use client";

import { useState, useTransition } from "react";
import { pagesGone, useNavBack } from "@/lib/nav-history";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

/** Bottom of a goal's detail page: delete it, after confirmation. */
export function DeleteGoalButton({ id, label }: { id: string; label: string }) {
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      const gone = await pagesGone(res);
      setOpen(false);
      await refreshData();
      toast.success("Objectif supprimé.");
      nav.leave(gone, "/goals");
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" className="w-full" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Supprimer l&apos;objectif
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Supprimer cet objectif ?"
        description={<>« {label} » et tous ses versements seront supprimés. Tes darets ne sont pas touchées.</>}
        pending={isPending}
        onConfirm={remove}
      />
    </>
  );
}
