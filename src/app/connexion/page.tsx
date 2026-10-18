import Link from "next/link";
import { CalendarCheck, HandCoins, ShieldCheck, Wallet } from "@phosphor-icons/react/ssr";
import { GoogleIcon } from "@/components/google-icon";
import { ForgetOnMount } from "@/components/forget-on-mount";
import { LoginBackdrop } from "@/components/login-backdrop";
import { safeNext } from "@/lib/google-oauth";

export const metadata = { title: "GX Salaire · Ton budget du mois" };

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
  { icon: ShieldCheck, text: "Tes informations sont protégées" },
];

/** Sign-in (and the public home page Google links to). */
export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const error = ERRORS[String(params.erreur ?? "")];
  const next = safeNext(typeof params.suite === "string" ? params.suite : null);
  const href = next === "/" ? "/api/auth/google" : `/api/auth/google?suite=${encodeURIComponent(next)}`;

  return (
    <main className="gx-login relative -mb-[calc(env(safe-area-inset-bottom)+10.5rem)] flex min-h-dvh flex-col overflow-hidden px-6 pb-8 pt-14 text-white">
      <ForgetOnMount />
      <LoginBackdrop />
      <div className="relative flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-3xl font-black tracking-tight text-violet-700 shadow-[0_20px_40px_-16px_rgba(20,8,60,0.6),inset_0_-3px_8px_rgba(91,33,182,0.12)]">
          GX
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
          GX <span className="font-semibold text-white/85">Salaire</span>
        </h1>
        <p className="mt-2 max-w-xs text-sm text-white/80">Ton budget du mois, simple et clair : ce qui rentre, ce qui sort, ce qui reste.</p>
      </div>

      <ul className="relative mx-auto mt-10 flex w-full max-w-sm flex-col gap-3">
        {FEATURES.map(({ icon: Icon, text }) => (
          <li key={text} className="gx-wallet-chip flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
            <Icon weight="duotone" className="h-5 w-5 shrink-0 text-violet-100" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="relative mx-auto mt-auto w-full max-w-sm pt-10">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-rose-500/90 px-4 py-2.5 text-center text-sm font-medium">
            {error}
          </p>
        )}
        {/* A plain link: the sign-in leaves for Google and comes back. */}
        <a
          href={href}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-base font-semibold text-slate-800 shadow-[0_18px_36px_-16px_rgba(20,8,60,0.65),inset_0_-2px_6px_rgba(91,33,182,0.1)] transition-transform active:scale-[0.98]"
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
