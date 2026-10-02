"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";

/** The free note of one calendar day: write, save, or delete (confirmed). */
export function DayNoteEditor({ date, text }: { date: string; text: string }) {
  const refreshData = useRefreshData();
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const changed = draft.trim() !== text;

  async function save(value: string) {
    setSaving(true);
    const res = await fetch(`/api/day-notes/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Note non enregistrée.");
    setConfirming(false);
    toast.success(value.trim() ? "Note enregistrée." : "Note supprimée.");
    await refreshData();
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ajouter une note pour ce jour…"
        maxLength={2000}
        rows={3}
      />
      {/* Emptying the note goes through "Supprimer" (confirmed), not a save. */}
      {((changed && draft.trim()) || text) && (
        <div className="flex gap-2">
          {text && (
            <Button type="button" variant="destructive" onClick={() => setConfirming(true)} disabled={saving}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
          {changed && draft.trim() && (
            <Button type="button" className="flex-1" onClick={() => save(draft)} disabled={saving}>
              <Check className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer la note"}
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Supprimer la note ?"
        description="La note de ce jour sera supprimée."
        pending={saving}
        onConfirm={() => save("")}
      />
    </div>
  );
}
