"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

/** The toasts, dark with the dark theme (it follows the "dark" class on
 *  <html>, not the system's setting) — rounded like the rest. */
export function AppToaster() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <Toaster
      position="top-center"
      richColors
      theme={dark ? "dark" : "light"}
      toastOptions={{ classNames: { toast: "!rounded-[20px] !font-semibold !shadow-[0_16px_36px_-16px_rgba(48,28,130,0.45)]" } }}
    />
  );
}
