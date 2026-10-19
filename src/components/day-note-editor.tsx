"use client";

import { useState } from "react";
import { Check, Trash } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { mutate } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/lib/i18n/client";

/** The free note of one calendar day: write, save, or delete (confirmed). */
export function DayNoteEditor({ date, text }: { date: string; text: string }) {
  const t = useT();
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const changed = draft.trim() !== text;

  async function save(value: string) {
    setSaving(true);
    const res = await mutate({ method: "PUT", path: `/api/day-notes/${date}`, body: { text: value } });
    setSaving(false);
    if (!res.ok) return toast.error(t("Note non enregistrée."));
    setConfirming(false);
    toast.success(value.trim() ? t("Note enregistrée.") : t("Note supprimée."));
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("Ajouter une note pour ce jour…")}
        maxLength={2000}
        rows={3}
      />
      {/* Emptying the note goes through "Supprimer" (confirmed), not a save. */}
      {((changed && draft.trim()) || text) && (
        <div className="flex gap-2">
          {text && (
            <Button type="button" variant="destructive" onClick={() => setConfirming(true)} disabled={saving}>
              <Trash weight="bold" className="h-4 w-4" />
              {t("Supprimer")}
            </Button>
          )}
          {changed && draft.trim() && (
            <Button type="button" className="flex-1" onClick={() => save(draft)} disabled={saving}>
              <Check weight="bold" className="h-4 w-4" />
              {saving ? t("Enregistrement…") : t("Enregistrer la note")}
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("Supprimer la note ?")}
        description={t("La note de ce jour sera supprimée.")}
        pending={saving}
        onConfirm={() => save("")}
      />
    </div>
  );
}
