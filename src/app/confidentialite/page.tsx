import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Confidentialité · GX Salaire" };

const MAIL = "font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400";

export default async function ConfidentialitePage() {
  const { t } = await getI18n();
  return (
    <LegalPage title={t("Confidentialité")} updated="2026-10-06">
      <p>
        {t(
          "GX Salaire est une application de suivi de budget personnel : salaire, dépenses, dettes, darets, argent prêté, épargne et objectifs. Cette page explique quelles données elle utilise et comment.",
        )}
      </p>

      <h2>{t("Données utilisées")}</h2>
      <ul>
        <li>
          <strong>{t("Ton compte Google")}</strong> :{" "}
          {t(
            "ton nom, ton adresse e-mail, ta photo de profil et l'identifiant de ton compte, uniquement pour te connecter. GX Salaire n'a accès ni à tes e-mails, ni à tes contacts, ni à tes fichiers.",
          )}
        </li>
        <li>
          <strong>{t("Ce que tu saisis")}</strong> :{" "}
          {t("montants, dépenses, dettes, revenus, darets, argent prêté, épargne, objectifs et notes.")}
        </li>
      </ul>

      <h2>{t("Utilisation")}</h2>
      <p>
        {t(
          "Ces données servent uniquement à faire fonctionner l'application et à t'afficher ton budget. Pas de publicité, pas de revente, pas de partage avec des tiers.",
        )}
      </p>

      <h2>{t("Stockage et sécurité")}</h2>
      <p>
        {t(
          "L'application est hébergée par Vercel et ses données dans une base PostgreSQL (Prisma), en Europe (Paris). Tout passe par une connexion chiffrée (HTTPS), et chaque compte ne voit que ses propres données.",
        )}
      </p>

      <h2>{t("Cookies")}</h2>
      <p>{t("Deux petits cookies : un pour rester connecté, un pour la langue choisie. Aucun cookie publicitaire ni de suivi.")}</p>

      <h2>{t("Conservation et suppression")}</h2>
      <p>
        {t("Tes données sont gardées tant que ton compte existe. Pour supprimer ton compte et toutes ses données, écris à")}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className={MAIL}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2>{t("Contact")}</h2>
      <p>
        {t("Une question sur tes données :")}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className={MAIL}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
