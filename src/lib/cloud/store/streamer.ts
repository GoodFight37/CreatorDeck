import type { CloudStoreContext } from "./context";
import type { CloudActionOutcome } from "./types";
import { applyStreamerMirror, publishStreamerLocally, visitStreamerLocally } from "@/lib/game-engine";
import { STREAMER_TOKEN_CAP, absenceLines, formatById, videoHeadline } from "@/lib/streamer";
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
    }
  | { status: "refused"; message: string };

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
        };
      }
      if (!api.session()) return noAccount();

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const retour = await api.streamerVisit();
        const status = await api.streamerStatus();
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
  };
}
