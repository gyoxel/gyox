import Link from "next/link";
import { Pencil } from "lucide-react";
import { LockedDelete, LockedDeleteIcon } from "@/components/locked-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Page of an expense / income created by something else (money put into
 * the savings, a loan…): what it is, a button to its source, and a greyed
 * delete — only the source edits and deletes it.
 */
export function LinkedSourcePage({
  title,
  tone,
  gradient,
  eyebrow,
  amount,
  subtitle,
  text,
  href,
  editLabel,
  buttonClass,
  sourceLabel,
}: {
  title: string;
  /** Header colour. */
  tone: string;
  /** Hero card's gradient classes. */
  gradient: string;
  eyebrow: string;
  amount: string;
  subtitle: string;
  text: string;
  href: string;
  editLabel: string;
  buttonClass: string;
  /** "l'épargne", "le prêt"… */
  sourceLabel: string;
}) {
  return (
    <>
      <PageHeader title={title} back tone={tone} action={<LockedDeleteIcon hint={`Supprime-le depuis ${sourceLabel}.`} />} />
      <main className="flex flex-col gap-4 px-4 py-5">
        <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg dark:shadow-none", gradient)}>
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{eyebrow}</p>
          <p className="relative mt-1 text-4xl font-bold tabular-nums">{amount}</p>
          <p className="relative mt-1 text-sm text-white/90">{subtitle}</p>
        </div>
        <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
        <Button asChild className={buttonClass}>
          <Link href={href}>
            <Pencil className="h-4 w-4" />
            {editLabel}
          </Link>
        </Button>
        <LockedDelete hint="Il vient d'ailleurs : supprime-le depuis" href={href} linkLabel={sourceLabel} />
      </main>
    </>
  );
}
