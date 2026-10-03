import { notFound } from "next/navigation";
import { getAllPayments, getGoalById, getGoalDeposit, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { DepositEditor } from "@/components/deposit-editor";

export const dynamic = "force-dynamic";

/** Modifier un versement (from the goal, or its expense in Dépenses). */
export default async function EditDepositPage({ params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const [settings, goal, deposit, payments] = await Promise.all([
    getSettings(),
    getGoalById(id),
    getGoalDeposit(id, depositId),
    getAllPayments(),
  ]);
  if (!goal || !deposit) notFound();
  const payment = deposit.expenseId ? payments.find((p) => p.expenseId === deposit.expenseId && p.amountPaid > 0) : undefined;
  return (
    <>
      <PageHeader title="Modifier le versement" back />
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
