import { getLoan } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { loanDelete } from "@/lib/delete-specs";
import { PageHeader } from "@/components/page-header";
import { LoanEditor } from "@/components/loan-editor";
import { DeleteButton } from "@/components/delete-button";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const [loan, { t }] = await Promise.all([getLoan((await params).id), getI18n()]);
  if (!loan) notFound();
  return (
    <>
      <PageHeader title={`${t("Modifier")} · ${loan.name}`} back info="pret-edit" action={<DeleteButton variant="icon" {...loanDelete(loan, t)} />} />
      <main className="px-4 py-5">
        <LoanEditor loan={loan} />
      </main>
    </>
  );
}
