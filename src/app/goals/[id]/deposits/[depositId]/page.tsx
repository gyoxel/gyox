import { getAllPayments, getGoalById, getGoalDeposit, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DepositEditor } from "@/components/deposit-editor";
import { DeleteButton } from "@/components/delete-button";
import { depositDelete } from "@/lib/delete-specs";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Modifier un versement (from the goal, or its expense in Dépenses). */
export default async function EditDepositPage({ params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const [settings, goal, deposit, payments, { t }] = await Promise.all([
    getSettings(),
    getGoalById(id),
    getGoalDeposit(id, depositId),
    getAllPayments(),
    getI18n(),
  ]);
  if (!goal || !deposit) notFound();
  const payment = deposit.expenseId ? payments.find((p) => p.expenseId === deposit.expenseId && p.amountPaid > 0) : undefined;
  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${t("Versement")}`}
        back
        info="deposit-edit"
        action={<DeleteButton variant="icon" {...depositDelete(goal.id, deposit, settings.currency, t)} />}
      />
      <main className="px-4 py-5">
        <DepositEditor
          goal={{ id: goal.id, name: goal.name, emoji: goal.emoji }}
          deposit={deposit}
          paid={deposit.expenseId ? payment != null : true}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
