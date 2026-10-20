import { getDaretById, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";
import { DeleteButton } from "@/components/delete-button";
import { daretDelete } from "@/lib/delete-specs";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditDaretPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, daret, { t }] = await Promise.all([getSettings(), getDaretById(id), getI18n()]);
  if (!daret) notFound();
  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${daret.expense.name}`}
        back
        info="daret-edit"
        action={<DeleteButton variant="icon" {...daretDelete(daret, t)} />}
      />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} daret={daret} />
      </main>
    </>
  );
}
