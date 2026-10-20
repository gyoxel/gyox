import { getSettings } from "@/lib/page-data";
import { getWallet } from "@/lib/wallet-data";
import { PageHeader } from "@/components/page-header";
import { SoldeView } from "@/components/solde-view";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Solde: cash and card, transfers between them, and the full history. */
export default async function SoldePage() {
  const [settings, wallet, { t }] = await Promise.all([getSettings(), getWallet(), getI18n()]);

  return (
    <>
      <PageHeader title={t("Solde")} back info="solde" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <SoldeView wallet={wallet} currency={settings.currency} />
      </main>
    </>
  );
}
