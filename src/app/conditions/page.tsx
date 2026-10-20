import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Conditions · GX Salaire" };

const LINK = "font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400";

export default async function ConditionsPage() {
  const { t } = await getI18n();
  return (
    <LegalPage title={t("Conditions")} updated="2026-10-06">
      <p>{t("En utilisant GX Salaire (gxsalaire.ma), tu acceptes ces conditions.")}</p>

      <h2>{t("Le service")}</h2>
      <p>
        {t(
          "GX Salaire t'aide à suivre ton budget : ce qui rentre, ce qui sort, ce qui reste. C'est un outil d'organisation, pas un conseil financier, et les calculs dépendent de ce que tu saisis.",
        )}
      </p>

      <h2>{t("Ton compte")}</h2>
      <ul>
        <li>{t("Tu te connectes avec ton compte Google, pour un usage personnel.")}</li>
        <li>{t("Tu es responsable de ce que tu enregistres et de l'accès à ton téléphone.")}</li>
      </ul>

      <h2>{t("Disponibilité")}</h2>
      <p>
        {t(
          "Le service est fourni tel quel. Il peut évoluer, être interrompu pour maintenance ou s'arrêter ; on fait au mieux pour garder tes données en sécurité.",
        )}
      </p>

      <h2>{t("Données")}</h2>
      <p>
        {t("Ce qu'on fait de tes données est décrit dans la")}{" "}
        <a href="/confidentialite" className={LINK}>
          {t("politique de confidentialité")}
        </a>
        .
      </p>

      <h2>{t("Contact")}</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
