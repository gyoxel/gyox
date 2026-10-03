import { notFound } from "next/navigation";
import { getDaretById, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";

export const dynamic = "force-dynamic";

export default async function EditDaretPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, daret] = await Promise.all([getSettings(), getDaretById(id)]);
  if (!daret) notFound();
  return (
    <>
      <PageHeader title="Modifier la daret" back />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} daret={daret} />
      </main>
    </>
  );
}
