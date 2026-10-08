import type { CloudStoreContext } from "./context";
import type { CloudActionOutcome } from "./types";
import {
  applySetupSacrifice,
  applyStreamerMirror,
  buyStreamerSetupLocally,
  chooseStreamerEventLocally,
  payStreamerRaidLocally,
  publishStreamerLocally,
  sacrificeSetupLocally,
  setStreamerGuestLocally,
  visitStreamerLocally,
} from "@/lib/game-engine";
import {
  GUEST_LIVE_WINDOW_MINUTES,
  STREAMER_TOKEN_CAP,
  absenceLines,
  collabFor,
  eventById,
  eventChoice,
  eventForDay,
  eventHeadline,
  formatById,
  nextSetupLevel,
  raidLine,
  setupBonusPermille,
  setupLevelById,
  videoHeadline,
  type StreamerEventState,
  type StreamerGuest,
} from "@/lib/streamer";
import { gameDay } from "@/lib/progression";
import { CREATOR_BY_SLUG, type CardVariant, type Rarity } from "@/lib/catalog";
import type { StreamerGuestRow } from "@/lib/cloud/api/streamer";

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
      /** Les invités sur le bureau (`0039`). */
      guests: StreamerGuest[];
      /** Le raid payé aujourd'hui (0 : personne n'est passé). */
      raidToday: number;
      /** Ce que le **plateau** vaut maintenant, pour mille (`0041`). */
      collabPermille: number;
      /** Un invité streame à l'instant du relevé. */
      collabLive: boolean;
    }
  | { status: "refused"; message: string };

export type StreamerEventOpening = { status: "done"; headline: string; event: StreamerEventState };

/**
 * Le relevé d'**après** : l'ouverture fraîche, mais le récit du retour gardé.
 *
 * Un second relevé dans la même session ne paie plus rien — le moteur (local
 * comme serveur) a déjà versé le retour du joueur. Les journées d'absence, ce
 * qu'elles ont rapporté et leurs lignes appartiennent donc au **premier**
 * relevé, et c'est à l'appelant de les garder : sans ça, acheter un palier ou
 * rattraper un raid effacerait le « bon retour » de l'écran, et le joueur
 * croirait avoir perdu sa paie.
 */
export function releveApres(
  precedent: StreamerOpening | null,
  nouveau: StreamerOpening,
): StreamerOpening {
  if (nouveau.status !== "done") return nouveau;
  if (precedent?.status !== "done") return nouveau;
  return {
    ...nouveau,
    // Ce que le second relevé apporte **en plus** garde sa place à la fin.
    days: precedent.days,
    countedDays: precedent.countedDays,
    gained: precedent.gained,
    lines: [...precedent.lines, ...nouveau.lines.slice(precedent.lines.length)],
  };
}

/** Les raretés et variantes que l'appareil sait afficher (les mêmes qu'au serveur). */
const RARETES = new Set<string>(["common", "uncommon", "rare", "epic", "legendary"]);
const VARIANTES = new Set<string>(["standard", "live", "holo", "gold"]);

/**
 * Un invité venu du serveur, dans la forme que l'écran lit — `null` si la
 * rareté ou la variante est inconnue.
 *
 * Le serveur les valide déjà (`streamer_guest_set`, `0039`) ; ce filtre-ci est
 * là pour le cas où la base serait d'une autre époque : mieux vaut un bureau
 * incomplet qu'une carte que le jeu ne saurait pas dessiner.
 */
function guestFromRow(row: StreamerGuestRow): StreamerGuest | null {
  if (!RARETES.has(row.rarity) || !VARIANTES.has(row.variant)) return null;
  return {
    slot: row.slot,
    cardId: row.cardId,
    slug: row.slug,
    rarity: row.rarity as Rarity,
    variant: row.variant as CardVariant,
  };
}

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
    async openStreamer(liveSlugs: ReadonlySet<string> = new Set<string>()): Promise<StreamerOpening> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) return { status: "refused", message: "Partie locale absente." };

      if (!api) {
        const visit = visitStreamerLocally(local, ctx.deps.now());
        // Le raid passe **après** l'absence : les invités dont le créateur est
        // en direct paient une fois par journée de jeu. Sans table du direct
        // (build sans cloud), la liste est vide et le raid ne paie rien.
        // La croissance du raid est celle du relevé (`local`, l'état d'avant) :
        // le serveur la calcule sur la ligne de la chaîne, pas sur ce que
        // l'absence vient d'ajouter.
        const raid = payStreamerRaidLocally(
          visit.state,
          ctx.deps.now(),
          liveSlugs,
          local.streamer.subscribers,
        );
        ctx.deps.applyState(raid.state);
        const day = gameDay(ctx.deps.now());
        const lines = [...visit.summary.lines];
        if (raid.gained > 0 && raid.raid) lines.push(raidLine(raid.raid));
        // Le plateau se calcule sur place, avec les mêmes règles que le
        // serveur (`collabFor` porte le même barème que `_streamer_collab()`) :
        // l'écran annonce donc le chiffre qui sera payé, dix secondes plus tard.
        const plateau = collabFor(raid.state.streamer.guests, liveSlugs);
        return {
          status: "done",
          source: "local",
          days: visit.summary.days,
          countedDays: visit.summary.countedDays,
          gained: visit.summary.gained,
          subscribers: visit.summary.subscribers + raid.gained,
          lines,
          day,
          publishedToday: raid.state.streamer.video?.day === day,
          tokensToday: raid.state.streamer.tokensDay === day ? raid.state.streamer.tokensToday : 0,
          tokensCap: STREAMER_TOKEN_CAP,
          event: raid.state.streamer.event?.day === day ? raid.state.streamer.event : null,
          setup: raid.state.streamer.setup,
          setupBonus: setupBonusPermille(raid.state.streamer.setup),
          guests: raid.state.streamer.guests,
          raidToday: raid.raid?.day === day ? raid.raid.gained : 0,
          collabPermille: plateau.permille,
          collabLive: plateau.live,
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
        const guests = status.guests.map(guestFromRow).filter((guest): guest is StreamerGuest => guest !== null);
        // Le relevé local est daté **maintenant** : le serveur vient de le
        // faire, et sans cette écriture un second passage dans la journée
        // repaierait la même absence. Le raid suit sa journée : celui d'hier ne
        // s'affiche pas comme celui d'aujourd'hui.
        ctx.deps.applyState(
          applyStreamerMirror(
            courant,
            {
              subscribers: retour.subscribers,
              lastSeenAt: ctx.deps.now(),
              guests,
              raid:
                retour.raid.gained > 0 && retour.raid.shares.length > 0
                  ? {
                      day: status.day,
                      gained: retour.raid.gained,
                      slugs: retour.raid.shares.map((share) => share.slug),
                    }
                  : courant.streamer.raid?.day === status.day
                    ? courant.streamer.raid
                    : null,
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
          lines: [
            ...absenceLines({
              days: retour.days,
              countedDays: retour.countedDays,
              gained: retour.gained,
              before: retour.before,
              after: retour.subscribers,
            }),
            // Le raid se raconte **quand il vient d'être payé** : sans cette
            // condition, la phrase reviendrait à chaque ouverture de l'écran,
            // et le joueur croirait toucher plusieurs fois la même chose.
            ...(retour.raid.gained > 0 && !retour.raid.already
              ? [raidLine({ gained: retour.raid.gained, slugs: retour.raid.shares.map((s) => s.slug) })]
              : []),
          ],
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
          guests,
          raidToday: status.raidToday,
          collabPermille: status.collabPermille,
          collabLive: status.collabLive,
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
    async publishStreamerVideo(
      formatId: string,
      /** Les créateurs invités en direct (le chemin local seul en a besoin). */
      liveSlugs: ReadonlySet<string> = new Set<string>(),
    ): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const played = publishStreamerLocally(local, formatId, ctx.deps.now(), undefined, liveSlugs);
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
                // Le plateau, tel que le serveur l'a payé (`0041`) : l'écran
                // affiche le bonus qu'il a vraiment appliqué, et le raid.
                collab: video.collab,
                raid: video.raid,
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

    /**
     * Sacrifie des **doublons** pour le prochain palier du studio (rangs 6+).
     *
     * Le serveur décide : il relit les cartes dans la sauvegarde, la rareté au
     * catalogue et la valeur au barème (`streamer_setup_sacrifice`, `0040`). Il
     * renvoie les cartes qu'il a **réellement** consommées — c'est ce verdict
     * qu'on retire de la collection locale, pas la sélection du joueur : si un
     * refus tombe, rien ne bouge (ni carte, ni droit).
     */
    async sacrificeStreamerSetup(cardIds: string[]): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const sacrifice = sacrificeSetupLocally(local, cardIds, ctx.deps.now());
        if ("error" in sacrifice) {
          ctx.publish({ busy: false, message: sacrifice.error, isError: true });
          return { status: "unavailable", reason: "error", message: sacrifice.error };
        }
        ctx.deps.applyState(sacrifice.state);
        const message =
          `« ${sacrifice.level.label} » est installé — ` +
          `${sacrifice.value} doublon${sacrifice.value > 1 ? "s" : ""} parti${sacrifice.value > 1 ? "s" : ""} au studio.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      }
      if (!api.session()) {
        const refus = noAccount();
        return { status: "unavailable", reason: "no-session", message: refus.message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const sacrifice = await api.streamerSetupSacrifice(cardIds);
        const courant = ctx.deps.readState() ?? local;
        // Le verdict du serveur, appliqué tel quel : les cartes qu'il a prises
        // quittent le classeur, et le palier qu'il a installé s'allume.
        const apres = applySetupSacrifice(
          courant,
          sacrifice.cards,
          sacrifice.level,
          ctx.deps.now(),
        );
        ctx.deps.applyState(
          applyStreamerMirror(apres, { setup: sacrifice.setup }, ctx.deps.now()),
        );
        const niveau = setupLevelById(sacrifice.level);
        const prises = sacrifice.cards.length;
        const message =
          `« ${niveau?.label ?? sacrifice.level} » est installé — ` +
          `${prises} doublon${prises > 1 ? "s" : ""} ${prises > 1 ? "ont" : "a"} quitté le classeur.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      } catch (error) {
        const refusal = ctx.cloudRefusal(
          error,
          "Ce sacrifice n'a pas pu être fait — rien n'a bougé.",
        );
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Pose un **invité sur le bureau**, ou libère sa place (`cardId` nul).
     *
     * Le bureau ne coûte rien et ne paie rien par lui-même : il décide de qui
     * peut amener un raid, et c'est le serveur qui dit qui est en direct
     * (`streamer_guest_set`, `0039`). Le client envoie la carte **telle qu'elle
     * est dans la collection locale** ; le serveur vérifie qu'elle est bien au
     * joueur, refuse deux fois le même créateur, et renvoie le bureau complet —
     * l'écran le recopie au lieu de le reconstruire.
     */
    async setStreamerGuest(slot: number, cardId: string | null): Promise<CloudActionOutcome> {
      const api = ctx.resolve();
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale absente.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      const carte = cardId ? local.cards.find((owned) => owned.id === cardId) ?? null : null;
      if (cardId && !carte) {
        const message = "Cette carte n'est pas dans ta collection.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      if (!api) {
        const pose = setStreamerGuestLocally(local, slot, cardId, ctx.deps.now());
        if ("error" in pose) {
          ctx.publish({ busy: false, message: pose.error, isError: true });
          return { status: "unavailable", reason: "error", message: pose.error };
        }
        ctx.deps.applyState(pose.state);
        const message = cardId
          ? `${creatorName(carte?.creatorSlug)} rejoint le bureau.`
          : "La place est libre.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      }
      if (!api.session()) {
        const refus = noAccount();
        return { status: "unavailable", reason: "no-session", message: refus.message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        // On n'envoie que les quatre champs que la porte lit : la carte
        // garde sa date d'obtention et sa marque « rare drop » pour elle.
        const bureau = await api.streamerGuestSet(
          slot,
          carte
            ? {
                id: carte.id,
                creatorSlug: carte.creatorSlug,
                rarity: carte.rarity,
                variant: carte.variant,
              }
            : null,
        );
        const courant = ctx.deps.readState() ?? local;
        ctx.deps.applyState(
          applyStreamerMirror(
            courant,
            {
              guests: bureau.guests
                .map(guestFromRow)
                .filter((guest): guest is StreamerGuest => guest !== null),
            },
            ctx.deps.now(),
          ),
        );
        const message = carte
          ? `${creatorName(carte.creatorSlug)} rejoint le bureau.`
          : "La place est libre.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: 0 };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Le bureau n'a pas pu être changé.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },
  };
}

/** Le nom du créateur d'un slug, tel que le joueur le lit sur la carte. */
function creatorName(slug: string | undefined): string {
  if (!slug) return "Un invité";
  return CREATOR_BY_SLUG.get(slug)?.displayName ?? slug;
}
