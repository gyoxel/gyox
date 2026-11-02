"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, User } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { mutate } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chipWidth, splitInTwo } from "@/components/category-picker";
import { useT } from "@/lib/i18n/client";

/**
 * A debt's « De qui ? » / a loan's « À qui ? »: the people (Personnes) as
 * chips, like the categories — tap one to pick it (again to unpick), the
 * last chip adds someone.
 */
export function PersonPicker({ people, value, onChange, label }: { people: string[]; value: string | null; onChange: (name: string | null) => void; label: string }) {
  const t = useT();
  const rowRef = useRef<HTMLDivElement>(null);
  // Someone just added shows at once (the page's list follows on refresh).
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const all = [...people, ...added.filter((a) => !people.some((p) => same(p, a)))];
  // A person not in the list (an older debt's, or removed since): still shown, picked.
  if (value && !all.some((p) => same(p, value))) all.unshift(value);

  useEffect(() => {
    if (!value || !rowRef.current) return;
    rowRef.current.querySelector<HTMLElement>(`[data-name="${CSS.escape(value)}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  async function create() {
    setError(null);
    const typed = name.trim();
    if (!typed) return setError(t("Indique un nom."));
    const existing = all.find((p) => same(p, typed));
    if (existing) {
      onChange(existing);
      setAdding(false);
      setName("");
      return;
    }
    setSaving(true);
    const res = await mutate({ method: "POST", path: "/api/people", body: { name: typed } });
    setSaving(false);
    if (!res.ok) return setError(t("Impossible d'ajouter cette personne."));
    setAdded((prev) => [...prev, typed]);
    onChange(typed);
    setAdding(false);
    setName("");
  }

  const chips = [...all.map((p) => ({ kind: "person" as const, name: p })), { kind: "add" as const }];
  return (
    <>
      <div ref={rowRef} role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1">
        <div className="flex w-max flex-col gap-2">
          {splitInTwo(chips, (c) => chipWidth(c.kind === "add" ? t("Ajouter") : c.name)).map((row, i) => (
            <div key={i} className="flex gap-2">
              {row.map((chip) =>
                chip.kind === "add" ? (
                  <button
                    key="add"
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-sm text-slate-500 active:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                  >
                    <Plus weight="bold" className="h-4 w-4" />
                    {t("Ajouter")}
                  </button>
                ) : (
                  <button
                    key={chip.name}
                    type="button"
                    role="radio"
                    aria-checked={value != null && same(chip.name, value)}
                    data-name={chip.name}
                    onClick={() => onChange(value != null && same(chip.name, value) ? null : chip.name)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm",
                      value != null && same(chip.name, value)
                        ? "border-violet-600 bg-violet-600/10 font-semibold text-violet-700 dark:text-violet-300"
                        : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                    )}
                  >
                    <User weight="bold" className="h-3.5 w-3.5 opacity-60" />
                    {chip.name}
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Nouvelle personne")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-person">{t("Nom")}</Label>
            <Input id="new-person" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Nom : Karim, Sara…")} maxLength={60} autoFocus />
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
              {t("Annuler")}
            </Button>
            <Button type="button" onClick={create} disabled={saving}>
              {saving ? t("Ajout…") : t("Ajouter")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
