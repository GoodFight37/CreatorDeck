/**
 * Règles de saisie d'un compte (adresse e-mail, mot de passe).
 *
 * Fonctions pures, partagées par l'interface (qui prévient pendant la frappe)
 * et par le store (qui revérifie avant l'appel réseau) : une seule vérité, donc
 * un message identique partout.
 *
 * Pourquoi un mot de passe alors que le jeu se connecte par code à 6 chiffres ?
 * Parce que le code **part par e-mail**, et que le service d'e-mail de Supabase
 * ne parle qu'à l'équipe du projet tant qu'aucun SMTP n'est branché. Le
 * mot de passe, lui, ne demande **aucun e-mail** : c'est la seule façon de
 * retrouver sa collection sur un autre appareil sans configurer quoi que ce
 * soit. Il ne peut en revanche pas se récupérer tout seul (pas de « mot de
 * passe oublié » sans SMTP) — l'interface le dit.
 */

/** Longueur minimale demandée (Supabase en accepte 6 par défaut). */
export const PASSWORD_MIN = 8;
/** Garde-fou : au-delà, les algorithmes de hachage tronquent de toute façon. */
export const PASSWORD_MAX = 100;

/** Problème d'adresse e-mail, ou `null` si elle est utilisable. */
export function emailProblem(raw: string): string | null {
  const email = raw.trim();
  if (!email) return "Adresse e-mail manquante.";
  if (email.length > 254) return "Adresse e-mail trop longue.";
  // Un « @ », quelque chose avant, un point après : on ne refait pas la RFC,
  // on écarte juste les fautes de frappe évidentes.
  const match = /^([^\s@]+)@([^\s@.]+\.)+[^\s@.]+$/.exec(email);
  if (!match) return "Adresse e-mail incomplète (exemple : toi@exemple.fr).";
  return null;
}

/** Problème de mot de passe, ou `null` s'il est acceptable. */
export function passwordProblem(raw: string): string | null {
  if (!raw) return "Mot de passe manquant.";
  if (raw.length < PASSWORD_MIN) return `Mot de passe trop court : ${PASSWORD_MIN} caractères minimum.`;
  if (raw.length > PASSWORD_MAX) return `Mot de passe trop long : ${PASSWORD_MAX} caractères maximum.`;
  if (!raw.trim()) return "Le mot de passe ne peut pas être fait d'espaces.";
  return null;
}

/**
 * Ce que le joueur doit retenir : son mot de passe n'est pas récupérable.
 *
 * Texte affiché tel quel à côté du champ, pour qu'il ne découvre pas la limite
 * au moment où il en aurait besoin.
 */
export const PASSWORD_WARNING =
  "Note-le quelque part : sans SMTP configuré, ce mot de passe ne peut pas être récupéré.";
