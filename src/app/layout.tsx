import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { AppToaster } from "@/components/app-toaster";
import { NavHistoryTracker } from "@/lib/nav-history";
import { ThemeColorKeeper } from "@/components/theme-color";
import { TabSwipe } from "@/components/tab-swipe";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { LAUNCH_BOOT_SCRIPT, LaunchSplash, LaunchSplashEnd } from "@/components/launch-splash";
import { HTML_LANG } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { InstallAppListener } from "@/components/install-app";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { LOCK_BOOT_SCRIPT } from "@/lib/app-lock";
import { AppLock } from "@/components/app-lock";
import { THEME_COLOR_BOOT_SCRIPT } from "@/lib/page-theme";
import "./globals.css";

// The app's type, like the banking apps'.
const manrope = Manrope({
  variable: "--font-app",
  subsets: ["latin"],
});

const DESCRIPTION = "Ton budget du mois, simple et clair : salaire, dépenses, dettes, darets et épargne.";

export const metadata: Metadata = {
  // Absolute links for the shared-link preview (opengraph-image.jpg).
  metadataBase: new URL("https://gxsalaire.ma"),
  title: "GX Salaire",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "GX Salaire",
    title: "GX Salaire · Ton budget du mois",
    description: DESCRIPTION,
    locale: "fr_MA",
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GX Salaire",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // The keyboard shrinks the page to the area above it, so a focused field
  // can be scrolled right above the keyboard reliably (the bottom bar hides
  // while typing, see BottomNav).
  interactiveWidget: "resizes-content",
  // No themeColor here: Next would put its meta back on every navigation,
  // and the phone shows that colour for a frame. THEME_COLOR_BOOT_SCRIPT
  // adds the header's colour instead, and ThemeColorKeeper keeps it.
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={HTML_LANG[lang]} className={`${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT + THEME_COLOR_BOOT_SCRIPT + LAUNCH_BOOT_SCRIPT + LOCK_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <LaunchSplash />
        <LangProvider lang={lang}>
          <div id="page-root" className="relative mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+10.5rem)]">
            {children}
          </div>
          <BottomNav />
          <NavHistoryTracker />
          <ThemeColorKeeper />
          <TabSwipe />
          <AppToaster />
          <ServiceWorkerRegister />
          <InstallAppListener />
          <AppLock />
        </LangProvider>
        <LaunchSplashEnd />
      </body>
    </html>
  );
}
