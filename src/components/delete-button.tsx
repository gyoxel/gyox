"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Trash } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { pagesGone, useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { localizeMessage } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

/** Round red bin, in the page header. */
export const DELETE_ICON_BUTTON =
  "gx-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-rose-600 transition-transform active:scale-95 dark:text-rose-300";

/**
 * Deletes something after a confirmation: the red bin in the page header
 * (`icon`) or the red button at the bottom of the page (`full`) — every edit
 * page has both. Then back to the latest page that still exists.
 */
export function DeleteButton({
  variant,
  label,
  endpoint,
  title,
  description,
  success,
  fallback = "/",
}: {
  variant: "icon" | "full";
  /** "Supprimer la dépense"… (the icon's accessible name too). */
  label: string;
  /** DELETE goes there. */
  endpoint: string;
  title: string;
  description: ReactNode;
  /** Toast once deleted. */
  success: string;
  /** Where to go when there's no previous page left. */
  fallback?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nav = useNavBack();
  const t = useT();

  function remove() {
    startTransition(async () => {
      const res = await mutate({ method: "DELETE", path: endpoint });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        toast.error(typeof body?.error === "string" ? localizeMessage(body.error, t) : t("Suppression impossible."));
        return;
      }
      const gone = await pagesGone(res);
      setOpen(false);
      toast.success(success);
      nav.leave(gone, fallback);
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={label} className={DELETE_ICON_BUTTON}>
          <Trash weight="bold" className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <Button type="button" variant="destructive" className="w-full" onClick={() => setOpen(true)} disabled={pending}>
          <Trash weight="bold" className="h-4 w-4" />
          {label}
        </Button>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}
