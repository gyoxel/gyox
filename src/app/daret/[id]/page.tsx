import { getDaretById, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";
import { DeleteButton } from "@/components/delete-button";
import { daretDelete } from "@/lib/delete-specs";

export const dynamic = "force-dynamic";

export default async function EditDaretPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, daret] = await Promise.all([getSettings(), getDaretById(id)]);
  if (!daret) notFound();
  return (
    <>
      <PageHeader title={`Modifier · ${daret.expense.name}`} back action={<DeleteButton variant="icon" {...daretDelete(daret)} />} />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} daret={daret} />
      </main>
    </>
  );
}
