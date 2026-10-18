import { getAllExpenses, getBudgetOfIncome, getIncomeById, getIncomeCategories, getLoanOfIncome, getSavingsMoveOfIncome } from "@/lib/page-data";
import { monthLabelFr, parseMonthKey } from "@/lib/date";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { IncomeEditor } from "@/components/income-editor";
import { DeleteButton } from "@/components/delete-button";
import { LockedDeleteIcon } from "@/components/locked-delete";
import { incomeDelete } from "@/lib/delete-specs";

import { formatMoney } from "@/lib/utils";
import { LinkedSourcePage } from "@/components/linked-source";
import { MethodLabel } from "@/components/method-icon";

export const dynamic = "force-dynamic";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [income, expenses, move, loan, categories, budget] = await Promise.all([
    getIncomeById(id),
    getAllExpenses(),
    getSavingsMoveOfIncome(id),
    getLoanOfIncome(id),
    getIncomeCategories(),
    getBudgetOfIncome(id),
  ]);
  if (!income) notFound();
  const received = <MethodLabel method={income.method} />;
  if (move) {
    return (
      <LinkedSourcePage
        title={income.name}
        gradient="from-lime-400 via-green-500 to-emerald-700"
        eyebrow="Retrait d'épargne"
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{move.note ?? "Repris de l'épargne"} · {received}</>}
        text="Cet argent a été repris de ton épargne. Pour le modifier ou le supprimer, c'est depuis l'épargne."
        href={`/epargne/${move.id}`}
        editLabel="Modifier le retrait"
        buttonClass="gx-cta"
        sourceLabel="l'épargne"
      />
    );
  }
  if (budget) {
    return (
      <LinkedSourcePage
        title={income.name}
        gradient="from-fuchsia-400 via-purple-500 to-violet-700"
        eyebrow="Reste de budget 👛"
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{budget.budget.expense.name} · {monthLabelFr(parseMonthKey(budget.monthKey))} · {received}</>}
        text={`Ce qui restait du budget « ${budget.budget.expense.name} » à la fin du mois. Il suit les dépenses notées dans le budget.`}
        href={`/budgets/${budget.budget.id}?month=${budget.monthKey}`}
        editLabel="Voir le budget"
        buttonClass="gx-cta"
        sourceLabel="le budget"
      />
    );
  }
  if (loan) {
    return (
      <LinkedSourcePage
        title={income.name}
        gradient="from-amber-400 via-orange-500 to-amber-700"
        eyebrow="Argent rendu"
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{loan.name} t&apos;a rendu · {received}</>}
        text={`De l'argent prêté à ${loan.name}, qui t'a été rendu. Pour l'annuler, c'est depuis « Argent prêté ».`}
        href={`/prets/${loan.id}`}
        editLabel="Voir l'argent prêté"
        buttonClass="gx-cta"
        sourceLabel="Argent prêté"
      />
    );
  }
  const credit = income.expenseId ? expenses.find((e) => e.id === income.expenseId) : undefined;
  return (
    <>
      <PageHeader
        title={`Modifier · ${income.name}`}
        back
        action={
          credit ? (
            <LockedDeleteIcon hint={`Ce revenu vient de la dette « ${credit.name} » : supprime-le depuis la dette.`} />
          ) : (
            <DeleteButton variant="icon" {...incomeDelete(income)} />
          )
        }
      />
      <main className="px-4 py-5">
        <IncomeEditor
          income={income}
          categories={categories}
          source={credit ? { label: `la dette « ${credit.name} »`, href: `/expenses/${credit.id}` } : undefined}
        />
      </main>
    </>
  );
}
