"use client";

import { CaretLeft } from "@phosphor-icons/react/ssr";
import { useNavBack } from "@/lib/nav-history";
import { HEADER_BUTTON } from "@/components/header-button";

/** Header back arrow: the previous page, or home on the session's first page. */
export function BackButton() {
  const nav = useNavBack();
  return (
    <button type="button" onClick={() => nav.back()} aria-label="Retour" className={HEADER_BUTTON}>
      <CaretLeft weight="bold" className="h-5 w-5" />
    </button>
  );
}
