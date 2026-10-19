import { getAllExpenses, getBudgetOfIncome, getIncomeById, getIncomeCategories, getLoanOfIncome, getSavingsMoveOfIncome } from "@/lib/page-data";
import { parseMonthKey } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { localName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
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
  const [income, expenses, move, loan, categories, budget, { lang, t }] = await Promise.all([
    getIncomeById(id),
    getAllExpenses(),
    getSavingsMoveOfIncome(id),
    getLoanOfIncome(id),
    getIncomeCategories(),
    getBudgetOfIncome(id),
    getI18n(),
  ]);
  if (!income) notFound();
  const received = <MethodLabel method={income.method} />;
  if (move) {
    return (
      <LinkedSourcePage
        title={localName(income.name, t)}
        gradient="from-lime-400 via-green-500 to-emerald-700"
        eyebrow={t("Retrait d'épargne")}
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{move.note ?? t("Repris de l'épargne")} · {received}</>}
        text={t("Cet argent a été repris de ton épargne. Pour le modifier ou le supprimer, c'est depuis l'épargne.")}
        href={`/epargne/${move.id}`}
        editLabel={t("Modifier le retrait")}
        buttonClass="gx-cta"
        sourceLabel={t("l'épargne")}
      />
    );
  }
  if (budget) {
    return (
      <LinkedSourcePage
        title={localName(income.name, t)}
        gradient="from-fuchsia-400 via-purple-500 to-violet-700"
        eyebrow={`${t("Reste de budget")} 👛`}
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{budget.budget.expense.name} · {monthLabel(parseMonthKey(budget.monthKey), lang)} · {received}</>}
        text={t("Ce qui restait du budget « {name} » à la fin du mois. Il suit les dépenses notées dans le budget.", { name: budget.budget.expense.name })}
        href={`/budgets/${budget.budget.id}?month=${budget.monthKey}`}
        editLabel={t("Voir le budget")}
        buttonClass="gx-cta"
        sourceLabel={t("le budget")}
      />
    );
  }
  if (loan) {
    return (
      <LinkedSourcePage
        title={localName(income.name, t)}
        gradient="from-amber-400 via-orange-500 to-amber-700"
        eyebrow={t("Argent rendu")}
        amount={`+${formatMoney(income.amount)}`}
        subtitle={<>{t("{name} t'a rendu", { name: loan.name })} · {received}</>}
        text={t("De l'argent prêté à {name}, qui t'a été rendu. Pour l'annuler, c'est depuis « Argent prêté ».", { name: loan.name })}
        href={`/prets/${loan.id}`}
        editLabel={t("Voir l'argent prêté")}
        buttonClass="gx-cta"
        sourceLabel={t("Argent prêté")}
      />
    );
  }
  const credit = income.expenseId ? expenses.find((e) => e.id === income.expenseId) : undefined;
  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${income.name}`}
        back
        info="income-edit"
        action={
          credit ? (
            <LockedDeleteIcon hint={t("Ce revenu vient de la dette « {name} » : supprime-le depuis la dette.", { name: credit.name })} />
          ) : (
            <DeleteButton variant="icon" {...incomeDelete(income, t)} />
          )
        }
      />
      <main className="px-4 py-5">
        <IncomeEditor
          income={income}
          categories={categories}
          source={credit ? { label: t("la dette « {name} »", { name: credit.name }), href: `/expenses/${credit.id}` } : undefined}
        />
      </main>
    </>
  );
}
