"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/lib/types";
import { useRefreshData } from "@/lib/use-refresh-data";
import { cn, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface CategoryStats {
  /** Active expenses filed under it. */
  count: number;
  /** What they cost this month. */
  monthTotal: number;
}

/** Soft tile colors, cycled through the list. */
const TINTS = [
  "from-orange-100 to-amber-50 dark:from-orange-950/60 dark:to-amber-950/30",
  "from-sky-100 to-blue-50 dark:from-sky-950/60 dark:to-blue-950/30",
  "from-emerald-100 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/30",
  "from-violet-100 to-purple-50 dark:from-violet-950/60 dark:to-purple-950/30",
  "from-rose-100 to-pink-50 dark:from-rose-950/60 dark:to-pink-950/30",
  "from-lime-100 to-green-50 dark:from-lime-950/60 dark:to-green-950/30",
];

const EMOJIS = [
  "🍔", "🛒", "🏠", "🚗", "⛽", "💡", "📱", "🎬", "👕", "💊", "🎁", "✈️",
  "📚", "🐶", "💇", "🏋️", "☕", "🍕", "🧾", "🎮", "🛠️", "💼", "👶", "🏷️",
];

type Editing = { mode: "new" } | { mode: "edit"; category: Category };

/** Catégories: a grid of tiles (emoji, name, this month's spending); tap
 *  one to rename it, change its emoji, move it or delete it. */
export function CategoryManager({
  categories: initial,
  stats,
  monthLabel,
  currency,
}: {
  categories: Category[];
  stats: Record<string, CategoryStats>;
  monthLabel: string;
  currency: string;
}) {
  const refreshData = useRefreshData();
  const [categories, setCategories] = useState(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [emoji, setEmoji] = useState("🏷️");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const money = (n: number) => formatMoney(n, currency);
  const totalMonth = Object.values(stats).reduce((s, x) => s + x.monthTotal, 0);

  function open(next: Editing) {
    setEditing(next);
    setEmoji(next.mode === "edit" ? next.category.emoji : "🏷️");
    setName(next.mode === "edit" ? next.category.name : "");
  }

  async function submit() {
    if (!editing) return;
    const clean = { name: name.trim(), emoji: emoji.trim() || "🏷️" };
    if (!clean.name) return toast.error("Donne un nom à la catégorie.");
    setBusy(true);
    const res =
      editing.mode === "new"
        ? await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clean),
          })
        : await fetch(`/api/categories/${editing.category.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clean),
          });
    setBusy(false);
    if (!res.ok) return toast.error(editing.mode === "new" ? "Ajout impossible." : "Modification impossible.");
    const saved: Category = await res.json();
    if (editing.mode === "new") {
      // The server files it before Santé / Autres (kept last): take its order.
      const list = await fetch("/api/categories").then((r) => (r.ok ? (r.json() as Promise<Category[]>) : null));
      setCategories((prev) => list ?? [...prev, saved]);
    } else {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    }
    toast.success(editing.mode === "new" ? `${saved.emoji} ${saved.name} ajoutée.` : "Catégorie modifiée.");
    setEditing(null);
    void refreshData();
  }

  async function move(id: string, delta: -1 | 1) {
    const index = categories.findIndex((c) => c.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= categories.length) return;
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

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const res = await fetch(`/api/categories/${toDelete.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("Suppression impossible.");
    setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
    toast.success("Catégorie supprimée.");
    setToDelete(null);
    setEditing(null);
    void refreshData();
  }

  const editedIndex = editing?.mode === "edit" ? categories.findIndex((c) => c.id === editing.category.id) : -1;

  return (
    <>
      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 px-4 py-4 text-white shadow-sm">
        <p className="text-xs font-medium text-white/80">{categories.length} catégories</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums">{money(totalMonth)}</p>
        <p className="text-[11px] text-white/80">Dépenses classées · {monthLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {categories.map((c, i) => {
          const s = stats[c.id] ?? { count: 0, monthTotal: 0 };
          const share = totalMonth > 0 ? Math.round((s.monthTotal / totalMonth) * 100) : 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => open({ mode: "edit", category: c })}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border border-slate-200/70 bg-gradient-to-br p-3 text-left shadow-sm transition-transform active:scale-[0.97] dark:border-slate-800",
                TINTS[i % TINTS.length],
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-2xl shadow-sm dark:bg-slate-900/70">
                {c.emoji}
              </span>
              <span className="w-full">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{c.name}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {s.count === 0 ? "Aucune dépense" : s.count === 1 ? "1 dépense" : `${s.count} dépenses`}
                </span>
              </span>
              <span className="flex w-full items-baseline justify-between gap-1">
                <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {s.monthTotal > 0 ? money(s.monthTotal) : "—"}
                </span>
                {share > 0 && <span className="text-[11px] font-semibold text-slate-500">{share}%</span>}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => open({ mode: "new" })}
          className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition-colors active:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:active:bg-slate-900"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Ajouter</span>
        </button>
      </div>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.mode === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800">
                {emoji || "🏷️"}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="cat-name">Nom</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder="Ex: Restaurants"
                  maxLength={40}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Emoji</Label>
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-label={`Emoji ${e}`}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg text-xl transition-colors",
                      emoji === e ? "bg-violet-100 ring-2 ring-violet-500 dark:bg-violet-950" : "active:bg-slate-100 dark:active:bg-slate-800",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                aria-label="Autre emoji"
                placeholder="Ou tape un emoji"
                maxLength={8}
                className="text-center text-lg"
              />
            </div>

            {editing?.mode === "edit" && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Position</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => move(editing.category.id, -1)}
                    disabled={editedIndex <= 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Avant
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => move(editing.category.id, 1)}
                    disabled={editedIndex < 0 || editedIndex >= categories.length - 1}
                  >
                    Après
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button type="button" onClick={submit} disabled={busy} className="bg-violet-600 text-white hover:bg-violet-700">
              <Check className="h-4 w-4" />
              {editing?.mode === "new" ? "Ajouter" : "Enregistrer"}
            </Button>
            {editing?.mode === "edit" && (
              <Button type="button" variant="destructive" onClick={() => setToDelete(editing.category)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Supprimer la catégorie
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette catégorie ?"
        description={
          <>
            « {toDelete?.emoji} {toDelete?.name} » sera supprimée. Les dépenses de cette catégorie sont gardées, sans
            catégorie.
          </>
        }
        pending={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
