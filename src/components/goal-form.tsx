"use client";

import { useState, useTransition } from "react";
import { useNavBack } from "@/lib/nav-history";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Goal, GoalIdea } from "@/lib/types";
import { monthLabelFr, parseMonthKey } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface DaretOption {
  id: string;
  name: string;
  /** What the daret pays out on the user's turn. */
  payout: number;
  turnMonth: string;
  /** Name of another goal this daret already feeds, if any. */
  linkedTo: string | null;
}

const PRESETS: { emoji: string; name: string }[] = [
  { emoji: "🚗", name: "Voiture" },
  { emoji: "🏠", name: "Maison" },
  { emoji: "✈️", name: "Voyage" },
  { emoji: "🕋", name: "Omra" },
  { emoji: "💍", name: "Mariage" },
  { emoji: "📱", name: "Téléphone" },
  { emoji: "🎓", name: "Études" },
  { emoji: "🛟", name: "Épargne de secours" },
];

/** Create or edit a goal: name & emoji (with quick presets), target, money
 *  already saved, optional deadline / monthly saving, and the darets whose
 *  payout goes to it. */
export function GoalForm({
  goal,
  darets,
  currency,
  ideas: initialIdeas = [],
}: {
  goal?: Goal;
  darets: DaretOption[];
  currency: string;
  /** The user's own ideas, shown after the built-in ones. */
  ideas?: GoalIdea[];
}) {
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(toDecimalInput(goal?.targetAmount));
  const [saved, setSaved] = useState(toDecimalInput(goal?.savedAmount || null));
  const [monthly, setMonthly] = useState(toDecimalInput(goal?.monthlySaving));
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [daretIds, setDaretIds] = useState<string[]>(goal?.daretIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [addingIdea, setAddingIdea] = useState(false);
  const [ideaEmoji, setIdeaEmoji] = useState("🎯");
  const [ideaName, setIdeaName] = useState("");

  async function saveIdea() {
    if (!ideaName.trim()) return;
    const res = await fetch("/api/goal-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: ideaEmoji.trim() || "🎯", name: ideaName.trim() }),
    });
    if (!res.ok) return toast.error("Impossible d'ajouter l'idée.");
    const idea: GoalIdea = await res.json();
    setIdeas((list) => [...list, idea]);
    setEmoji(idea.emoji);
    setName(idea.name);
    setAddingIdea(false);
    setIdeaName("");
    setIdeaEmoji("🎯");
  }

  const [ideaToDelete, setIdeaToDelete] = useState<GoalIdea | null>(null);

  async function removeIdea(idea: GoalIdea) {
    setIdeaToDelete(null);
    setIdeas((list) => list.filter((i) => i.id !== idea.id));
    const res = await fetch(`/api/goal-ideas/${idea.id}`, { method: "DELETE" });
    if (!res.ok) {
      setIdeas((list) => [...list, idea]);
      toast.error("Suppression impossible.");
    }
  }

  const targetValue = parseDecimalInput(target);
  const fromDarets = darets.filter((d) => daretIds.includes(d.id)).reduce((s, d) => s + d.payout, 0);
  const projected = parseDecimalInput(saved) + fromDarets;
  const projectedPct = targetValue > 0 ? Math.min(100, Math.round((projected / targetValue) * 100)) : 0;

  function toggleDaret(id: string) {
    setDaretIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Donne un nom à l'objectif.");
    if (targetValue <= 0) return setError("Indique le montant de l'objectif.");
    const payload = {
      name: name.trim(),
      emoji: emoji.trim() || "🎯",
      targetAmount: targetValue,
      savedAmount: parseDecimalInput(saved),
      monthlySaving: parseDecimalInput(monthly) > 0 ? parseDecimalInput(monthly) : null,
      deadline: deadline || null,
      daretIds,
    };
    startTransition(async () => {
      const res = await fetch(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Enregistrement impossible. Vérifie les champs.");
        return;
      }
      await refreshData();
      toast.success(goal ? "Objectif modifié." : "Objectif ajouté.");
      nav.back(goal ? `/goals/${goal.id}` : "/goals");
    });
  }

  function remove() {
    if (!goal) return;
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      await refreshData();
      toast.success("Objectif supprimé.");
      nav.backTo("/goals");
    });
  }

  const row = "flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 first:border-t-0 dark:border-slate-800";
  const rowInput =
    "h-9 w-32 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-right text-sm font-semibold tabular-nums outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Icon, target, and what's already covered */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <input
            id="goal-emoji"
            aria-label="Icône"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={8}
            className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 text-center text-3xl outline-none focus:bg-white/30"
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="goal-target" className="text-xs text-white/80">
              Objectif à atteindre
            </label>
            <div className="flex items-baseline gap-1.5">
              <input
                id="goal-target"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={target}
                onChange={(e) => setTarget(cleanDecimalInput(e.target.value))}
                placeholder="0"
                style={{ width: `${Math.max(1, target.length) + 0.3}ch` }}
                className="max-w-[50vw] bg-transparent text-4xl font-bold text-white outline-none placeholder:text-white/40"
              />
              <span className="text-lg font-semibold text-white/70">DH</span>
            </div>
          </div>
        </div>
        {targetValue > 0 && (
          <div className="relative mt-4">
            <div className="flex items-center justify-between text-xs text-white/85">
              <span>Épargne + darets</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(projected, currency)} · {projectedPct}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${projectedPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-name">Nom</Label>
        <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Voiture" maxLength={60} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Idées</Label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[...PRESETS.map((p) => ({ ...p, idea: null as GoalIdea | null })), ...ideas.map((i) => ({ emoji: i.emoji, name: i.name, idea: i }))].map(
            (p) => (
              <span
                key={p.idea?.id ?? p.name}
                className={cn(
                  "flex shrink-0 items-center rounded-full border text-sm whitespace-nowrap",
                  name === p.name
                    ? "border-orange-400 bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEmoji(p.emoji);
                    setName(p.name);
                  }}
                  className={cn("flex items-center gap-1.5 py-2 pl-3.5", p.idea ? "pr-1" : "pr-3.5")}
                >
                  <span className="text-base leading-none">{p.emoji}</span>
                  {p.name}
                </button>
                {p.idea && (
                  <button
                    type="button"
                    onClick={() => setIdeaToDelete(p.idea)}
                    aria-label={`Retirer l'idée ${p.name}`}
                    className="flex h-8 w-7 items-center justify-center text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ),
          )}
          <button
            type="button"
            onClick={() => setAddingIdea(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-sm whitespace-nowrap text-slate-500 dark:border-slate-600 dark:text-slate-400"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <label className={row} htmlFor="goal-saved">
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Déjà épargné</span>
            <span className="block text-[11px] text-slate-400">ce que tu as déjà de côté</span>
          </span>
          <input
            id="goal-saved"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={saved}
            onChange={(e) => setSaved(cleanDecimalInput(e.target.value))}
            placeholder="0 DH"
            className={rowInput}
          />
        </label>
        <label className={row} htmlFor="goal-monthly">
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Épargne / mois</span>
            <span className="block text-[11px] text-slate-400">optionnel · donne la date d&apos;arrivée</span>
          </span>
          <input
            id="goal-monthly"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={monthly}
            onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
            placeholder="— DH"
            className={rowInput}
          />
        </label>
        <label className={row} htmlFor="goal-deadline">
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Pour quand ?</span>
            <span className="block text-[11px] text-slate-400">optionnel · combien par mois</span>
          </span>
          <input id="goal-deadline" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={rowInput} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Darets pour cet objectif</Label>
        {darets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucune daret pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {darets.map((d) => {
              const checked = daretIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleDaret(d.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    checked
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                      checked ? "border-orange-500 bg-orange-500" : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-lg leading-none">🤝🏻</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Ton tour : {monthLabelFr(parseMonthKey(d.turnMonth))}
                      {d.linkedTo && !checked && ` · liée à « ${d.linkedTo} »`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(d.payout, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">Une daret ne compte que pour un seul objectif.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-500 dark:text-white"
      >
        {isPending ? "Enregistrement…" : goal ? "Enregistrer" : "Ajouter l'objectif"}
      </Button>

      <ConfirmDialog
        open={ideaToDelete != null}
        onOpenChange={(open) => !open && setIdeaToDelete(null)}
        title="Retirer cette idée ?"
        description={ideaToDelete && <>« {ideaToDelete.emoji} {ideaToDelete.name} » ne sera plus proposée. Tes objectifs ne changent pas.</>}
        confirmLabel="Retirer"
        onConfirm={() => ideaToDelete && removeIdea(ideaToDelete)}
      />

      <Dialog open={addingIdea} onOpenChange={setAddingIdea}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle idée</DialogTitle>
            <DialogDescription>Elle restera dans la liste des idées pour tes prochains objectifs.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <div className="flex w-20 flex-col gap-1.5">
              <Label htmlFor="idea-emoji">Icône</Label>
              <Input id="idea-emoji" value={ideaEmoji} onChange={(e) => setIdeaEmoji(e.target.value)} maxLength={8} className="text-center text-lg" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="idea-name">Nom</Label>
              <Input id="idea-name" value={ideaName} onChange={(e) => setIdeaName(e.target.value)} placeholder="Ex: Moto" maxLength={40} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddingIdea(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={saveIdea} disabled={!ideaName.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {goal && (
        <>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Supprimer l&apos;objectif
          </Button>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer cet objectif ?</DialogTitle>
                <DialogDescription>
                  « {goal.emoji} {goal.name} » sera supprimé. Tes darets ne sont pas touchées.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={remove} disabled={isPending}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </form>
  );
}
