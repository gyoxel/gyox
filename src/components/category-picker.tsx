"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Swipeable row of category chips; the last chip adds a new category. */
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreated,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  onCreated: (category: Category) => void;
}) {
  const refreshData = useRefreshData();
  const rowRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [emoji, setEmoji] = useState("🏷️");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Keep the selected chip visible (e.g. a preselected or newly added one).
  useEffect(() => {
    if (!value || !rowRef.current) return;
    const chip = rowRef.current.querySelector<HTMLElement>(`[data-id="${value}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  async function create() {
    setError(null);
    if (!name.trim()) {
      setError("Donne un nom à la catégorie.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), emoji: emoji.trim() || "🏷️" }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Impossible d'ajouter la catégorie.");
      return;
    }
    const category: Category = await res.json();
    onCreated(category);
    onChange(category.id);
    setAdding(false);
    setName("");
    setEmoji("🏷️");
    void refreshData();
  }

  return (
    <>
      <div
        ref={rowRef}
        role="radiogroup"
        aria-label="Catégorie"
        className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1"
      >
        {categories.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-id={c.id}
              onClick={() => onChange(c.id)}
              className={cn(
                "flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition-colors",
                selected
                  ? "border-[#019c86] bg-[#019c86]/10 font-semibold text-[#007261] dark:text-teal-300"
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              <span className="text-base leading-none">{c.emoji}</span>
              {c.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-sm whitespace-nowrap text-slate-500 active:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3">
            <div className="flex w-20 flex-col gap-1.5">
              <Label htmlFor="new-cat-emoji">Emoji</Label>
              <Input
                id="new-cat-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={8}
                className="text-center text-lg"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="new-cat-name">Nom</Label>
              <Input
                id="new-cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Cadeaux"
                maxLength={40}
                autoFocus
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={create} disabled={saving}>
              {saving ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
