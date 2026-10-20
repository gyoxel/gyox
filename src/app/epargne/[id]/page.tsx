import { getAllGoals, getAllPayments, getExpenseById, getSavingsMove, getSettings } from "@/lib/page-data";
import { notFound, redirect } from "next/navigation";

import { isMoveCounted } from "@/lib/savings";
import { monthlyPlan } from "@/lib/monthly-plan";
import { todayMonth } from "@/lib/date";
import { savingsDelete } from "@/lib/delete-specs";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { SavingsEditor } from "@/components/savings-editor";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

/** Modifier une épargne / un retrait (from Épargne, Dépenses or Revenus). */
export default async function EditSavingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, move, payments, { t }] = await Promise.all([getSettings(), getSavingsMove(id), getAllPayments(), getI18n()]);
  if (!move) notFound();
  if (move.kind === "goal") {
    // Given to a goal: changed from that goal's deposit.
    const goal = (await getAllGoals()).find((g) => g.deposits.some((d) => d.id === move.goalDepositId));
    redirect(goal ? `/goals/${goal.id}/deposits/${move.goalDepositId}` : "/epargne");
  }
  const expense = move.monthly && move.expenseId ? await getExpenseById(move.expenseId) : null;
  const plan = expense ? monthlyPlan(expense, payments, todayMonth()) : null;
  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${move.kind === "out" ? t("Retrait") : t("Épargne")}`}
        back
        info="savings-edit"
        action={<DeleteButton variant="icon" {...savingsDelete(move, t)} />}
      />
      <main className="px-4 py-5">
        <SavingsEditor move={move} counted={isMoveCounted(move, payments)} currency={settings.currency} plan={plan} />
      </main>
    </>
  );
}
