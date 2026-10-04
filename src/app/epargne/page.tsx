import { getAllPayments, getSettings } from "@/lib/repository";
import { getAllSavingsMoves } from "@/lib/savings-repo";
import { getWallet } from "@/lib/wallet-data";
import { isMoveCounted } from "@/lib/savings";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { EpargneView } from "@/components/epargne-view";

export const dynamic = "force-dynamic";

/** Épargne: what's put aside, putting more / taking some back, the history. */
export default async function EpargnePage() {
  const [settings, wallet, moves, payments] = await Promise.all([getSettings(), getWallet(), getAllSavingsMoves(), getAllPayments()]);
  return (
    <>
      <PageHeader title="Épargne" back action={<HeaderAdd label="Mettre de côté" />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <EpargneView
          moves={moves.map((m) => ({ ...m, counted: isMoveCounted(m, payments) }))}
          balance={wallet.balance}
          savings={wallet.savings}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
