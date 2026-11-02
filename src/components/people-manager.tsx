"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, DotsSixVertical, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react/ssr";
import { useT } from "@/lib/i18n/client";
import { mutate } from "@/lib/use-refresh-data";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Row {
  id: string;
  name: string;
  /** Debts / loans going by this name. */
  debts: number;
  loans: number;
}

const ICON = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 disabled:opacity-25 dark:active:bg-slate-800";

/**
 * Personnes: add someone, rename (✎), hold one and drag it to reorder (saved
 * once dropped, as in Catégories), remove (asked first). Only the list of
 * names: no debt or loan changes.
 */
export function PeopleManager({ people }: { people: Row[] }) {
  const t = useT();
  const [order, setOrder] = useState<string[] | null>(null);
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();
  // A move shows at once; the page's own list takes over once saved.
  const byId = new Map(people.map((p) => [p.id, p]));
  const rows = order ? order.map((id) => byId.get(id)).filter((p): p is Row => p != null) : people;

  function run(call: Parameters<typeof mutate>[0], done?: () => void) {
    startTransition(async () => {
      const res = await mutate(call);
      if (!res.ok) return void toast.error(await errorMessage(res));
      done?.();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = adding.trim();
    if (!name) return;
    if (people.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) return void toast.error(t("Ce nom est déjà dans la liste."));
    run({ method: "POST", path: "/api/people", body: { name } }, () => {
      setAdding("");
      setOrder(null);
    });
  }

  // ---- Hold a row, drag it up or down, let go: the others slide out of its way. ----
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const press = useRef<{ id: string; startY: number; lastY: number; grabY: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragging = useRef<string | null>(null);
  const justDragged = useRef(false);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const prevRects = useRef<Map<string, number> | null>(null);
  const idsRef = useRef<string[]>([]);
  const rowIds = rows.map((p) => p.id).join();
  useLayoutEffect(() => {
    idsRef.current = rowIds ? rowIds.split(",") : [];
  }, [rowIds]);

  // While dragging, the page must not scroll under the finger.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  /** The lifted row stays under the finger, wherever its slot now is. */
  function follow() {
    const p = press.current;
    const id = dragging.current;
    const el = id ? rowRefs.current.get(id) : null;
    const list = listRef.current;
    if (!p || !el || !list) return;
    el.style.transform = `translateY(${p.lastY - p.grabY - (list.getBoundingClientRect().top + el.offsetTop)}px) scale(1.02)`;
  }

  // The rows that moved slide from their old place to the new one.
  useLayoutEffect(() => {
    const before = prevRects.current;
    prevRects.current = null;
    if (!before) return;
    for (const [id, el] of rowRefs.current) {
      const old = before.get(id);
      if (old == null || id === dragging.current) continue;
      const dy = old - el.offsetTop;
      if (Math.abs(dy) >= 1) el.animate([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    }
    follow();
  }, [order]);


  function onPointerDown(e: React.PointerEvent<HTMLLIElement>, id: string) {
    if ((e.pointerType === "mouse" && e.button !== 0) || editing || pending) return;
    if ((e.target as Element).closest("button:not([data-row]), input")) return;
    justDragged.current = false;
    if (e.pointerType === "mouse") e.currentTarget.setPointerCapture(e.pointerId);
    const grabY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const timer = setTimeout(() => {
      if (!press.current) return;
      dragging.current = id;
      setDraggingId(id);
      navigator.vibrate?.(15);
    }, 320);
    press.current = { id, startY: e.clientY, lastY: e.clientY, grabY, timer };
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = press.current;
    if (!p) return;
    p.lastY = e.clientY;
    if (!dragging.current) {
      // Moved before the hold: a scroll, not a drag.
      if (Math.abs(e.clientY - p.startY) > 8) cancelPress();
      return;
    }
    const id = dragging.current;
    follow();
    // The row whose slot (its middle half) is under the finger — by the
    // rows' layout places, not where they're drawn: one still sliding out
    // of the way mustn't be swapped straight back.
    const list = listRef.current;
    if (!list) return;
    const top = list.getBoundingClientRect().top;
    let over: string | null = null;
    for (const [rid, r] of rowRefs.current) {
      const y = top + r.offsetTop;
      if (e.clientY > y + r.offsetHeight * 0.25 && e.clientY < y + r.offsetHeight * 0.75) over = rid;
    }
    if (!over || over === id) return;
    const ids = [...idsRef.current];
    const from = ids.indexOf(id);
    const to = ids.indexOf(over);
    if (from < 0 || to < 0) return;
    prevRects.current = new Map([...rowRefs.current].map(([rid, r]) => [rid, r.offsetTop]));
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    idsRef.current = ids;
    setOrder(ids);
  }

  function endPress() {
    const id = dragging.current;
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    if (!id) return;
    justDragged.current = true;
    dragging.current = null;
    setDraggingId(null);
    // Dropped: it glides into its slot.
    const el = rowRefs.current.get(id);
    if (el) {
      const from = el.style.transform;
      el.style.transform = "";
      if (from) el.animate([{ transform: from }, { transform: "none" }], { duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    }
    const ids = idsRef.current;
    if (ids.join() !== people.map((p) => p.id).join()) run({ method: "PUT", path: "/api/people/order", body: { ids } });
  }

  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    const id = dragging.current;
    press.current = null;
    dragging.current = null;
    setDraggingId(null);
    const el = id ? rowRefs.current.get(id) : null;
    if (el) el.style.transform = "";
  }

  function saveName() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    run({ method: "PATCH", path: `/api/people/${editing.id}`, body: { name } }, () => setEditing(null));
  }

  const usedLabel = (p: Row) =>
    [
      p.debts > 0 && (p.debts === 1 ? t("1 dette") : t("{n} dettes", { n: p.debts })),
      p.loans > 0 && (p.loans === 1 ? t("1 prêt") : t("{n} prêts", { n: p.loans })),
    ]
      .filter(Boolean)
      .join(" · ") || t("Aucune dette ni prêt");

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex gap-2">
        <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={t("Nom : Karim, Sara…")} maxLength={60} aria-label={t("Nouvelle personne")} />
        <Button type="submit" className="gx-cta shrink-0" disabled={pending || !adding.trim()}>
          <Plus weight="bold" className="h-4 w-4" />
          {t("Ajouter")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
          {t("Personne pour le moment : ajoute quelqu'un, ou il sera ajouté avec ta prochaine dette ou ton prochain prêt.")}
        </p>
      ) : (
        <ul ref={listRef} className="relative rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {rows.map((p) => (
            <li
              key={p.id}
              ref={(el) => {
                if (el) rowRefs.current.set(p.id, el);
                else rowRefs.current.delete(p.id);
              }}
              onPointerDown={(e) => onPointerDown(e, p.id)}
              onPointerMove={onPointerMove}
              onPointerUp={endPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "relative flex select-none items-center gap-1 border-t border-slate-100 bg-white py-1.5 pl-2 pr-1.5 first:border-t-0 [-webkit-touch-callout:none] dark:border-slate-800 dark:bg-slate-900",
                "first:rounded-t-3xl last:rounded-b-3xl",
                draggingId === p.id && "z-10 rounded-2xl shadow-lg ring-2 ring-[var(--gx-brand-400)]",
                draggingId && draggingId !== p.id && "opacity-80",
              )}
            >
              <DotsSixVertical weight="bold" aria-hidden className="h-4 w-4 shrink-0 text-slate-300" />
              {editing?.id === p.id ? (
                <>
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    maxLength={60}
                    aria-label={t("Nom")}
                    className="h-9"
                  />
                  <button type="button" onClick={saveName} disabled={pending || !editing.name.trim()} aria-label={t("Enregistrer")} className={`${ICON} text-emerald-600`}>
                    <Check weight="bold" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} aria-label={t("Annuler")} className={ICON}>
                    <X weight="bold" className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-row
                    onClick={() => !justDragged.current && setEditing({ id: p.id, name: p.name })}
                    className="min-w-0 flex-1 py-1 pl-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{usedLabel(p)}</span>
                  </button>
                  <button type="button" onClick={() => setEditing({ id: p.id, name: p.name })} aria-label={t("Renommer {name}", { name: p.name })} className={ICON}>
                    <PencilSimple weight="bold" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setRemoving(p)} aria-label={t("Retirer {name}", { name: p.name })} className={`${ICON} hover:text-rose-500`}>
                    <Trash weight="bold" className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows.length > 1 && <p className="-mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">{t("Maintiens un nom et glisse-le pour changer l'ordre.")}</p>}
      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
        {t("Ces personnes sont proposées dans « De qui ? » d'une dette et « À qui ? » d'un prêt. Les renommer ou les retirer ne change aucune dette ni aucun prêt.")}
      </p>

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("Retirer {name} ?", { name: removing?.name ?? "" })}
        description={t("Il ne sera plus proposé. Ses dettes et ses prêts restent comme ils sont.")}
        confirmLabel={t("Retirer")}
        pending={pending}
        onConfirm={() => removing && run({ method: "DELETE", path: `/api/people/${removing.id}` }, () => {
          setRemoving(null);
          setOrder(null);
        })}
      />
    </div>
  );
}
