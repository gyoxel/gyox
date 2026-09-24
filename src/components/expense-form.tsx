"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock } from "lucide-react";
import type { ColorCategory, Expense, ExpenseType, Frequency } from "@/lib/types";
import { todayDateStr } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_COLOR_FOR_TYPE: Record<ExpenseType, ColorCategory> = {
  permanent: "red",
  credit: "blue",
  temporary: "yellow",
};

interface FormState {
  name: string;
  amount: string;
  type: ExpenseType;
  frequency: Frequency;
  startDate: string;
  endMode: "none" | "date" | "linked";
  endDate: string;
  linkedExpenseId: string;
  color: ColorCategory;
  notes: string;
  creditInitialAmount: string;
  icon: string;
  active: boolean;
}

function buildInitialState(expense?: Expense, initialType: ExpenseType = "temporary"): FormState {
  if (!expense) {
    return {
      name: "",
      amount: "",
      type: initialType,
      frequency: "monthly",
      startDate: todayDateStr(),
      endMode: "none",
      endDate: "",
      linkedExpenseId: "",
      color: DEFAULT_COLOR_FOR_TYPE[initialType],
      notes: "",
      creditInitialAmount: "",
      icon: "",
      active: true,
    };
  }
  return {
    name: expense.name,
    amount: String(expense.amount),
    type: expense.type,
    frequency: expense.frequency,
    startDate: expense.startDate,
    endMode: expense.linkedExpenseId ? "linked" : expense.endDate ? "date" : "none",
    endDate: expense.endDate ?? "",
    linkedExpenseId: expense.linkedExpenseId ?? "",
    color: expense.color,
    notes: expense.notes ?? "",
    creditInitialAmount: expense.creditInitialAmount != null ? String(expense.creditInitialAmount) : "",
    icon: expense.icon ?? "",
    active: expense.active,
  };
}

export function ExpenseForm({
  expense,
  allExpenses,
  initialPaidStatus,
  showPaidToggle = true,
  initialType,
}: {
  expense?: Expense;
  allExpenses: Expense[];
  initialPaidStatus?: boolean;
  showPaidToggle?: boolean;
  initialType?: ExpenseType;
}) {
  const router = useRouter();
  const isEdit = !!expense;
  const [state, setState] = useState<FormState>(() => buildInitialState(expense, initialType));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [paidNow, setPaidNow] = useState(initialPaidStatus ?? false);
  const [isTogglingPaid, setIsTogglingPaid] = useState(false);

  function setPaidStatus(paid: boolean) {
    if (!expense || paid === paidNow) return;
    setPaidNow(paid);
    setIsTogglingPaid(true);
    const request = paid
      ? fetch(`/api/expenses/${expense.id}/payments`, { method: "POST" })
      : fetch(`/api/expenses/${expense.id}/payments`, { method: "DELETE" });
    request.finally(() => {
      setIsTogglingPaid(false);
      router.refresh();
    });
  }

  const linkableExpenses = useMemo(
    () => allExpenses.filter((e) => e.id !== expense?.id && (e.type === "credit" || e.linkedExpenseId == null)),
    [allExpenses, expense?.id],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onTypeChange(type: ExpenseType) {
    setState((s) => ({
      ...s,
      type,
      color: DEFAULT_COLOR_FOR_TYPE[type],
      frequency: type === "credit" ? "monthly" : type === "permanent" ? "monthly" : s.frequency,
      endMode: type === "credit" || type === "permanent" ? "none" : s.endMode,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: state.name,
      amount: Number(state.amount),
      type: state.type,
      frequency: state.frequency,
      startDate: state.startDate,
      endDate: state.endMode === "date" ? state.endDate || null : null,
      linkedExpenseId: state.endMode === "linked" ? state.linkedExpenseId || null : null,
      color: state.color,
      notes: state.notes || null,
      creditInitialAmount: state.type === "credit" ? Number(state.creditInitialAmount) : null,
      icon: state.icon || null,
      active: state.active,
    };

    startTransition(async () => {
      const url = isEdit ? `/api/expenses/${expense!.id}` : "/api/expenses";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const firstMessage =
          body?.error?.formErrors?.[0] ??
          (body?.error?.fieldErrors && Object.values(body.error.fieldErrors)[0] as string[] | undefined)?.[0];
        setError(firstMessage ?? "Une erreur est survenue. Vérifiez les champs.");
        return;
      }

      const saved = await res.json();
      router.push(`/expenses/${saved.id}`);
      router.refresh();
    });
  }

  const showEndOptions = state.type === "temporary" && state.frequency === "monthly";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex w-20 flex-col gap-1.5">
          <Label htmlFor="icon">Icône</Label>
          <Input
            id="icon"
            value={state.icon}
            onChange={(e) => update("icon", e.target.value)}
            placeholder="💳"
            maxLength={4}
            className="text-center text-lg"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" value={state.name} onChange={(e) => update("name", e.target.value)} required placeholder="Ex: Loyer" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">{state.type === "credit" ? "Paiement mensuel (DH)" : "Montant (DH)"}</Label>
        <Input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          value={state.amount}
          onChange={(e) => update("amount", e.target.value)}
          required
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select id="type" value={state.type} onChange={(e) => onTypeChange(e.target.value as ExpenseType)}>
            <option value="permanent">Permanent</option>
            <option value="temporary">Temporaire</option>
            <option value="credit">Crédit</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frequency">Fréquence</Label>
          <Select
            id="frequency"
            value={state.frequency}
            onChange={(e) => update("frequency", e.target.value as Frequency)}
            disabled={state.type === "credit" || state.type === "permanent"}
          >
            <option value="monthly">Mensuel</option>
            <option value="one-time">Une seule fois</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="color">Catégorie / couleur</Label>
        <Select id="color" value={state.color} onChange={(e) => update("color", e.target.value as ColorCategory)}>
          <option value="red">🔴 Permanent</option>
          <option value="blue">🔵 Temporaire lié à un crédit</option>
          <option value="yellow">🟡 Autre temporaire</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Date de début</Label>
          <Input
            id="startDate"
            type="date"
            value={state.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            required
          />
        </div>

        {state.type === "credit" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="creditInitialAmount">Dette restante (DH)</Label>
            <Input
              id="creditInitialAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={state.creditInitialAmount}
              onChange={(e) => update("creditInitialAmount", e.target.value)}
              required
            />
          </div>
        )}
      </div>

      {showEndOptions && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <Label>Fin de la dépense</Label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="endMode"
                checked={state.endMode === "date"}
                onChange={() => update("endMode", "date")}
              />
              Date de fin précise
            </label>
            {state.endMode === "date" && (
              <Input
                type="date"
                value={state.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className="ml-6 w-[calc(100%-1.5rem)]"
                required
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="endMode"
                checked={state.endMode === "linked"}
                onChange={() => update("endMode", "linked")}
              />
              Se termine avec un autre élément
            </label>
            {state.endMode === "linked" && (
              <Select
                value={state.linkedExpenseId}
                onChange={(e) => update("linkedExpenseId", e.target.value)}
                className="ml-6 w-[calc(100%-1.5rem)]"
                required
              >
                <option value="">Choisir…</option>
                {linkableExpenses.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea id="notes" value={state.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={state.active} onChange={(e) => update("active", e.target.checked)} />
        Actif (pris en compte dans les calculs)
      </label>

      {isEdit && showPaidToggle && (
        <div className="flex flex-col gap-1.5">
          <Label>Statut de paiement (ce mois-ci)</Label>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPaidStatus(true)}
              disabled={isTogglingPaid}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                paidNow
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Check className="h-4 w-4" />
              Payé
            </button>
            <button
              type="button"
              onClick={() => setPaidStatus(false)}
              disabled={isTogglingPaid}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                !paidNow
                  ? "bg-rose-500 text-white"
                  : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock className="h-4 w-4" />
              Pas encore
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
