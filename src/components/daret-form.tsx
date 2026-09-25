"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMonths, monthKey, monthLabelFr, parseMonthKey, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function DaretForm({ currency }: { currency: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState("10");
  const [startMonth, setStartMonth] = useState(() => monthKey(todayMonth()));
  const [turnMonth, setTurnMonth] = useState(() => monthKey(todayMonth()));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberCount = Math.max(0, Math.floor(Number(members) || 0));

  const turnOptions = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(startMonth) || memberCount < 2) return [];
    const start = parseMonthKey(startMonth);
    return Array.from({ length: Math.min(memberCount, 60) }, (_, i) => addMonths(start, i));
  }, [startMonth, memberCount]);

  // Keep the chosen turn valid when start/members change.
  const turnIsValid = turnOptions.some((m) => monthKey(m) === turnMonth);
  const effectiveTurn = turnIsValid ? turnMonth : turnOptions[0] ? monthKey(turnOptions[0]) : "";

  const payout = (Number(amount) || 0) * memberCount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/darets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Daret",
          amount: Number(amount),
          members: memberCount,
          startMonth,
          turnMonth: effectiveTurn,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const first =
          body?.error?.formErrors?.[0] ??
          (body?.error?.fieldErrors && (Object.values(body.error.fieldErrors)[0] as string[] | undefined))?.[0];
        setError(first ?? "Une erreur est survenue. Vérifiez les champs.");
        return;
      }
      router.push("/daret");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Daret famille" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Cotisation / mois (DH)</Label>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="members">Membres</Label>
          <Input
            id="members"
            type="number"
            min="2"
            max="60"
            step="1"
            inputMode="numeric"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startMonth">Premier mois</Label>
          <Input id="startMonth" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="turnMonth">Mon tour</Label>
          <Select
            id="turnMonth"
            value={effectiveTurn}
            onChange={(e) => setTurnMonth(e.target.value)}
            disabled={turnOptions.length === 0}
            required
          >
            {turnOptions.map((m, i) => (
              <option key={monthKey(m)} value={monthKey(m)}>
                {i + 1}. {monthLabelFr(m)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {turnOptions.length > 0 && (
        <div className="rounded-xl bg-[#019c86]/10 px-3.5 py-3 text-sm text-[#007261] dark:bg-[#019c86]/15 dark:text-teal-200">
          Fin : <span className="font-semibold">{monthLabelFr(turnOptions[turnOptions.length - 1])}</span>
          {payout > 0 && (
            <>
              {" "}· Tu recevras <span className="font-semibold">{formatMoney(payout, currency)}</span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending || turnOptions.length === 0}>
          {isPending ? "Enregistrement…" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
