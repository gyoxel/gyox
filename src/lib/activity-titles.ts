// Historique's lines (lib/activity.ts): their kinds, actions and what each
// says. No database here: the page's list shows them in the browser.
import { msg } from "./i18n";

export type ActivityKind =
  | "expense"
  | "debt"
  | "payment"
  | "income"
  | "loan"
  | "repayment"
  | "savings"
  | "goal"
  | "deposit"
  | "daret"
  | "advance"
  | "transfer"
  | "adjust"
  | "category"
  | "budget"
  | "person"
  | "salary";

export type ActivityAction = "add" | "edit" | "delete" | "pay" | "unpay" | "stop" | "giveup" | "undo" | "take" | "payout" | "skip" | "unskip";

export interface Activity {
  id: string;
  at: string;
  kind: ActivityKind;
  action: ActivityAction;
  name: string;
  amount: number | null;
  detail: string | null;
}

/** What a line says, in French (translated where shown): « Dépense ajoutée »… */
export const ACTIVITY_TITLES: Record<string, string> = {
  "expense:add": msg("Dépense ajoutée"),
  "expense:edit": msg("Dépense modifiée"),
  "expense:delete": msg("Dépense supprimée"),
  "expense:skip": msg("Pas ce mois-ci"),
  "expense:unskip": msg("Ce mois rétabli"),
  "debt:add": msg("Dette ajoutée"),
  "debt:edit": msg("Dette modifiée"),
  "debt:delete": msg("Dette supprimée"),
  "debt:skip": msg("Mois reporté"),
  "debt:unskip": msg("Ce mois rétabli"),
  "payment:pay": msg("Paiement"),
  "payment:edit": msg("Paiement modifié"),
  "payment:unpay": msg("Paiement annulé"),
  "income:add": msg("Revenu ajouté"),
  "income:edit": msg("Revenu modifié"),
  "income:delete": msg("Revenu supprimé"),
  "loan:add": msg("Argent prêté"),
  "loan:edit": msg("Prêt modifié"),
  "loan:delete": msg("Prêt supprimé"),
  "loan:giveup": msg("Prêt abandonné"),
  "loan:undo": msg("Prêt repris"),
  "repayment:add": msg("Argent rendu"),
  "repayment:edit": msg("Remboursement modifié"),
  "repayment:delete": msg("Remboursement supprimé"),
  "savings:add": msg("Mis de côté"),
  "savings:take": msg("Repris de l'épargne"),
  "savings:edit": msg("Épargne modifiée"),
  "savings:delete": msg("Épargne supprimée"),
  "savings:stop": msg("Épargne mensuelle arrêtée"),
  "goal:add": msg("Objectif ajouté"),
  "goal:edit": msg("Objectif modifié"),
  "goal:delete": msg("Objectif supprimé"),
  "deposit:add": msg("Versement"),
  "deposit:edit": msg("Versement modifié"),
  "deposit:delete": msg("Versement supprimé"),
  "deposit:stop": msg("Versement mensuel arrêté"),
  "daret:add": msg("Daret ajoutée"),
  "daret:edit": msg("Daret modifiée"),
  "daret:delete": msg("Daret supprimée"),
  "daret:payout": msg("Daret reçue"),
  "advance:add": msg("Avance sur salaire"),
  "advance:delete": msg("Avance supprimée"),
  "transfer:add": msg("Transfert"),
  "transfer:delete": msg("Transfert supprimé"),
  "adjust:add": msg("Ajustement du solde"),
  "adjust:delete": msg("Ajustement supprimé"),
  "category:add": msg("Catégorie ajoutée"),
  "category:edit": msg("Catégorie modifiée"),
  "category:delete": msg("Catégorie supprimée"),
  "budget:edit": msg("Budget modifié"),
  "budget:delete": msg("Budget supprimé"),
  "person:add": msg("Personne ajoutée"),
  "person:edit": msg("Personne renommée"),
  "person:delete": msg("Personne retirée"),
  "salary:edit": msg("Salaire modifié"),
  "salary:add": msg("Salaire reçu"),
  "salary:undo": msg("Salaire reçu annulé"),
};
