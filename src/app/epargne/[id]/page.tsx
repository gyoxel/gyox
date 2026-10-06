import { getAllPayments, getSavingsMove, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { isMoveCounted } from "@/lib/savings";
import { savingsDelete } from "@/lib/delete-specs";
import { PageHeader } from "@/components/page-header";
import { SavingsEditor } from "@/components/savings-editor";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

/** Modifier une épargne / un retrait (from Épargne, Dépenses or Revenus). */
export default async function EditSavingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, move, payments] = await Promise.all([getSettings(), getSavingsMove(id), getAllPayments()]);
  if (!move) notFound();
  return (
    <>
      <PageHeader
        title={move.kind === "out" ? "Modifier · Retrait" : "Modifier · Épargne"}
        back
        action={<DeleteButton variant="icon" {...savingsDelete(move)} />}
      />
      <main className="px-4 py-5">
        <SavingsEditor move={move} counted={isMoveCounted(move, payments)} currency={settings.currency} />
      </main>
    </>
  );
}
