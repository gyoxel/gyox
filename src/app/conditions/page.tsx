import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata = { title: "Conditions · GX Salaire" };

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions" updated="6 octobre 2026">
      <p>En utilisant GX Salaire (gx-salaire.vercel.app), tu acceptes ces conditions.</p>

      <h2>Le service</h2>
      <p>
        GX Salaire t&apos;aide à suivre ton budget : ce qui rentre, ce qui sort, ce qui reste. C&apos;est un outil
        d&apos;organisation, pas un conseil financier, et les calculs dépendent de ce que tu saisis.
      </p>

      <h2>Ton compte</h2>
      <ul>
        <li>Tu te connectes avec ton compte Google, pour un usage personnel.</li>
        <li>Tu es responsable de ce que tu enregistres et de l&apos;accès à ton téléphone.</li>
      </ul>

      <h2>Disponibilité</h2>
      <p>
        Le service est fourni tel quel. Il peut évoluer, être interrompu pour maintenance ou s&apos;arrêter ; on fait au
        mieux pour garder tes données en sécurité.
      </p>

      <h2>Données</h2>
      <p>
        Ce qu&apos;on fait de tes données est décrit dans la{" "}
        <a href="/confidentialite" className="font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400">
          politique de confidentialité
        </a>
        .
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
