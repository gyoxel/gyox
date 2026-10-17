import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { AppToaster } from "@/components/app-toaster";
import { NavHistoryTracker } from "@/lib/nav-history";
import { ThemeColorKeeper } from "@/components/theme-color";
import { TabSwipe } from "@/components/tab-swipe";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { THEME_COLOR_BOOT_SCRIPT } from "@/lib/page-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The app's type, like the banking apps'.
const manrope = Manrope({
  variable: "--font-app",
  subsets: ["latin"],
});

const DESCRIPTION = "Ton budget du mois, simple et clair : salaire, dépenses, crédits, darets et épargne.";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT + THEME_COLOR_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div id="page-root" className="relative mx-auto flex w-full max-w-lg flex-1 flex-col pb-32">
          {children}
        </div>
        <BottomNav />
        <NavHistoryTracker />
        <ThemeColorKeeper />
        <TabSwipe />
        <AppToaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
