"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
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

/** A tile keeps its color while it moves: picked from its id. */
function tintOf(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

const EMOJIS = [
  "🍔", "🛒", "🏠", "🚗", "⛽", "💡", "📱", "🎬", "👕", "💊", "🎁", "✈️",
  "📚", "🐶", "💇", "🏋️", "☕", "🍕", "🧾", "🎮", "🛠️", "💼", "👶", "🏷️",
];

type Editing = { mode: "new" } | { mode: "edit"; category: Category };

/** Catégories: a grid of tiles (emoji, name, this month's spending); tap
 *  one to rename it, change its emoji or delete it; hold and drag one to
 *  reorder, then "Enregistrer l'ordre". */
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
      const nextList = list ?? [...categories, saved];
      setCategories(nextList);
      setSavedOrder(nextList.map((c) => c.id));
    } else {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    }
    toast.success(editing.mode === "new" ? `${saved.emoji} ${saved.name} ajoutée.` : "Catégorie modifiée.");
    setEditing(null);
    void refreshData();
  }

  // ---- Reorder (like app icons on a phone): hold a tile, it lifts and
  // follows the finger above the others; the others slide out of its way;
  // let go and it drops into its new place. Then "Enregistrer l'ordre". ----
  const [savedOrder, setSavedOrder] = useState(() => initial.map((c) => c.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /** The lifted copy that follows the finger (fixed position, px). */
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; h: number; dropping: boolean } | null>(null);
  const press = useRef<{
    id: string;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const dragging = useRef<string | null>(null);
  const justDragged = useRef(false);
  const tileRefs = useRef(new Map<string, HTMLElement>());
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  // Latest list for the auto-scroll loop (which outlives a render).
  const categoriesRef = useRef(categories);
  useLayoutEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  const prevRects = useRef<Map<string, DOMRect> | null>(null);
  const orderChanged = categories.map((c) => c.id).join() !== savedOrder.join();

  // While dragging, the page must not scroll under the finger.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  // The tiles that moved slide from their old place to the new one.
  useLayoutEffect(() => {
    const before = prevRects.current;
    prevRects.current = null;
    if (!before) return;
    for (const [id, el] of tileRefs.current) {
      const old = before.get(id);
      if (!old || id === dragging.current) continue;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
        duration: 220,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      });
    }
  }, [categories]);

  function onPointerDown(e: React.PointerEvent<HTMLElement>, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (ghost) return;
    justDragged.current = false; // a drag's flag never outlives the next press
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.pointerType === "mouse") e.currentTarget.setPointerCapture(e.pointerId);
    const timer = setTimeout(() => {
      const p = press.current;
      if (!p) return;
      dragging.current = id;
      setDraggingId(id);
      setGhost({ x: p.lastX - p.offsetX, y: p.lastY - p.offsetY, w: p.w, h: p.h, dropping: false });
      navigator.vibrate?.(15);
      requestAnimationFrame(autoScroll);
    }, 320);
    press.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
      timer,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = press.current;
    if (!p) return;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    if (!dragging.current) {
      // Moved before the hold: it's a scroll, not a drag.
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) cancelPress();
      return;
    }
    dragAt(e.clientX, e.clientY);
  }

  /** The lifted tile follows the finger; the tile under it makes room. */
  function dragAt(x: number, y: number) {
    const p = press.current;
    const id = dragging.current;
    if (!p || !id) return;
    // Moved straight in the DOM: re-rendering the whole grid on every
    // finger move made the drag lag.
    const ghostEl = ghostRef.current;
    if (ghostEl) {
      ghostEl.style.left = `${x - p.offsetX}px`;
      ghostEl.style.top = `${y - p.offsetY}px`;
    }
    // Hit-test against the tiles' layout slots, not where they're drawn: a
    // tile still sliding out of the way must not be swapped straight back
    // (that flip-flop made tiles jump back and forth). A small inner margin
    // keeps a hover on the edge between two tiles from swapping.
    const overId = slotUnder(x, y);
    if (!overId || overId === id) return;
    const list = categoriesRef.current;
    const from = list.findIndex((c) => c.id === id);
    const to = list.findIndex((c) => c.id === overId);
    if (from < 0 || to < 0) return;
    prevRects.current = new Map([...tileRefs.current].map(([tid, el]) => [tid, el.getBoundingClientRect()]));
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    categoriesRef.current = next;
    setCategories(next);
  }

  /** Holding the tile near the top or bottom of the screen scrolls the
   *  page (faster the closer to the edge), so it can go anywhere. */
  function autoScroll() {
    const p = press.current;
    if (!p || !dragging.current) return;
    const top = 120; // under the header
    const bottom = window.innerHeight - 150; // above the bottom bar
    let speed = 0;
    if (p.lastY < top) speed = -Math.min(18, 4 + (top - p.lastY) / 6);
    else if (p.lastY > bottom) speed = Math.min(18, 4 + (p.lastY - bottom) / 6);
    if (speed !== 0) {
      const before = window.scrollY;
      window.scrollBy(0, speed);
      if (window.scrollY !== before) dragAt(p.lastX, p.lastY);
    }
    requestAnimationFrame(autoScroll);
  }

  function slotUnder(x: number, y: number): string | null {
    const grid = gridRef.current;
    if (!grid) return null;
    const g = grid.getBoundingClientRect();
    for (const [id, el] of tileRefs.current) {
      const left = g.left + el.offsetLeft;
      const top = g.top + el.offsetTop;
      const mx = el.offsetWidth * 0.15;
      const my = el.offsetHeight * 0.15;
      if (x > left + mx && x < left + el.offsetWidth - mx && y > top + my && y < top + el.offsetHeight - my) return id;
    }
    return null;
  }

  function endPress() {
    const id = dragging.current;
    if (!id) return cancelPress();
    justDragged.current = true;
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    // Drop: the lifted tile glides into its slot, then lands.
    const el = tileRefs.current.get(id);
    const g = gridRef.current?.getBoundingClientRect();
    const slot = el && g ? { left: g.left + el.offsetLeft, top: g.top + el.offsetTop } : null;
    if (slot) setGhost((gh) => (gh ? { ...gh, x: slot.left, y: slot.top, dropping: true } : gh));
    setTimeout(() => {
      dragging.current = null;
      setDraggingId(null);
      setGhost(null);
    }, slot ? 180 : 0);
  }

  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    dragging.current = null;
    setDraggingId(null);
    setGhost(null);
  }

  async function saveOrder() {
    setBusy(true);
    const ids = categories.map((c) => c.id);
    const res = await fetch("/api/categories/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Réorganisation impossible.");
    setSavedOrder(ids);
    toast.success("Ordre enregistré.");
    void refreshData();
  }

  function resetOrder() {
    setCategories((prev) => savedOrder.map((id) => prev.find((c) => c.id === id)).filter((c): c is Category => c != null));
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const res = await fetch(`/api/categories/${toDelete.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("Suppression impossible.");
    setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
    setSavedOrder((prev) => prev.filter((id) => id !== toDelete.id));
    toast.success("Catégorie supprimée.");
    setToDelete(null);
    setEditing(null);
    void refreshData();
  }


  function tileContent(c: Category) {
    const st = stats[c.id] ?? { count: 0, monthTotal: 0 };
    const share = totalMonth > 0 ? Math.round((st.monthTotal / totalMonth) * 100) : 0;
    return (
      <>
        {/* Icon, with the name and count on its right */}
        <span className="flex w-full items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm dark:bg-slate-900/70">
            {c.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{c.name}</span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {st.count === 0 ? "Aucune dépense" : st.count === 1 ? "1 dépense" : `${st.count} dépenses`}
            </span>
          </span>
        </span>
        <span className="flex w-full items-baseline justify-between gap-1">
          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {st.monthTotal > 0 ? money(st.monthTotal) : "—"}
          </span>
          {share > 0 && <span className="text-[11px] font-semibold text-slate-500">{share}%</span>}
        </span>
      </>
    );
  }

  const ghostCategory = ghost && draggingId ? categories.find((c) => c.id === draggingId) : null;

  return (
    <>
      {/* The lifted tile, following the finger above the others */}
      {ghost && ghostCategory && (
        <div
          ref={ghostRef}
          aria-hidden
          className={cn(
            "pointer-events-none fixed z-50 flex flex-col gap-2.5 rounded-2xl border border-white/60 bg-gradient-to-br p-3 shadow-2xl ring-2 ring-violet-500/70 dark:border-slate-700",
            tintOf(ghostCategory.id),
            ghost.dropping ? "transition-[left,top,transform] duration-150 ease-out" : "",
          )}
          style={{
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            height: ghost.h,
            transform: ghost.dropping ? "none" : "scale(1.08) rotate(-2deg)",
          }}
        >
          {tileContent(ghostCategory)}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 px-4 py-4 text-white shadow-sm">
        <p className="text-xs font-medium text-white/80">{categories.length} catégories</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums">{money(totalMonth)}</p>
        <p className="text-[11px] text-white/80">Dépenses classées · {monthLabel}</p>
      </div>

      <p className="-mb-2 px-1 text-[11px] text-slate-400">
        Touche une catégorie pour la modifier · maintiens-la puis glisse-la pour changer l&apos;ordre.
      </p>

      {/* relative: the tiles' offsetLeft/Top are measured from the grid */}
      <div ref={gridRef} className="relative grid grid-cols-2 gap-2.5">
        {categories.map((c, i) => {
          const isDragged = draggingId === c.id;
          return (
            <button
              key={c.id}
              ref={(el) => {
                if (el) tileRefs.current.set(c.id, el);
                else tileRefs.current.delete(c.id);
              }}
              type="button"
              data-cat-id={c.id}
              onPointerDown={(e) => onPointerDown(e, c.id)}
              onPointerMove={onPointerMove}
              onPointerUp={endPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (justDragged.current) {
                  justDragged.current = false;
                  return;
                }
                open({ mode: "edit", category: c });
              }}
              style={draggingId && !isDragged ? { animationDelay: `${(i % 3) * -90}ms` } : undefined}
              className={cn(
                "flex select-none flex-col gap-2.5 rounded-2xl border p-3 text-left [-webkit-touch-callout:none]",
                isDragged
                  ? // Its empty slot while it's lifted.
                    "border-2 border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-700 dark:bg-violet-950/20"
                  : cn(
                      "border-slate-200/70 bg-gradient-to-br shadow-sm transition-transform duration-150 active:scale-[0.97] dark:border-slate-800",
                      tintOf(c.id),
                      draggingId && "animate-[cat-wiggle_0.32s_ease-in-out_infinite]",
                    ),
              )}
            >
              <span className={cn("contents", isDragged && "invisible")}>{tileContent(c)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => open({ mode: "new" })}
          className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition-colors active:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:active:bg-slate-900"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Ajouter</span>
        </button>
      </div>

      {orderChanged && !draggingId && (
        <div className="sticky bottom-28 z-20 flex gap-2 rounded-2xl border border-violet-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-violet-900 dark:bg-slate-900/95">
          <Button type="button" variant="outline" className="flex-1" onClick={resetOrder} disabled={busy}>
            <RotateCcw className="h-4 w-4" />
            Annuler
          </Button>
          <Button type="button" className="flex-1 bg-violet-600 text-white hover:bg-violet-700" onClick={saveOrder} disabled={busy}>
            <Check className="h-4 w-4" />
            Enregistrer l&apos;ordre
          </Button>
        </div>
      )}

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
