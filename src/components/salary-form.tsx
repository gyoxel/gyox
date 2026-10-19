"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { mutate } from "@/lib/use-refresh-data";
import type { PaymentMethod, Settings } from "@/lib/types";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { cleanDecimalInput, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Salaire: the monthly amount, and the day it arrives (the Accueil
 *  countdown counts down to that day). Used on the Salaire page
 *  and in the dialog opened by tapping the countdown (`plain`, no card). */
export function SalaryForm({
  settings,
  plain = false,
  onSaved,
}: {
  settings: Settings;
  plain?: boolean;
  onSaved?: () => void;
}) {
  const t = useT();
  const [salary, setSalary] = useState(toDecimalInput(settings.salary));
  const [payDay, setPayDay] = useState(String(settings.payDay));
  const [salaryMethod, setSalaryMethod] = useState<PaymentMethod>(settings.salaryMethod);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await mutate({
        method: "PATCH",
        path: "/api/settings",
        body: { salary: parseDecimalInput(salary), payDay: Number(payDay), salaryMethod },
      });
      if (!res.ok) {
        setError(t("Impossible d'enregistrer. Vérifie le montant."));
        return;
      }
      toast.success(t("Salaire enregistré. Tous les calculs sont mis à jour."));
      onSaved?.();
    });
  }

  const fields = (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salary">{t("Salaire mensuel (DH)")}</Label>
        <Input
          id="salary"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={salary}
          onChange={(e) => setSalary(cleanDecimalInput(e.target.value))}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payDay">{t("Jour du salaire")}</Label>
        <Select id="payDay" value={payDay} onChange={(e) => setPayDay(e.target.value)}>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d === 1 ? t("Le 1er du mois") : t("Le {day} du mois", { day: d })}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-400">
          {t("Le compte à rebours de l'accueil compte jusqu'à ce jour. Si le mois est plus court, c'est son dernier jour.")}
        </p>
      </div>

      <PaymentMethodPicker value={salaryMethod} onChange={setSalaryMethod} label={t("Reçu en")} />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="gx-cta"
      >
        {isPending ? t("Enregistrement…") : t("Enregistrer")}
      </Button>
    </>
  );

  return (
    <form onSubmit={handleSubmit}>
      {plain ? (
        <div className="flex flex-col gap-4">{fields}</div>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">{fields}</CardContent>
        </Card>
      )}
    </form>
  );
}
