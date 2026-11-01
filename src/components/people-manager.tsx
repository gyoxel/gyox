"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react/ssr";
import { useT } from "@/lib/i18n/client";
import { mutate } from "@/lib/use-refresh-data";
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
 * Personnes: add someone, rename (✎), move up / down (saved at once), remove
 * (asked first). Only the list of names: no debt or loan changes.
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

  function move(index: number, by: -1 | 1) {
    const ids = rows.map((p) => p.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + by, 0, id);
    setOrder(ids);
    run({ method: "PUT", path: "/api/people/order", body: { ids } });
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
        <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-1 border-t border-slate-100 py-1.5 pl-4 pr-1.5 first:border-t-0 dark:border-slate-800">
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
                  <button type="button" onClick={() => setEditing({ id: p.id, name: p.name })} className="min-w-0 flex-1 py-1 text-left">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{usedLabel(p)}</span>
                  </button>
                  <button type="button" onClick={() => setEditing({ id: p.id, name: p.name })} aria-label={t("Renommer {name}", { name: p.name })} className={ICON}>
                    <PencilSimple weight="bold" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label={t("Monter {name}", { name: p.name })} className={ICON}>
                    <ArrowUp weight="bold" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1 || pending} aria-label={t("Descendre {name}", { name: p.name })} className={ICON}>
                    <ArrowDown weight="bold" className="h-4 w-4" />
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
      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
        {t("Ces noms sont proposés sous le nom d'une dette ou d'un prêt. Les renommer ou les retirer ne change aucune dette ni aucun prêt.")}
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
