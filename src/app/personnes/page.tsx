import { getAllExpenses, getAllLoans } from "@/lib/page-data";
import { getPeople } from "@/lib/people-repo";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";
import { PeopleManager } from "@/components/people-manager";

export const dynamic = "force-dynamic";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Personnes: the names offered under a debt's or a loan's — add, rename,
 *  order, remove (no debt or loan changes). */
export default async function PeoplePage() {
  const [people, loans, expenses, { t }] = await Promise.all([getPeople(), getAllLoans(), getAllExpenses(), getI18n()]);
  // How many debts / loans go by each name.
  const used = new Map<string, { debts: number; loans: number }>();
  const slot = (name: string) => used.get(fold(name)) ?? used.set(fold(name), { debts: 0, loans: 0 }).get(fold(name))!;
  for (const e of expenses) if (e.type === "credit") slot(e.name).debts += 1;
  for (const l of loans) slot(l.name).loans += 1;
  return (
    <>
      <PageHeader title={t("Personnes")} back info="personnes" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <PeopleManager people={people.map((p) => ({ ...p, ...(used.get(fold(p.name)) ?? { debts: 0, loans: 0 }) }))} />
      </main>
    </>
  );
}
