import Link from "next/link";
import { CalendarCheck, HandCoins, ShieldCheck, Wallet } from "lucide-react";
import { ThemeColor } from "@/components/theme-color";
import { GoogleIcon } from "@/components/google-icon";
import { ForgetOnMount } from "@/components/forget-on-mount";
import { HOME_COLOR } from "@/lib/page-theme";
import { safeNext } from "@/lib/google-oauth";

export const metadata = { title: "Connexion · GX Salaire" };

const ERRORS: Record<string, string> = {
  annule: "Connexion annulée.",
  expire: "La connexion a pris trop de temps : réessaie.",
  google: "Google n'a pas pu confirmer ton compte : réessaie.",
  config: "La connexion Google n'est pas encore prête.",
  serveur: "Le serveur ne répond pas pour l'instant : réessaie dans un moment.",
};

const FEATURES = [
  { icon: Wallet, text: "Ton salaire, ton cash et ta carte, au dirham près" },
  { icon: CalendarCheck, text: "Tes dépenses et crédits du mois, cochés en un geste" },
  { icon: HandCoins, text: "Darets, prêts, épargne et objectifs" },
  { icon: ShieldCheck, text: "Tes données ne sont visibles que par toi" },
];

/** Sign-in (and the public home page Google links to). */
export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const error = ERRORS[String(params.erreur ?? "")];
  const next = safeNext(typeof params.suite === "string" ? params.suite : null);
  const href = next === "/" ? "/api/auth/google" : `/api/auth/google?suite=${encodeURIComponent(next)}`;

  return (
    <main className="-mb-28 flex min-h-dvh flex-col bg-gradient-to-b from-[#019c86] via-[#017a6a] to-[#014d43] px-6 pb-8 pt-14 text-white">
      <ThemeColor color={HOME_COLOR} />
      <ForgetOnMount />
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-3xl font-black tracking-tight text-[#007261] shadow-xl shadow-black/20">
          GX
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
          GX <span className="font-semibold text-white/85">Salaire</span>
        </h1>
        <p className="mt-2 max-w-xs text-sm text-white/80">Ton budget du mois, simple et clair : ce qui rentre, ce qui sort, ce qui reste.</p>
      </div>

      <ul className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-3">
        {FEATURES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15 backdrop-blur-sm">
            <Icon className="h-5 w-5 shrink-0 text-lime-200" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-auto w-full max-w-sm pt-10">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-rose-500/90 px-4 py-2.5 text-center text-sm font-medium">
            {error}
          </p>
        )}
        {/* A plain link: the sign-in leaves for Google and comes back. */}
        <a
          href={href}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-base font-semibold text-slate-800 shadow-lg shadow-black/20 transition-transform active:scale-[0.98]"
        >
          <GoogleIcon className="h-5 w-5" />
          Continuer avec Google
        </a>
        <p className="mt-4 text-center text-xs text-white/70">
          En continuant, tu acceptes les{" "}
          <Link href="/conditions" className="underline underline-offset-2">
            conditions
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
