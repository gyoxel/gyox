"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/lib/types";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Réglages: add, rename, change emoji, reorder and delete categories. */
export function CategoryManager({ categories: initial }: { categories: Category[] }) {
  const refreshData = useRefreshData();
  const [categories, setCategories] = useState(initial);
  const [newEmoji, setNewEmoji] = useState("🏷️");
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped to remount the (uncontrolled) inputs, e.g. to undo a blank edit.
  const [resetTick, setResetTick] = useState(0);

  async function save(id: string, patch: { name?: string; emoji?: string }) {
    const current = categories.find((c) => c.id === id);
    if (!current) return;
    const next = { name: patch.name?.trim(), emoji: patch.emoji?.trim() };
    if ((next.name !== undefined && !next.name) || (next.emoji !== undefined && !next.emoji)) {
      // Empty value: restore the saved one instead of saving a blank.
      setResetTick((t) => t + 1);
      return;
    }
    if ((next.name ?? current.name) === current.name && (next.emoji ?? current.emoji) === current.emoji) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) return toast.error("Modification impossible.");
    const updated: Category = await res.json();
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    void refreshData();
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    const previous = categories;
    setCategories(next);
    const res = await fetch("/api/categories/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    });
    if (!res.ok) {
      setCategories(previous);
      return toast.error("Réorganisation impossible.");
    }
    void refreshData();
  }

  async function add() {
    if (!newName.trim()) return toast.error("Donne un nom à la catégorie.");
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim() || "🏷️" }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Ajout impossible.");
    const created: Category = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName("");
    setNewEmoji("🏷️");
    void refreshData();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const res = await fetch(`/api/categories/${toDelete.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("Suppression impossible.");
    setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
    setToDelete(null);
    void refreshData();
  }

  // Inputs are uncontrolled (defaultValue) and saved on blur; the key
  // includes the saved values so a reset/rename re-renders them.
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Catégories</h2>
        <div className="flex flex-col gap-2">
          {categories.map((c, i) => (
            <div key={`${c.id}:${c.name}:${c.emoji}:${resetTick}`} className="flex items-center gap-2">
              <Input
                defaultValue={c.emoji}
                aria-label={`Emoji de ${c.name}`}
                maxLength={8}
                onBlur={(e) => save(c.id, { emoji: e.target.value })}
                className="w-12 shrink-0 px-1 text-center text-lg"
              />
              <Input
                defaultValue={c.name}
                aria-label={`Nom de ${c.name}`}
                maxLength={40}
                onBlur={(e) => save(c.id, { name: e.target.value })}
                className="min-w-0 flex-1"
              />
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter ${c.name}`}
                  className="flex h-5 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === categories.length - 1}
                  aria-label={`Descendre ${c.name}`}
                  className="flex h-5 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setToDelete(c)}
                aria-label={`Supprimer ${c.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Input
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            aria-label="Emoji de la nouvelle catégorie"
            maxLength={8}
            className="w-12 shrink-0 px-1 text-center text-lg"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Nouvelle catégorie"
            maxLength={40}
            className="min-w-0 flex-1"
          />
          <Button type="button" size="sm" onClick={add} disabled={busy}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardContent>

      <Dialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette catégorie ?</DialogTitle>
            <DialogDescription>
              « {toDelete?.emoji} {toDelete?.name} » sera supprimée. Les dépenses de cette catégorie sont gardées, sans
              catégorie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={busy}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
