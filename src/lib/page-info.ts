// What each page's « i » says (page-info.tsx): its name, what it is in a
// line or two, and everything one can do there. In French; translated
// where it's shown, like every text.
import { msg } from "./i18n";

export interface PageInfo {
  title: string;
  summary: string;
  points: string[];
}

export const PAGE_INFO: Record<string, PageInfo> = {
  // ---- Sections ----
  budget: {
    title: msg("Dépenses"),
    summary: msg(
      "Toutes tes dépenses du mois (sauf les dettes) : ce que tu as déjà payé, ce qui reste à payer, rangé par catégorie.",
    ),
    points: [
      msg("Voir le total du mois, ce qui est payé et ce qui reste, avec le pourcentage."),
      msg("Une catégorie qui a un budget montre ce qui en est dépensé, en vert, orange ou rouge."),
      msg("Changer de mois avec ‹ › pour voir les mois passés ou à venir."),
      msg("Ajouter une dépense avec le bouton + (une fois, chaque mois ou pendant X mois)."),
      msg("Toucher une dépense pour l'ouvrir : la payer, la modifier, corriger un paiement ou la supprimer."),
      msg("Voir le statut de chacune : payée (espèces ou carte), payée en partie, à payer ou à venir."),
    ],
  },
  credits: {
    title: msg("Dettes"),
    summary: msg("Ce que tu rembourses chaque mois (crédit, argent emprunté à quelqu'un…) et quand chaque dette se termine."),
    points: [
      msg("Voir le total qui reste à rembourser et ce que tu paies chaque mois."),
      msg("Suivre la frise mois par mois : combien tu paies, et le mois où chaque dette se termine."),
      msg("Ajouter une dette avec le bouton + : le total, le montant par mois ou le nombre de mois."),
      msg("Toucher une dette pour payer sa mensualité, la modifier ou la supprimer."),
      msg("Une mensualité payée en partie : le reste s'ajoute à la dernière mensualité."),
    ],
  },
  salary: {
    title: msg("Salaire"),
    summary: msg("Ton salaire du mois : combien, quel jour, sur quel compte, et ce que tu en as déjà pris en avance."),
    points: [
      msg("Voir le montant, le jour de paie, le compte (espèces ou carte) et les jours avant la prochaine paie."),
      msg("Confirmer que tu as reçu ton salaire (même en avance, jusqu'à 7 jours avant) : il s'ajoute à ton solde."),
      msg("Prendre une avance sur salaire : elle s'ajoute tout de suite et sera retirée du salaire du mois."),
      msg("Modifier le montant, le jour de paie ou le compte."),
      msg("Voir la liste des salaires déjà reçus."),
    ],
  },
  incomes: {
    title: msg("Revenus"),
    summary: msg("L'argent qui entre en plus du salaire : prime, freelance, vente, cadeau, remboursement…"),
    points: [
      msg("Voir le total du mois et chaque revenu, jour par jour."),
      msg("Changer de mois avec ‹ ›."),
      msg("Ajouter un revenu avec le bouton + : il s'ajoute à ton solde (espèces ou carte)."),
      msg("Toucher un revenu pour le modifier ou le supprimer."),
      msg("Les revenus créés par l'app (argent emprunté, retrait d'épargne, remboursement d'un prêt) se gèrent depuis leur page d'origine."),
    ],
  },
  solde: {
    title: msg("Solde"),
    summary: msg("L'argent que tu as maintenant : en espèces et sur la carte, avec tout l'historique des mouvements."),
    points: [
      msg("Voir ton solde actuel, les espèces et la carte, et ton épargne à part."),
      msg("Transférer de l'argent entre espèces, carte et épargne (retrait au guichet, versement…)."),
      msg("Ajuster un compte : indique ce que tu as vraiment, la différence est enregistrée."),
      msg("Toucher un compte pour filtrer l'historique."),
      msg("Voir chaque entrée et sortie, jour par jour, et supprimer un transfert ou un ajustement."),
    ],
  },
  epargne: {
    title: msg("Épargne"),
    summary: msg("L'argent mis de côté, en dehors de ton solde actuel."),
    points: [
      msg("Mettre de côté : l'argent sort de ton solde et s'ajoute à tes dépenses comme épargne."),
      msg("« Chaque mois » : elle revient chaque mois dans tes dépenses ; chaque mois coché s'ajoute à l'épargne."),
      msg("Un mois peut être moins (ou plus) avec le crayon, comme une dépense : seul ce qui est payé compte, et rien ne passe au mois suivant."),
      msg("Retirer de l'épargne : l'argent revient dans ton solde comme un revenu."),
      msg("Ajouter une épargne que tu avais déjà (« J'ai déjà une épargne »), sans toucher ton solde."),
      msg("Voir ce qui a été mis de côté et retiré ce mois-ci, et chaque mouvement avec sa note."),
      msg("Toucher un mouvement pour le modifier ou le supprimer."),
    ],
  },
  budgets: {
    title: msg("Budgets"),
    summary: msg(
      "Le maximum à dépenser dans une catégorie chaque mois (Alimentation 2 000 DH…). Rien ne sort de ton solde : tes dépenses de la catégorie s'additionnent.",
    ),
    points: [
      msg("Voir ce qui reste de chaque budget ce mois-ci, ou de combien il est dépassé."),
      msg("La barre est verte, passe à l'orange à 80 % et au rouge si tu dépasses."),
      msg("Changer de mois avec ‹ › ; chaque mois repart de zéro."),
      msg("Toucher un budget pour changer son montant, voir ses dépenses ou le retirer."),
      msg("En bas, les catégories sans budget où tu as dépensé : touche-en une pour lui en donner un."),
    ],
  },
  daret: {
    title: msg("Daret"),
    summary: msg("Tes darets : la cotisation de chaque mois, et le mois où c'est ton tour de recevoir."),
    points: [
      msg("Voir chaque daret : cotisation, membres, tour actuel et ton tour."),
      msg("Marquer la cotisation du mois comme payée (espèces ou carte), ou l'annuler."),
      msg("Confirmer que tu as reçu la daret à ton tour : elle s'ajoute à ton solde."),
      msg("Ajouter une daret avec le bouton +, ou toucher une daret pour la modifier."),
    ],
  },
  prets: {
    title: msg("Argent prêté"),
    summary: msg("L'argent que tu as prêté à quelqu'un, et ce qu'on te rend chaque mois."),
    points: [
      msg("Voir ce qu'il reste à récupérer, au total et pour chaque personne."),
      msg("Prêter de l'argent avec le bouton + : il peut sortir de ton solde (dans tes dépenses)."),
      msg("Confirmer un remboursement reçu (« Reçu ? ») : il revient dans ton solde."),
      msg("Toucher un prêt pour voir chaque mois, corriger un remboursement ou le modifier."),
      msg("Ce qui t'est rendu ne compte pas comme un revenu : il sort de tes dépenses du mois du prêt. Seul ce qui n'est pas encore revenu compte (bilan, statistiques)."),
    ],
  },
  pret: {
    title: msg("Argent prêté"),
    summary: msg("Un prêt en détail : ce qui est revenu, et chaque mois de remboursement."),
    points: [
      msg("Voir le montant prêté, ce qui est reçu et ce qu'il reste à te rendre."),
      msg("Pour un mois arrivé : « J'ai reçu » enregistre combien on t'a rendu, et comment."),
      msg("Reçu moins que prévu : le reste passe au mois suivant. Plus : les mois suivants attendent moins."),
      msg("Toucher un remboursement pour corriger son montant, espèces ou carte, ou le supprimer."),
      msg("Modifier ou supprimer le prêt."),
    ],
  },
  goals: {
    title: msg("Objectifs"),
    summary: msg("Ce que tu veux t'offrir (voiture, maison, voyage…) et où tu en es."),
    points: [
      msg("Voir la progression de tous tes objectifs et de chacun."),
      msg("Ajouter un versement directement depuis la liste."),
      msg("Créer un objectif avec le bouton +."),
      msg("Toucher un objectif pour voir son détail, ses étapes et ses simulations."),
    ],
  },
  goal: {
    title: msg("Objectif"),
    summary: msg("Un objectif en détail : ce que tu as déjà, ce qu'il manque et comment y arriver."),
    points: [
      msg("Voir le pourcentage atteint, ce qui est déjà là et ce qu'il manque."),
      msg("Ajouter un versement (espèces, carte ou épargne)."),
      msg("« Chaque mois » : le versement revient chaque mois dans tes dépenses ; chaque mois coché s'ajoute à l'objectif."),
      msg("Un mois peut être moins (ou plus) avec le crayon, comme une dépense : seul ce qui est payé compte, et rien ne passe au mois suivant."),
      msg("Voir les étapes : épargne de départ, chaque versement et chaque daret liée."),
      msg("Simuler : combien tu auras en mettant X par mois, ou combien mettre pour finir avant une date."),
      msg("Modifier ou supprimer l'objectif."),
    ],
  },

  // ---- Ajouter ----
  "expense-new": {
    title: msg("Ajouter une dépense"),
    summary: msg("Une nouvelle dépense : son montant, son nom, sa catégorie et sa durée."),
    points: [
      msg("Indiquer le montant, le nom et choisir une catégorie."),
      msg("Choisir la fréquence : une fois, chaque mois, pendant X mois ou jusqu'à atteindre un total."),
      msg("Dire si elle est déjà payée et comment (espèces ou carte) : elle sort alors de ton solde."),
      msg("Ajouter une note si tu veux."),
    ],
  },
  "expense-quick": {
    title: msg("Dépense rapide"),
    summary: msg("Une petite dépense payée aujourd'hui, en un geste : taxi, café, courses…"),
    points: [
      msg("Garder le doigt sur + : le cercle se remplit et ouvre la dépense rapide (un simple appui ouvre le menu)."),
      msg("Indiquer le montant, choisir la catégorie et espèces ou carte ; la note est optionnelle."),
      msg("Elle est payée tout de suite : elle sort de ton solde et s'ajoute à tes dépenses du mois."),
      msg("Une catégorie avec un budget montre où il en sera."),
      msg("La prochaine fois, la même catégorie et le même compte sont déjà choisis."),
    ],
  },
  "credit-new": {
    title: msg("Ajouter une dette"),
    summary: msg("Une nouvelle dette : le total à rembourser et comment tu le rembourses chaque mois."),
    points: [
      msg("Indiquer le total de la dette et à qui (banque, une personne…)."),
      msg("Choisir le montant par mois ou le nombre de mois : la date de fin est calculée."),
      msg("Ajouter un montant déjà remboursé avant de la noter ici."),
      msg("Si tu viens de recevoir cet argent, l'ajouter à ton solde (espèces ou carte)."),
      msg("Dire si la mensualité de ce mois est déjà payée."),
    ],
  },
  "income-new": {
    title: msg("Ajouter un revenu"),
    summary: msg("De l'argent reçu en plus du salaire."),
    points: [
      msg("Indiquer le montant reçu et choisir une catégorie (prime, freelance, vente…)."),
      msg("Donner un nom, ou garder celui de la catégorie."),
      msg("Choisir où il arrive (espèces ou carte) : il s'ajoute à ton solde."),
      msg("Ajouter une note si tu veux."),
    ],
  },
  "goal-new": {
    title: msg("Ajouter un objectif"),
    summary: msg("Un nouvel objectif : ce que tu veux atteindre et comment."),
    points: [
      msg("Choisir une idée (voiture, maison, voyage…) ou créer la tienne, avec son icône."),
      msg("Indiquer le montant à atteindre et ce que tu as déjà de côté."),
      msg("Ajouter une épargne par mois ou une date : l'app calcule l'autre."),
      msg("Relier des darets : ce qu'elles te rapportent compte pour l'objectif."),
    ],
  },
  "daret-new": {
    title: msg("Ajouter une daret"),
    summary: msg("Une nouvelle daret : la cotisation, les membres et ton tour."),
    points: [
      msg("Indiquer la cotisation par mois : l'app calcule ce que tu reçois."),
      msg("Choisir le nombre de membres (= nombre de mois) avec − et +."),
      msg("Choisir le premier mois, puis le mois où c'est ton tour."),
      msg("Chaque cotisation apparaît dans tes dépenses du mois."),
    ],
  },
  "budget-new": {
    title: msg("Ajouter un budget"),
    summary: msg("Le maximum à dépenser dans une catégorie chaque mois."),
    points: [
      msg("Indiquer le montant et choisir la catégorie."),
      msg("Voir ce que tu y dépenses ce mois-ci et le mois d'avant, pour choisir le montant."),
      msg("Une catégorie qui a déjà un budget : son montant est remplacé."),
    ],
  },
  "pret-new": {
    title: msg("Prêter de l'argent"),
    summary: msg("Un nouveau prêt : combien, à qui, et comment on te le rend."),
    points: [
      msg("Indiquer le montant prêté et à qui."),
      msg("Ajouter un montant déjà rendu avant de le noter ici."),
      msg("Dire si l'argent sort de ton solde (espèces ou carte) : il s'ajoute alors à tes dépenses."),
      msg("Choisir le montant par mois ou le nombre de mois, et le premier mois de remboursement."),
    ],
  },

  // ---- Modifier ----
  "expense-edit": {
    title: msg("Modifier la dépense"),
    summary: msg("Tout ce qu'on peut changer sur une dépense, et ses paiements du mois."),
    points: [
      msg("Payer la dépense du mois, en une fois ou en partie (espèces ou carte)."),
      msg("Toucher un paiement pour corriger son montant, espèces ou carte, ou le supprimer."),
      msg("Changer le montant, le nom, la catégorie ou la fréquence."),
      msg("Changer le statut : payée ou pas encore."),
      msg("Supprimer la dépense avec la poubelle."),
    ],
  },
  "credit-edit": {
    title: msg("Modifier la dette"),
    summary: msg("Tout ce qu'on peut changer sur une dette, et ses paiements du mois."),
    points: [
      msg("Payer la mensualité du mois, en une fois ou en partie (espèces ou carte)."),
      msg("Toucher un paiement pour le corriger ou le supprimer."),
      msg("Changer le total, le montant déjà remboursé, le montant par mois ou le nombre de mois."),
      msg("Voir le reste à rembourser et le mois de fin."),
      msg("Supprimer la dette avec la poubelle."),
    ],
  },
  "income-edit": {
    title: msg("Modifier le revenu"),
    summary: msg("Changer un revenu déjà enregistré."),
    points: [
      msg("Changer le montant, le nom, la catégorie ou le compte (espèces ou carte)."),
      msg("Changer la note."),
      msg("Supprimer le revenu : ton solde est recalculé."),
    ],
  },
  "daret-edit": {
    title: msg("Modifier la daret"),
    summary: msg("Changer une daret existante."),
    points: [
      msg("Changer la cotisation, le nom ou le nombre de membres."),
      msg("Changer le premier mois ou ton tour."),
      msg("Supprimer la daret et ses cotisations."),
    ],
  },
  "budget-edit": {
    title: msg("Budget"),
    summary: msg("Le budget d'une catégorie : son montant, ce qui en est dépensé et les dépenses qui le font."),
    points: [
      msg("Changer le montant : il compte pour tous les mois."),
      msg("Toucher une dépense pour l'ouvrir."),
      msg("Retirer le budget : la catégorie et ses dépenses restent."),
    ],
  },
  "goal-edit": {
    title: msg("Modifier l'objectif"),
    summary: msg("Changer un objectif existant."),
    points: [
      msg("Changer le nom, l'icône, le montant à atteindre ou ce qui est déjà épargné."),
      msg("Changer l'épargne par mois ou la date."),
      msg("Relier ou retirer des darets."),
      msg("Supprimer l'objectif."),
    ],
  },
  "deposit-edit": {
    title: msg("Modifier le versement"),
    summary: msg("Changer un versement fait pour un objectif."),
    points: [
      msg("Changer le montant ou le nom."),
      msg("Changer d'où il est pris (espèces ou carte)."),
      msg("Le marquer payé ou pas encore : pas encore payé, il ne compte pas."),
      msg("Chaque mois : le nouveau montant compte pour les mois à venir ; « Arrêter chaque mois » garde ce qui est déjà mis de côté."),
      msg("Supprimer le versement (et sa dépense)."),
    ],
  },
  "savings-edit": {
    title: msg("Modifier l'épargne"),
    summary: msg("Changer un mouvement d'épargne (mis de côté ou retiré)."),
    points: [
      msg("Changer le montant ou la note."),
      msg("Changer le compte (espèces ou carte)."),
      msg("Chaque mois : le nouveau montant compte pour les mois à venir ; « Arrêter chaque mois » garde ce qui est déjà mis de côté."),
      msg("Supprimer le mouvement : ton solde et ton épargne sont recalculés."),
    ],
  },
  "pret-edit": {
    title: msg("Modifier le prêt"),
    summary: msg("Changer un prêt existant."),
    points: [
      msg("Changer le montant, le nom ou le montant déjà rendu."),
      msg("Changer si l'argent est sorti de ton solde, et comment."),
      msg("Changer le montant par mois, le nombre de mois ou le premier mois."),
      msg("Supprimer le prêt."),
    ],
  },

  // ---- Others ----
  stats: {
    title: msg("Statistiques"),
    summary: msg("Comment ton salaire est utilisé, et ce qui t'attend les prochains mois."),
    points: [
      msg("Voir la part de ton salaire déjà dépensée ce mois-ci, et ce qui est disponible."),
      msg("Voir la répartition du budget d'un mois : permanentes, dettes et dépenses. Touche une part pour le détail."),
      msg("Voir le mois où tes dettes et obligations temporaires seront terminées."),
      msg("Voir où va ton argent, catégorie par catégorie, comparé au mois précédent (et à son budget, si elle en a un). Touche une catégorie pour son détail."),
      msg("Voir les prévisions des prochains mois : dépenses face au salaire. Touche un mois pour l'ouvrir."),
    ],
  },
  calendar: {
    title: msg("Calendrier"),
    summary: msg("Ton argent jour par jour : ce qui est entré, ce qui est sorti, et ce qu'il faut savoir."),
    points: [
      msg("Voir sous chaque jour les entrées (vert) et les sorties (rouge)."),
      msg("Changer de mois avec ‹ › ou en glissant sur la grille."),
      msg("Toucher un jour pour voir ses mouvements et ses rappels (fin d'une dette, ton tour de daret, objectif…)."),
      msg("Écrire une note pour un jour, la modifier ou la supprimer."),
    ],
  },
  bilan: {
    title: msg("Bilan du mois"),
    summary: msg("Le résumé d'un mois : ce qui est entré, ce qui est sorti, ce qui reste, et où est allé ton argent."),
    points: [
      msg("Voir les entrées, les sorties et ce qui reste en espèces et sur la carte, comparés au mois précédent."),
      msg("Voir ce qui a été mis de côté dans l'épargne."),
      msg("Voir les dépenses par catégorie. Touche une catégorie pour son détail."),
      msg("Changer de mois avec ‹ ›. Il s'ouvre sur le mois en cours."),
      msg("Les premiers jours du mois, ce bilan apparaît aussi sur l'Accueil."),
    ],
  },
  categories: {
    title: msg("Catégories"),
    summary: msg("Les catégories qui rangent tes dépenses et tes revenus."),
    points: [
      msg("Passer des catégories de dépenses à celles de revenus."),
      msg("Ajouter une catégorie avec son nom et son emoji."),
      msg("Toucher une catégorie pour la renommer, changer son emoji ou la supprimer."),
      msg("Maintenir une catégorie puis la glisser pour changer l'ordre, puis « Enregistrer l'ordre »."),
      msg("Réinitialiser pour retrouver les catégories d'origine."),
    ],
  },
  linked: {
    title: msg("Créé par l'app"),
    summary: msg("Cette ligne a été créée par une autre partie de l'app (épargne, daret, objectif, prêt…)."),
    points: [
      msg("Voir son montant, sa date et d'où elle vient."),
      msg("Ouvrir sa page d'origine avec le bouton : c'est là qu'on la modifie ou la supprime."),
    ],
  },
};
