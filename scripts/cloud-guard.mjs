/**
 * Le garde-fou de compilation : est-ce que le cloud part avec le paquet ?
 *
 * **Pourquoi il existe.** Le contrôle vivait dans les workflows GitHub : le
 * workflow de l'APK vérifiait que les deux variables publiques étaient bien
 * transmises au build, et prévenait « Cloud absent du bundle ». Les workflows ont
 * été **supprimés le 8 octobre 2026** — le jeu se déploie chez Vercel, l'APK
 * n'est plus distribué automatiquement — et la garde est revenue là où la
 * compilation se décide : dans `npm run build`, donc **des deux côtés**, Vercel
 * comme une APK construite à la main.
 *
 * **Pourquoi elle compte.** La panne la plus coûteuse est celle qui ne se voit
 * pas : sans les deux variables publiques, tout compile, tout se déploie, les
 * écrans sont identiques — mais il n'y a plus aucun compte, aucun échange,
 * aucun classement. Un avertissement dans le journal de compilation vaut mieux
 * qu'un joueur qui découvre le problème.
 *
 * **Ce qu'elle ne fait pas.** Elle ne fait **jamais** échouer la compilation :
 * c'est un avertissement, pas une porte fermée. Le mode sans cloud reste un
 * mode légitime — c'est celui du développement et des tests.
 *
 * Ce fichier s'importe (`cloudBuildWarning`) **et** s'exécute
 * (`node scripts/cloud-guard.mjs`), pour que le test et la compilation regardent
 * exactement le même message.
 */

/** Les deux variables publiques qui décident si le cloud est dans le paquet. */
export const CLOUD_ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

/**
 * Le message d'avertissement, ou `null` quand il n'y a rien à dire.
 *
 * `env` est l'environnement de compilation (`process.env` sur Vercel comme en
 * local). Une variable vide compte comme absente : c'est ce que produit un
 * `.env` recopié sans être rempli.
 */
export function cloudBuildWarning(env) {
  const manquantes = CLOUD_ENV_VARS.filter((nom) => {
    const valeur = typeof env?.[nom] === "string" ? env[nom].trim() : "";
    return valeur.length === 0;
  });
  if (manquantes.length === 0) return null;
  const liste = manquantes.join(" et ");
  const seule = manquantes.length === 1;
  const constat = seule ? `${liste} n'est pas définie` : `${liste} ne sont pas définies`;
  const consigne = seule
    ? `Renseigne-la`
    : `Renseigne-les (elles se trouvent dans Supabase → Settings → API)`;
  return (
    `Cloud absent du bundle : ${constat}. ` +
    `Le jeu se compilera sans cloud — aucun compte, aucun échange, aucun classement, ` +
    `et les boosters seront tirés par l'appareil. ${consigne}, ` +
    `puis relance la compilation (Vercel : redéploie après avoir changé une variable).`
  );
}

/** Écrit l'avertissement sur la sortie d'erreur, sans jamais faire échouer le build. */
export function warnIfCloudMissing(env, log = console.warn) {
  const message = cloudBuildWarning(env);
  if (!message) return false;
  log(`[CreatorDeck] ${message}`);
  return true;
}

// Exécuté directement (`node scripts/cloud-guard.mjs`, appelé par `npm run build`).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  warnIfCloudMissing(process.env);
}
