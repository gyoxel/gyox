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
      {/* One horizontal scroller holding two rows: a single swipe moves both
          rows together. Native momentum scrolling, no snap, for a light feel. */}
      <div
        ref={rowRef}
        role="radiogroup"
        aria-label="Catégorie"
        className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1"
      >
        <div className="flex w-max flex-col gap-2">
          {splitInTwo([...categories.map((c) => ({ kind: "category" as const, category: c })), { kind: "add" as const }]).map(
            (row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {row.map((chip) =>
                  chip.kind === "add" ? (
                    <button
                      key="add"
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-sm whitespace-nowrap text-slate-500 active:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  ) : (
                    <button
                      key={chip.category.id}
                      type="button"
                      role="radio"
                      aria-checked={chip.category.id === value}
                      data-id={chip.category.id}
                      onClick={() => onChange(chip.category.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap",
                        chip.category.id === value
                          ? "border-[#019c86] bg-[#019c86]/10 font-semibold text-[#007261] dark:text-teal-300"
                          : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                      )}
                    >
                      <span className="text-base leading-none">{chip.category.emoji}</span>
                      {chip.category.name}
                    </button>
                  ),
                )}
              </div>
            ),
          )}
        </div>
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

/** First half on the top row, second half on the bottom row (reading order
 *  follows the order set in Réglages). */
function splitInTwo<T>(items: T[]): [T[], T[]] {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}
