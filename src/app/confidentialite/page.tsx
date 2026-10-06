import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata = { title: "Confidentialité · GX Salaire" };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Confidentialité" updated="6 octobre 2026">
      <p>
        GX Salaire est une application de suivi de budget personnel : salaire, dépenses, crédits, darets, prêts, épargne et
        objectifs. Cette page explique quelles données elle utilise et comment.
      </p>

      <h2>Données utilisées</h2>
      <ul>
        <li>
          <strong>Ton compte Google</strong> : ton nom, ton adresse e-mail, ta photo de profil et l&apos;identifiant de ton
          compte, uniquement pour te connecter. GX Salaire n&apos;a accès ni à tes e-mails, ni à tes contacts, ni à tes
          fichiers.
        </li>
        <li>
          <strong>Ce que tu saisis</strong> : montants, dépenses, crédits, revenus, darets, prêts, épargne, objectifs et
          notes.
        </li>
      </ul>

      <h2>Utilisation</h2>
      <p>
        Ces données servent uniquement à faire fonctionner l&apos;application et à t&apos;afficher ton budget. Pas de
        publicité, pas de revente, pas de partage avec des tiers.
      </p>

      <h2>Stockage et sécurité</h2>
      <p>
        L&apos;application est hébergée par Vercel et ses données dans une base PostgreSQL (Prisma), en Europe (Paris).
        Tout passe par une connexion chiffrée (HTTPS), et chaque compte ne voit que ses propres données.
      </p>

      <h2>Cookies</h2>
      <p>Un seul cookie, pour rester connecté. Aucun cookie publicitaire ni de suivi.</p>

      <h2>Conservation et suppression</h2>
      <p>
        Tes données sont gardées tant que ton compte existe. Pour supprimer ton compte et toutes ses données, écris à{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2>Contact</h2>
      <p>
        Une question sur tes données :{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-teal-700 underline underline-offset-2 dark:text-teal-400">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
