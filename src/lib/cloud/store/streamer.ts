import type { CloudStoreContext } from "./context";
import type { CloudActionOutcome } from "./types";
import {
  applyStreamerMirror,
  buyStreamerSetupLocally,
  chooseStreamerEventLocally,
  publishStreamerLocally,
  visitStreamerLocally,
} from "@/lib/game-engine";
import {
  STREAMER_TOKEN_CAP,
  absenceLines,
  eventById,
  eventChoice,
  eventForDay,
  eventHeadline,
  formatById,
  nextSetupLevel,
  setupBonusPermille,
  setupLevelById,
  videoHeadline,
  type StreamerEventState,
} from "@/lib/streamer";
import { gameDay } from "@/lib/progression";

/**
 * La **chaîne** (le simulateur de streameur, `0036_streamer.sql`).
 *
 * Trois règles, les mêmes que pour les points et les jetons :
 *
 *   1. **sans cloud** (build de développement, jeu sans serveur) : le moteur
 *      local fait vivre la chaîne — il paie le retour et tire la vidéo du jour
 *      avec les règles du fichier ;
 *   2. **cloud configuré, compte connecté** : c'est le serveur qui compte. Le
 *      retour vient de `streamer_visit()`, la vidéo de `streamer_publish()` —
 *      le client n'envoie qu'un **nom de format**, jamais un résultat ;
 *   3. **cloud configuré, pas de compte** : on refuse, et la phrase dit quoi
 *      faire. Jamais de repli silencieux : des abonnés et des jetons fabriqués
 *      sur l'appareil seraient effacés à la première lecture du serveur.
 *
 * Ce que cette porte garantit au passage : la chaîne ne paie **qu'une fois** par
 * journée de jeu. Le serveur le tient par l'index unique de `streamer_videos` et
 * par le journal des jetons (`_tokens_apply`), l'appareil par le relevé gardé
 * dans la sauvegarde.
 */
export type StreamerOpening =
  | {
      status: "done";
      /** D'où viennent les chiffres : le serveur, ou le moteur local. */
      source: "server" | "local";
      days: number;
      countedDays: number;
      gained: number;
      subscribers: number;
      lines: string[];
      /** La journée de jeu du serveur (`AAAA-MM-JJ`, 6 h UTC). */
      day: string;
      publishedToday: boolean;
      tokensToday: number;
      tokensCap: number;
      /** L'imprévu du jour : la carte, et ce qui y a déjà été répondu. */
      event: StreamerEventState | null;
      /** Les paliers de setup installés, dans l'ordre (`0038`). */
      setup: string[];
      /** Le bonus de croissance du setup, pour mille. */
      setupBonus: number;
    }
  | { status: "refused"; message: string };

export type StreamerEventOpening = { status: "done"; headline: string; event: StreamerEventState };

/** Les quatre champs que la phrase d'une vidéo regarde (le format vient d'ailleurs). */
function outcomeOf(video: {
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
  tokens: number;
}): { success: boolean; buzz: boolean; badBuzz: boolean; gained: number; tokens: number } {
  return { success: video.success, buzz: video.buzz, badBuzz: video.badBuzz, gained: video.gained, tokens: video.tokens };
}

export function streamerActions(ctx: CloudStoreContext) {
  /** La phrase commune du refus, quand le cloud est là mais pas le compte. */
  function noAccount(): { status: "refused"; message: string } {
    const message =
      "Connecte-toi pour faire vivre ta chaîne : ses abonnés et ses jetons vivent sur ton compte.";
    ctx.publish({ busy: false, message, isError: true });
    return { status: "refused", message };
  }

  return {
    /**
     * Ouvre la chaîne : paie le retour du joueur et rend le résumé à afficher.
     *
     * Sans cloud, c'est le moteur local qui paie le retour ; avec un compte,
     * `streamer_visit()` le fait côté serveur, et `streamer_status()` complète
     * — journée de jeu en cours, vidéo déjà publiée, jetons du jour.
     */
    async openStreamer(): Promise<StreamerOpening> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) return { status: "refused", message: "Partie locale absente." };

      if (!api) {
        const visit = visitStreamerLocally(local, ctx.deps.now());
        ctx.deps.applyState(visit.state);
        const day = gameDay(ctx.deps.now());
        return {
          status: "done",
          source: "local",
          days: visit.summary.days,
          countedDays: visit.summary.countedDays,
          gained: visit.summary.gained,
          subscribers: visit.summary.subscribers,
          lines: visit.summary.lines,
          day,
          publishedToday: visit.state.streamer.video?.day === day,
          tokensToday: visit.state.streamer.tokensDay === day ? visit.state.streamer.tokensToday : 0,
          tokensCap: STREAMER_TOKEN_CAP,
          event: visit.state.streamer.event?.day === day ? visit.state.streamer.event : null,
          setup: visit.state.streamer.setup,
          setupBonus: setupBonusPermille(visit.state.streamer.setup),
        };
      }
      if (!api.session()) return noAccount();

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const retour = await api.streamerVisit();
        const status = await api.streamerStatus();
        // L'imprévu du jour se lit à part : une base qui n'a pas encore `0038`
        // (elle répond alors une erreur « fonction introuvable ») ne doit pas
        // empêcher la chaîne entière de s'ouvrir — le setup et la vidéo
        // continuent de fonctionner, et l'écran n'affiche simplement pas de
        // carte. Même tolérance que le carnet avec des migrations anciennes.
        const imprevu = await api.streamerEventToday().catch(() => null);
        const courant = ctx.deps.readState() ?? local;
        // Le relevé local est daté **maintenant** : le serveur vient de le
        // faire, et sans cette écriture un second passage dans la journée
        // repaierait la même absence.
        ctx.deps.applyState(
          applyStreamerMirror(
            courant,
            {
              subscribers: retour.subscribers,
              lastSeenAt: ctx.deps.now(),
              tokensDay: status.day,
              tokensToday: status.tokensToday,
              setup: status.setup,
              event: imprevu
                ? {
                    day: imprevu.day,
                    event: imprevu.event,
                    choice: imprevu.choice,
                    success: imprevu.success,
                    buzz: imprevu.buzz,
                    badBuzz: imprevu.badBuzz,
                    gained: imprevu.gained,
                  }
                : undefined,
            },
            ctx.deps.now(),
          ),
        );
        ctx.publish({ busy: false, message: null, isError: false });
        return {
          status: "done",
          source: "server",
          days: retour.days,
          countedDays: retour.countedDays,
          gained: retour.gained,
          subscribers: retour.subscribers,
          lines: absenceLines({
            days: retour.days,
            countedDays: retour.countedDays,
            gained: retour.gained,
            before: retour.before,
            after: retour.subscribers,
          }),
          day: status.day,
          publishedToday: status.publishedToday,
          tokensToday: status.tokensToday,
          tokensCap: status.tokensCap,
          // La carte se relit depuis le miroir : elle vient d'être adoptée, et
          // une base sans `0038` laisse simplement `null`.
          event: imprevu
            ? {
                day: imprevu.day,
                event: imprevu.event,
                choice: imprevu.choice,
                success: imprevu.success,
                buzz: imprevu.buzz,
                badBuzz: imprevu.badBuzz,
                gained: imprevu.gained,
              }
            : null,
          setup: status.setup,
          setupBonus: status.setupBonus,
        };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "La chaîne n'a pas pu être ouverte.");
        return { status: "refused", message: refusal.message };
      }
    },

    /**
     * Publie la vidéo du jour.
     *
     * Le client n'envoie qu'un **nom de format** : le tirage (réussite, buzz,
     * bad buzz), le gain et les jetons sont décidés par le serveur. Une seconde
     * publication le même jour relit la première au lieu de la rejouer, et le
     * versement de jetons est plafonné à ce qui reste de la journée.
     */
    async publishStreamerVideo(formatId: string): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const played = publishStreamerLocally(local, formatId, ctx.deps.now());
        if (!played) {
          const message = "Ce format de vidéo n'existe pas.";
          ctx.publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        ctx.deps.applyState(played.state);
        const format = formatById(played.video.format);
        const message = played.already
          ? "La vidéo du jour est déjà publiée."
          : format
            ? videoHeadline({ format, ...outcomeOf(played.video) })
            : "Vidéo publiée.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: played.video.tokens };
      }
      if (!api.session()) {
        const refus = noAccount();
        return { status: "unavailable", reason: "no-session", message: refus.message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const video = await api.streamerPublish(formatId);
        const jour = gameDay(ctx.deps.now());
        const courant = ctx.deps.readState() ?? local;
        ctx.deps.applyState(
          applyStreamerMirror(
            courant,
            {
              subscribers: video.subscribers,
              tokensDay: jour,
              tokensToday: video.tokensToday,
              video: {
                day: jour,
                format: video.format,
                success: video.success,
                buzz: video.buzz,
                badBuzz: video.badBuzz,
                gained: video.gained,
                tokens: video.tokens,
              },
            },
            ctx.deps.now(),
          ),
        );
        // Le solde de jetons a bougé côté serveur : on le relit plutôt que de
        // l'additionner — c'est le serveur qui tient la caisse.
        await ctx.actions.syncTokens().catch(() => null);
        const format = formatById(video.format) ?? formatById(formatId);
        const message = video.already
          ? "La vidéo du jour est déjà publiée."
          : format
            ? videoHeadline({ format, ...outcomeOf(video) })
            : "Vidéo publiée.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: video.tokens };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "La vidéo n'a pas pu être publiée.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Répond à l'imprévu du jour : un côté de la carte, tiré par le serveur.
     *
     * Le client envoie la carte **et** le côté ; le serveur refuse une carte qui
     * n'est pas celle du jour, un côté inconnu, et relit la première réponse si
     * on insiste. Aucun jeton ne bouge : la monnaie de la chaîne a une seule
     * porte, la vidéo du jour.
     */
    async chooseStreamerEvent(eventId: string, choiceId: string): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const joue = chooseStreamerEventLocally(local, eventId, choiceId, ctx.deps.now());
        if ("error" in joue) {
          ctx.publish({ busy: false, message: joue.error, isError: true });
          return { status: "unavailable", reason: "error", message: joue.error };
        }
        ctx.deps.applyState(joue.state);
        const message = joue.already ? "L'imprévu du jour est déjà joué." : joue.headline;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      }
      if (!api.session()) {
        const refus = noAccount();
        return { status: "unavailable", reason: "no-session", message: refus.message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const resultat = await api.streamerChoose(eventId, choiceId);
        const jour = gameDay(ctx.deps.now());
        const courant = ctx.deps.readState() ?? local;
        const event: StreamerEventState = {
          day: jour,
          event: resultat.event,
          choice: resultat.choice,
          success: resultat.success,
          buzz: resultat.buzz,
          badBuzz: resultat.badBuzz,
          gained: resultat.gained,
        };
        ctx.deps.applyState(
          applyStreamerMirror(
            courant,
            { subscribers: resultat.subscribers, event },
            ctx.deps.now(),
          ),
        );
        const carte = eventById(resultat.event);
        const cote = carte ? eventChoice(carte, resultat.choice) : null;
        const message = resultat.already
          ? "L'imprévu du jour est déjà joué."
          : cote
            ? eventHeadline({
                choice: cote,
                success: resultat.success,
                buzz: resultat.buzz,
                badBuzz: resultat.badBuzz,
                gained: resultat.gained,
              })
            : "Imprévu joué.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "L'imprévu du jour n'a pas pu être joué.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Achète le **prochain** palier de setup (points, dans l'ordre).
     *
     * Le prix et la dépense sont au serveur (`streamer_setup_buy`, qui passe par
     * le wallet) ; sans cloud, le moteur local fait le même calcul et débite la
     * partie locale. Dans les deux cas, le solde affiché vient de la source qui
     * a payé.
     */
    async buyStreamerSetup(levelId: string): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const achat = buyStreamerSetupLocally(local, levelId, ctx.deps.now());
        if ("error" in achat) {
          ctx.publish({ busy: false, message: achat.error, isError: true });
          return { status: "unavailable", reason: "error", message: achat.error };
        }
        ctx.deps.applyState(achat.state);
        const message = `« ${achat.level.label} » est installé.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      }
      if (!api.session()) {
        const refus = noAccount();
        return { status: "unavailable", reason: "no-session", message: refus.message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const achat = await api.streamerSetupBuy(levelId);
        const courant = ctx.deps.readState() ?? local;
        ctx.deps.applyState(
          applyStreamerMirror(courant, { setup: achat.setup }, ctx.deps.now()),
        );
        // Le solde a été débité côté serveur : on le relit, comme après un
        // achat à l'hôtel — le serveur tient la caisse.
        await ctx.actions.syncWallet().catch(() => null);
        const niveau = setupLevelById(achat.level);
        const message = achat.already
          ? `« ${niveau?.label ?? achat.level} » est déjà installé.`
          : `« ${niveau?.label ?? achat.level} » est installé — la chaîne grandit plus vite.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Ce palier de setup n'a pas pu être installé.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },
  };
}
