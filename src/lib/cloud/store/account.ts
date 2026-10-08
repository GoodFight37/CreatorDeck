import type { AccountOutcome, OAuthOutcome, CloudActionOutcome } from "./types";
import type { CloudStoreContext } from "./context";
import { pushSupported, readPushToken, requestPushToken, writePushToken } from "@/lib/push";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { buildInbox, seenKey, unreadCount } from "@/lib/social/inbox";
import { decideSync, syncStats } from "@/lib/cloud/sync";
import { emailProblem, passwordProblem } from "@/lib/cloud/credentials";
import { normalizeShowcase } from "@/lib/cloud/showcase";
import { parseOAuthReturn } from "@/lib/cloud/twitch";
import { sanitizeState } from "@/lib/save-store";
import { stateFingerprint } from "@/lib/cloud/sync";
import { type MarketListing, type LeaderboardMetric } from "@/lib/cloud/api";
import { EMPTY_FRIEND_LISTS } from "@/lib/social/friends";
import { MAX_SHOWCASE } from "@/lib/cloud/showcase";

/**
 * Les actions « account » du magasin cloud : mêmes corps qu'avant la
 * découpe, mais reçus par le contexte (`ctx`) au lieu d'être des méthodes
 * d'objet. Aucun comportement n'a changé.
 */
export function accountActions(ctx: CloudStoreContext) {
  return {
    async requestCode(email: string): Promise<void> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return;
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        await api.requestOtp(email);
        ctx.publish({ busy: false, message: "Code envoyé : regarde ta boîte e-mail (et les indésirables).", isError: false });
      } catch (error) {
        ctx.fail(error, "Envoi du code impossible.");
      }
    },

    async verifyCode(email: string, token: string): Promise<boolean> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.verifyOtp(email, token.trim());
        const adopted = await ctx.adoptCloudIfEmpty();
        ctx.publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          wishlistSlug: null,
          userId: session.userId,
          message: ctx.connectedMessage(adopted),
          isError: false,
        });
        return true;
      } catch (error) {
        ctx.fail(error, "Code refusé.");
        return false;
      }
    },

    /** Crée un compte invité (sans e-mail) et s'y connecte immédiatement. */
    async signInAsGuest(): Promise<boolean> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.signInAnonymously();
        ctx.publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          wishlistSlug: null,
          userId: session.userId,
          message: "Compte invité créé. Donne-toi un nom, puis envoie ta collection.",
          isError: false,
        });
        return true;
      } catch (error) {
        ctx.fail(error, "Création du compte invité impossible.");
        return false;
      }
    },

    /**
     * Connexion par adresse e-mail et mot de passe.
     *
     * Le chemin qui ne dépend d'aucun envoi d'e-mail : c'est ce qui permet de
     * retrouver une collection sur un autre appareil sans SMTP, pour peu qu'un
     * mot de passe ait été attaché au compte (voir `keepAccount`).
     */
    async signInWithPassword(email: string, password: string): Promise<boolean> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      const address = email.trim();
      const problem = emailProblem(address) ?? passwordProblem(password);
      if (problem) {
        ctx.publish({ busy: false, message: problem, isError: true });
        return false;
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.signInWithPassword(address, password);
        const adopted = await ctx.adoptCloudIfEmpty();
        ctx.publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          wishlistSlug: null,
          userId: session.userId,
          message: ctx.connectedMessage(adopted),
          isError: false,
        });
        return true;
      } catch (error) {
        ctx.fail(error, "Connexion impossible.");
        return false;
      }
    },

    /**
     * Garde le compte : attache une adresse, un mot de passe, ou les deux.
     *
     * Deux chemins, selon ce que le joueur choisit :
     *
     *  * **adresse + mot de passe** — le mot de passe n'envoie aucun e-mail,
     *    donc **aucun SMTP n'est nécessaire** : l'adresse est appliquée tout de
     *    suite et le compte est récupérable ailleurs par adresse + mot de passe ;
     *  * **adresse seule** — Supabase envoie un code à 6 chiffres (SMTP requis)
     *    et l'adresse reste *en attente* jusqu'à ce que le code soit saisi ici
     *    (`confirmEmailCode`).
     *
     * Un compte invité ne peut pas recevoir un mot de passe **sans** adresse :
     * GoTrue le refuse, et l'écran demande donc l'adresse en premier.
     */
    async keepAccount(update: { email?: string; password?: string }): Promise<AccountOutcome> {
      const api = ctx.resolve();
      const wanted = update.email?.trim() ?? "";
      const password = update.password ?? "";
      if (!api) {
        ctx.publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT };
      }
      if (!api.session()) {
        const message = "Connecte-toi d'abord (compte invité) pour garder ce compte.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      if (!wanted && !password) {
        const message = "Indique au moins une adresse : un compte invité ne peut pas recevoir un mot de passe sans adresse.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      if (!wanted && !ctx.state().email) {
        const message = "Un compte invité a besoin d'une adresse : c'est elle qui permet de te reconnecter ailleurs.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      const problem = (wanted ? emailProblem(wanted) : null) ?? (password ? passwordProblem(password) : null);
      if (problem) {
        ctx.publish({ busy: false, message: problem, isError: true });
        return { status: "unavailable", reason: "error", message: problem };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const result = await api.updateAccount({ ...(wanted ? { email: wanted } : {}), ...(password ? { password } : {}) });
        if (!result.applied) {
          const pending = result.pendingEmail ?? wanted;
          const message = `Un code à 6 chiffres part vers ${pending}. Saisis-le ici pour valider l'adresse. S'il n'arrive pas, choisis plutôt un mot de passe : il ne demande aucun envoi.`;
          ctx.publish({ busy: false, pendingEmail: pending, message, isError: false });
          return { status: "pending", message };
        }
        const address = result.email ?? wanted;
        const message = password && wanted
          ? `Adresse ${address} attachée, avec un mot de passe. Sur un autre appareil, connecte-toi avec cette adresse et ce mot de passe : ta progression te suivra.`
          : password
            ? "Mot de passe enregistré. Sur un autre appareil, connecte-toi avec ton adresse et ce mot de passe."
            : `Adresse ${address} attachée. Sur un autre appareil : « Recevoir un code par e-mail », et ta progression te suivra.`;
        ctx.publish({ busy: false, email: address ?? ctx.state().email, pendingEmail: null, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Enregistrement impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Termine un changement d'adresse avec le code à 6 chiffres reçu par
     * e-mail. C'est la seule fin possible depuis l'app : un lien de
     * confirmation renvoie vers une page web, et il n'y a pas de serveur pour
     * la recevoir.
     */
    async confirmEmailCode(code: string): Promise<AccountOutcome> {
      const api = ctx.resolve();
      const pending = ctx.state().pendingEmail;
      if (!api) {
        ctx.publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT };
      }
      if (!api.session()) {
        const message = "Session perdue : reconnecte-toi pour valider l'adresse.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      if (!pending) {
        const message = "Aucune adresse n'attend de confirmation.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      const token = code.replace(/\s/g, "");
      if (!/^\d{6}$/.test(token)) {
        const message = "Le code fait 6 chiffres.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.verifyEmailChange(pending, token);
        const message = `Adresse ${session.email ?? pending} confirmée. Sur un autre appareil : « Recevoir un code par e-mail », et ta progression te suivra.`;
        ctx.publish({ busy: false, email: session.email ?? pending, pendingEmail: null, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Code refusé.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Redemande un code pour l'adresse en attente (le précédent a expiré). */
    async resendEmailCode(): Promise<AccountOutcome> {
      const api = ctx.resolve();
      const pending = ctx.state().pendingEmail;
      if (!ctx.networkReady(api)) {
        return { status: "unavailable", reason: "offline", message: "Réseau injoignable." };
      }
      if (!pending) {
        const message = "Aucune adresse n'attend de confirmation.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        await api.resendEmailChange(pending);
        const message = `Nouveau code envoyé à ${pending}.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Renvoi impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Renomme le joueur dans le classement (2 à 24 caractères). */
    async rename(displayName: string): Promise<boolean> {
      const api = ctx.resolve();
      if (!ctx.networkReady(api)) return false;
      const local = ctx.deps.readState();
      const userId = api.session()?.userId;
      if (!local || !userId) return false;
      const name = displayName.trim();
      if (name.length < 2 || name.length > 24) {
        ctx.publish({ busy: false, message: "Le nom doit faire entre 2 et 24 caractères.", isError: true });
        return false;
      }
      ctx.publish({ busy: true });
      try {
        await api.updateDisplayName(userId, name);
        ctx.publish({ busy: false, displayName: name, message: `Nom du classement mis à jour : ${name}.`, isError: false });
        return true;
      } catch (error) {
        ctx.fail(error, "Changement de nom impossible.");
        return false;
      }
    },

    /**
     * Épingle jusqu'à 4 cartes de sa collection sur son profil public.
     *
     * Le serveur vérifie la possession : si une carte n'est pas dans la
     * sauvegarde poussée, il refuse et on affiche son message tel quel. En
     * local, on nettoie la liste et on borne à `MAX_SHOWCASE` avant d'appeler.
     */
    async setShowcase(slugs: readonly string[]): Promise<boolean> {
      const api = ctx.resolve();
      if (!ctx.networkReady(api)) return false;
      const clean = normalizeShowcase(slugs);
      if (slugs.length > MAX_SHOWCASE) {
        ctx.publish({ busy: false, message: `Une vitrine affiche ${MAX_SHOWCASE} cartes au maximum.`, isError: true });
        return false;
      }
      ctx.publish({ busy: true });
      try {
        const saved = await api.setShowcase(clean);
        ctx.publish({
          busy: false,
          showcase: normalizeShowcase(saved.length ? saved : clean),
          message: clean.length
            ? `Vitrine mise à jour (${clean.length} carte${clean.length > 1 ? "s" : ""}).`
            : "Vitrine vidée.",
          isError: false,
        });
        return true;
      } catch (error) {
        ctx.fail(error, "Mise à jour de la vitrine impossible.");
        return false;
      }
    },

    /**
     * Teste la joignabilité du projet Supabase (lecture pure) et l'annonce.
     *
     * Sur un appareil, « Réseau injoignable » peut venir du réseau, de
     * l'adresse configurée ou d'un refus du WebView : ce bouton dit lequel,
     * avec le nom d'hôte — sans avoir à brancher un ordinateur.
     */
    async ping(): Promise<boolean> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const { host } = await api.ping();
        ctx.publish({
          busy: false,
          message: `Projet ${host} joignable : le réseau et la clé répondent.`,
          isError: false,
        });
        return true;
      } catch (error) {
        ctx.fail(error, "Projet injoignable.");
        return false;
      }
    },

    /**
     * Inscrit cet appareil aux notifications de direct.
     *
     * Trois conditions, et aucune n'est contournable : le greffon existe (APK,
     * pas navigateur), un compte est connecté (le serveur rattache le jeton à
     * `auth.uid()`), et le joueur accepte la permission Android. Un refus n'est
     * pas une erreur : on le dit simplement, sans le répéter en boucle.
     */
    async registerPush(options: { silent?: boolean } = {}): Promise<void> {
      // `silent` : l'inscription automatique du lancement ne doit pas coller un
      // message d'échec sous les yeux du joueur à chaque ouverture (Firebase
      // pas encore branché, par exemple). L'interrupteur du carnet, lui, parle.
      const quiet = options.silent === true;
      if (!pushSupported()) {
        // Pas de greffon : l'écran n'affiche même pas l'interrupteur.
        ctx.publish({ pushLive: null, pushBusy: false });
        return;
      }
      const api = ctx.resolve();
      if (!api || !api.session()) return;

      ctx.publish({ pushBusy: true });
      const permission = await requestPushToken(quiet);
      if (permission.status === "refusal") {
        ctx.publish({
          pushBusy: false,
          // « Refusé » est un état que le joueur peut changer dans les réglages
          // du téléphone — l'interrupteur doit le montrer éteint, pas inconnu.
          pushLive: permission.reason === "refuse" ? false : null,
          ...(quiet ? {} : { message: permission.message, isError: permission.reason !== "refuse" }),
        });
        return;
      }

      try {
        await api.registerPushToken(permission.token, "android");
        writePushToken(ctx.deps.storage(), permission.token);
        // L'inscription a réussi : on redit l'état depuis le serveur, plutôt
        // que de le supposer. C'est la même lecture qu'au lancement, donc le
        // nombre d'appareils ne peut pas dériver.
        await ctx.actions.syncPushState();
        ctx.publish({
          pushBusy: false,
          pushLive: true,
          ...(quiet
            ? {}
            : {
                message:
                  "Notifications activées : je te préviens quand un créateur de ta collection passe en direct.",
                isError: false,
              }),
        });
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Notifications indisponibles.");
        ctx.publish(
          quiet
            ? { pushBusy: false }
            : { pushBusy: false, message: refusal.message, isError: true },
        );
      }
    },

    /**
     * Relit l'état des notifications **tel que le serveur le connaît**.
     *
     * L'écran ne peut pas le deviner : `pushLive` vit en mémoire, pas dans la
     * sauvegarde. Sans cette lecture, chaque ouverture de l'application
     * affichait un interrupteur éteint — alors que le serveur notifiait
     * toujours.
     *
     * Silencieuse par principe : c'est une lecture d'arrière-plan à chaque
     * lancement. Un échec (hors ligne) laisse `pushLive` inconnu plutôt que de
     * coller un message, et le joueur qui veut savoir touche l'interrupteur.
     */
    async syncPushState(): Promise<boolean> {
      const api = ctx.resolve();
      if (!api || !api.session()) return false;
      try {
        const { live, devices } = await api.pushState();
        ctx.publish({ pushLive: live, pushDevices: devices });
        return true;
      } catch {
        return false;
      }
    },

    /**
     * L'interrupteur du carnet. Allumer passe par l'inscription (il faut un
     * jeton) ; éteindre ne retire pas le jeton — le joueur peut rallumer d'un
     * geste, et la prochaine connexion le réinscrirait de toute façon.
     */
    async setPushLive(enabled: boolean): Promise<boolean> {
      const api = ctx.resolve();
      if (!api || !api.session()) {
        ctx.publish({ pushLive: null });
        return false;
      }

      // Allumer sans jeton : c'est une inscription, pas un réglage.
      if (enabled && !readPushToken(ctx.deps.storage())) {
        await ctx.actions.registerPush();
        if (ctx.state().pushLive !== true) return false;
      }

      ctx.publish({ pushBusy: true });
      try {
        // Relire d'abord : `set_push_live` n'écrit que si l'état **change**
        // (sinon il ne touche pas à `updated_at`, et l'application dirait
        // faussement « modifié »). Publier l'état du serveur avant de toucher
        // l'interrupteur garantit que la comparaison porte sur du vrai.
        await ctx.actions.syncPushState();
        // Réinscrire le jeton connu : il a pu être déplacé par une connexion
        // sur un autre appareil, et `set_push_live` ne touche que les lignes du
        // compte connecté.
        const stored = readPushToken(ctx.deps.storage());
        if (stored) await api.registerPushToken(stored, "android");
        const devices = await api.setPushLive(enabled);
        ctx.publish({
          pushBusy: false,
          pushLive: enabled,
          pushDevices: devices,
          message: enabled
            ? "Notifications de direct activées."
            : devices > 0
              ? "Notifications coupées : plus rien ne sonne."
              : "Notifications coupées.",
          isError: false,
        });
        return true;
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Réglage impossible.");
        ctx.publish({ pushBusy: false, message: refusal.message, isError: true });
        return false;
      }
    },

    async signOut(): Promise<void> {
      const api = ctx.resolve();
      ctx.publish({ busy: true });
      // Le jeton de cet appareil part avec la session : sans ça, la prochaine
      // notification atterrirait sur l'écran de compte d'un autre joueur (le
      // téléphone, lui, est le même).
      const storedToken = readPushToken(ctx.deps.storage());
      if (storedToken && api?.session()) {
        try {
          await api.forgetPushToken(storedToken);
        } catch {
          // Sans réseau, le jeton reste : il sera déplacé à la prochaine
          // inscription sur cet appareil, ou retiré par Google s'il meurt.
        }
      }
      writePushToken(ctx.deps.storage(), null);
      try {
        await api?.signOut();
      } catch {
        // La déconnexion locale suffit.
      }
      ctx.publish({
        busy: false,
        email: null,
        displayName: null,
        showcase: [],
        wishlistSlug: null,
        userId: null,
        pendingEmail: null,
        pending: false,
        decision: null,
        remoteUpdatedAt: null,
        leaderboard: [],
        leaderboardMetric: "unique_creators",
        leaderboardRegion: null,
        profile: null,
        profileBusy: false,
        profileMarket: [],
        friends: EMPTY_FRIEND_LISTS,
        friendsAt: null,
        friendsBusy: false,
        market: [],
        marketAt: null,
        marketBusy: false,
        inbox: [],
        inboxAt: null,
        inboxUnread: 0,
        inboxBusy: false,
        lastPacks: null,
        lastPacksAt: null,
        lastPacksBusy: false,
        arena: null,
        arenaMine: null,
        arenaDraftSlots: null,
        arenaDraftBusy: false,
        arenaAt: null,
        arenaBusy: false,
        pushLive: null,
        pushDevices: null,
        pushBusy: false,
        message: "Déconnecté. Ta partie continue ici, exactement comme avant.",
        isError: false,
      });
    },

    /**
     * Synchronisation : `auto` respecte le plus récent, `push`/`pull` forcent.
     *
     * `push` est le bouton « Envoyer ma collection » de l'écran Compte — un
     * geste explicite du joueur, le seul endroit avec l'écran de conflit où
     * `p_force` est légitime.
     */
    async sync(mode: "auto" | "push" | "pull" = "auto"): Promise<void> {
      const local = ctx.deps.readState();
      if (!local) return;
      if (mode === "push") return ctx.push(local.version, local.updatedAt, true);
      if (mode === "pull") return ctx.pull();

      const api = ctx.resolve();
      if (!ctx.networkReady(api)) return;
      ctx.publish({ busy: true });
      try {
        const remote = await api.pullSave();
        const decision = decideSync(
          { state: local, updatedAt: local.updatedAt },
          remote
            ? { state: sanitizeState(remote.state, ctx.deps.now()) ?? local, deviceUpdatedAt: remote.deviceUpdatedAt }
            : null,
        );
        ctx.publish({ busy: false, remoteUpdatedAt: remote ? Date.parse(remote.updatedAt) || null : null });
        if (decision.action === "push") return ctx.push(local.version, local.updatedAt, false);
        if (decision.action === "pull") {
          ctx.publish({
            decision: "pull",
            // La décision n'est pas appliquée toute seule (on ne remplace
            // jamais une partie sans le dire) : l'écran Compte affiche alors
            // **deux boutons**, l'un pour reprendre celle d'en ligne, l'autre
            // pour garder la sienne. Le message annonce l'écran, il ne nomme
            // plus un bouton qui n'existe pas.
            message: "Une partie plus récente t'attend en ligne : choisis celle que tu gardes dans Mon compte.",
            isError: false,
          });
          return;
        }
        if (decision.action === "noop") {
          ctx.publish({ decision: "noop", pending: false, lastSyncAt: ctx.deps.now(), message: decision.reason, isError: false });
          return;
        }
        ctx.publish({ decision: "conflict", pending: true, message: decision.reason, isError: false });
      } catch (error) {
        ctx.fail(error, "Synchronisation impossible.");
      }
    },

    /** Récupère le nom affiché (et la vitrine) pour préremplir l'écran. */
    async loadProfile(): Promise<void> {
      const api = ctx.resolve();
      const userId = api?.session()?.userId;
      if (!api || !userId) return;
      try {
        const profile = await api.profile(userId);
        if (profile) {
          ctx.publish({
            displayName: profile.displayName,
            showcase: normalizeShowcase(profile.showcaseSlugs),
          });
        }
      } catch {
        // Sans réseau, on garde le dernier nom connu.
      }
    },

    /**
     * Ouvre la fiche publique d'un joueur. Le serveur renvoie des compteurs et
     * la vitrine, jamais sa collection — et `null` s'il n'a jamais envoyé sa
     * partie, ce que l'écran dit simplement.
     */
    async openProfile(userId: string): Promise<void> {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ profileBusy: false, profile: null, message: CLOUD_DISABLED_HINT, isError: true });
        return;
      }
      if (!ctx.networkReady(api)) return;
      ctx.publish({ profileBusy: true, profile: null, profileMarket: [], message: null, isError: false });
      try {
        // La fiche et sa vitrine partent ensemble : la section « En vente »
        // s'affiche en même temps que le reste, jamais après coup.
        const [profile, profileMarket] = await Promise.all([
          api.playerProfile(userId),
          api.marketListingsOf(userId).catch(() => [] as MarketListing[]),
        ]);
        if (!profile) {
          ctx.publish({
            profileBusy: false,
            profile: null,
            message: "Ce joueur n'a pas encore de progression en ligne.",
            isError: true,
          });
          return;
        }
        ctx.publish({ profileBusy: false, profile, profileMarket, message: null, isError: false });
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Profil indisponible.");
        ctx.publish({ profileBusy: false, profile: null, message: refusal.message, isError: true });
      }
    },

    /** Ferme la fiche publique. */
    closeProfile(): void {
      ctx.publish({ profile: null, profileBusy: false, profileMarket: [] });
    },

    async loadLeaderboard(
      metric: LeaderboardMetric = ctx.state().leaderboardMetric,
      region: string | null = ctx.state().leaderboardRegion,
    ): Promise<void> {
      const api = ctx.resolve();
      if (!ctx.networkReady(api)) return;
      ctx.publish({ busy: true, leaderboardMetric: metric, leaderboardRegion: region });
      try {
        // **Cent**, pas vingt : la fonction serveur borne elle-même à 100
        // (`least(greatest(p_limit, 1), 100)`), et le panneau en montre vingt
        // par page. Le joueur voit donc le top 100 au lieu du top 20, pour le
        // même poids de DOM — c'est le classement qui gagne, pas l'écran.
        const rows = await api.leaderboard(100, metric, region);
        ctx.publish({ busy: false, leaderboard: rows, message: null, isError: false });
      } catch (error) {
        ctx.fail(error, "Classement indisponible.");
      }
    },

    // ------------------------------------------------------------ Notifications
    //
    // Le carnet ne lit rien de nouveau côté serveur : il relit ce que le joueur
    // a déjà le droit de voir (ses offres, ses amis, ses ventes) et le met en
    // français. La « dernière visite » vit sur l'appareil, par joueur.

    /**
     * Recharge le carnet et recompte les nouveautés.
     *
     * Les sources partent ensemble ; une source en échec (la fonction des
     * ventes pas encore collée, par exemple) ne vide pas le reste : le carnet
     * est fait pour être utile, pas pour tomber entier. La ligne du direct du
     * créateur épinglé, elle, n'est pas ici : elle naît de l'écran, qui seul
     * lit le direct (`src/hooks/use-inbox.ts`).
     */
    async loadInbox(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      const userId = ctx.currentUserId();
      ctx.publish({ inboxBusy: true });
      try {
        const [trades, incoming, friends, sales, losses, shelf, wishlistSlug] = await Promise.all([
          ready.api.listTrades().catch(() => []),
          ready.api.listIncomingFriendRequests().catch(() => []),
          ready.api.listFriends().catch(() => []),
          ready.api.marketSales().catch(() => []),
          ready.api.lastPackLosses().catch(() => []),
          // L'étagère sert deux fois : la feuille du Last Pack l'affiche, et le
          // carnet en tire « X a ouvert Kameto, Last Pack encore 8 min ».
          ready.api.lastPackShelf().catch(() => null),
          ready.api.wishlistSlug().catch(() => null),
        ]);
        const items = buildInbox({
          trades,
          friends: { friends, incoming, outgoing: [] },
          sales,
          lastPackLosses: losses,
          lastPackShelf: shelf,
          now: ctx.deps.now(),
        });
        ctx.publish({
          inbox: items,
          inboxUnread: unreadCount(items, ctx.readSeen(userId)),
          inboxAt: ctx.deps.now(),
          inboxBusy: false,
          // L'étagère repart avec le carnet : deux appels réseau pour la même
          // donnée seraient deux occasions de se contredire.
          lastPacks: shelf ?? undefined,
          lastPacksAt: shelf ? ctx.deps.now() : undefined,
          wishlistSlug,
        });
      } catch (error) {
        ctx.publish({ inboxBusy: false });
        ctx.fail(error, "Carnet indisponible.");
      }
    },

    /**
     * Marque le carnet comme lu **à l'instant où le joueur l'ouvre** : la
     * pastille disparaît, les lignes restent (on ne perd pas l'historique).
     */
    markInboxSeen(): void {
      const userId = ctx.currentUserId();
      if (!userId) return;
      const at = new Date(ctx.deps.now()).toISOString();
      try {
        ctx.deps.storage()?.setItem(seenKey(userId), at);
      } catch {
        // Stockage refusé : la pastille reviendra, rien de grave.
      }
      ctx.publish({ inboxUnread: 0 });
    },

    /** Le carnet, remis à zéro (déconnexion ou changement de compte). */
    clearInbox(): void {
      ctx.publish({ inbox: [], inboxAt: null, inboxUnread: 0, inboxBusy: false });
    },

    // ---------------------------------------------------------------- Twitch
    //
    // La connexion Twitch est un aller-retour par le navigateur : le store ne
    // navigue pas (il ne connaît ni `window` ni le DOM, c'est ce qui le rend
    // testable) — il **donne l'adresse à ouvrir** et **termine** au retour.
    // L'écran, lui, ouvre la porte.

    /**
     * L'adresse à ouvrir pour se connecter avec Twitch, ou `null` si ce build
     * n'a pas de cloud configuré.
     */
    twitchSignInUrl(redirectTo: string): string | null {
      const api = ctx.resolve();
      if (!api) {
        ctx.publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return null;
      }
      return api.twitchAuthorizeUrl(redirectTo);
    },

    /**
     * Termine une connexion Twitch à partir de l'adresse de retour.
     *
     * Le fragment contient les jetons : on les échange contre l'identité du
     * compte, on enregistre la session, on relit le nom affiché — la connexion
     * devient indiscernable d'un compte invité, avec sa collection déjà en
     * place si le compte Twitch en avait une.
     */
    async completeTwitchSignIn(url: string): Promise<OAuthOutcome> {
      const returned = parseOAuthReturn(url);
      if (returned.status === "none") return { status: "none" };
      const api = ctx.resolve();
      if (!api) {
        const refusal: CloudActionOutcome = {
          status: "unavailable",
          reason: "not-configured",
          message: CLOUD_DISABLED_HINT,
        };
        ctx.publish({ message: refusal.message, isError: true });
        return refusal;
      }
      if (returned.status === "error") {
        const message = `Twitch n'a pas donné son accord : ${returned.message}`;
        ctx.publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.adoptSession({
          accessToken: returned.accessToken,
          refreshToken: returned.refreshToken,
          expiresIn: returned.expiresIn,
        });
        ctx.refreshIdentity();
        await ctx.actions.loadProfile();
        const message = session.email
          ? `Connecté avec Twitch (${session.email}). Ta collection locale reste celle de cet appareil.`
          : "Connecté avec Twitch. Ta collection locale reste celle de cet appareil.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Connexion Twitch impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Charge l'étagère des paquets exposés et la publie dans l'état cloud. */
    /**
     * Le créateur épinglé, relu du serveur.
     *
     * Appelé au chargement du carnet (pour la ligne « ton épinglé est en
     * direct ») et par l'écran du classeur. Un échec ne casse rien : sans
     * `0015_wishlist.sql`, la wishlist reste vide et l'app est comme avant.
     */
    async loadWishlist(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      try {
        const slug = await ready.api.wishlistSlug();
        ctx.publish({ wishlistSlug: slug });
      } catch {
        // Silencieux : la wishlist est un confort, pas un préalable.
      }
    },

    /**
     * Épingle un créateur (ou le remplace). Le serveur vérifie qu'il existe au
     * catalogue et renvoie le slug retenu ; l'écran n'invente rien.
     */
    async setWishlist(slug: string): Promise<boolean> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) {
        ctx.publish({ wishlistBusy: false, message: ready.refusal.message, isError: true });
        return false;
      }
      ctx.publish({ wishlistBusy: true, message: null, isError: false });
      try {
        const saved = await ready.api.setWishlist(slug);
        const name = CREATOR_BY_SLUG.get(saved)?.displayName ?? "Ce créateur";
        ctx.publish({
          wishlistBusy: false,
          wishlistSlug: saved,
          message: `${name} est épinglé : les autres joueurs le verront sur ta fiche.`,
          isError: false,
        });
        return true;
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Épinglage impossible.");
        ctx.publish({ wishlistBusy: false, message: refusal.message, isError: true });
        return false;
      }
    },

    /** Retire l'épinglé. */
    async clearWishlist(): Promise<boolean> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) {
        ctx.publish({ wishlistBusy: false, message: ready.refusal.message, isError: true });
        return false;
      }
      ctx.publish({ wishlistBusy: true, message: null, isError: false });
      try {
        await ready.api.clearWishlist();
        ctx.publish({ wishlistBusy: false, wishlistSlug: null, message: "Ton épinglé est retiré.", isError: false });
        return true;
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Retrait impossible.");
        ctx.publish({ wishlistBusy: false, message: refusal.message, isError: true });
        return false;
      }
    },

    /** Empreinte locale, utile pour diagnostiquer un conflit. */
    fingerprint(): string | null {
      const local = ctx.deps.readState();
      return local ? stateFingerprint(local) : null;
    },

  };
}
