import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

function todayShortDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${now.getFullYear()}`;
}

export default async function HomePage() {
  const [settings, expenses, payments, categories] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
  ]);
  const categoryEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));
  const currentMonth = todayMonth();

  return (
    <>
      <PageHeader title="GX Salaire" action={<span className="text-xs text-slate-400">{todayShortDate()}</span>} />

      <main className="flex flex-col gap-4 px-4 py-5">
        <HomeDashboard
          salary={settings.salary}
          currency={settings.currency}
          expenses={expenses}
          payments={payments}
          currentMonth={currentMonth}
          categoryEmoji={categoryEmoji}
          countdown={<CountdownNextSalary settings={settings} />}
        />
      </main>
    </>
  );
}
