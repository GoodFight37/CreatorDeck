"use client";

/**
 * L'écran de révélation d'un booster (ou d'un Paquet Scène) : une carte à la
 * fois, avec ce que la mise en scène décide (`src/lib/reveal.ts`).
 *
 * Il vit dans son propre fichier pour une raison précise : il sert **deux**
 * écrans — le jeu sur téléphone, et l'overlay 16:9 qu'un streamer met dans OBS.
 * Les deux contextes n'ont qu'une différence, mais elle compte : l'overlay
 * n'offre **aucun raccourci**.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, ChevronRight, Share2, Sparkles, X, Zap } from "lucide-react";
import { CreatorCard } from "@/components/creator-card";
import { EffectBurst, EffectFlash } from "@/components/effect-burst";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { burstFor, flashFor } from "@/lib/fx";
import { buzz } from "@/lib/haptics";
import { CREATOR_BY_SLUG, RARITY_META, type CardVariant, type Rarity } from "@/lib/catalog";
import { liveFor, viewersLabel } from "@/lib/live";
import { regionLabel } from "@/lib/regions";
import {
  deservesSpotlight,
  isPerfect,
  PERFECT_HAPTIC,
  PERFECT_LOCK_MS,
  resistCount,
  RESIST_SHAKE_MS,
  resistHaptic,
  revealHaptic,
  silenceBefore,
} from "@/lib/reveal";
import { playBang, playRefuse, playReveal } from "@/lib/sfx";
import { bestCardOf } from "@/lib/social/inbox";
import type { DrawnCard, StreakRewardGrant } from "@/lib/game-engine";
import { streakRewardLabel } from "@/lib/progression";

export function RevealOverlay({
  cards,
  index,
  kind = "live",
  overlay = false,
  streakReward = null,
  onSkipAll,
  onNext,
  onClose,
}: {
  cards: DrawnCard[];
  index: number;
  /**
   * Ce que la série a payé pour ce booster (jour 1 → 6) : la récompense
   * s'annonce **pendant** la révélation, pas après — c'est le moment où elle
   * est gagnée, et c'est ce qui donne envie de revenir demain.
   */
  streakReward?: StreakRewardGrant | null;
  /** Quel paquet a été ouvert : le tirage rare ne se raconte pas pareil. */
  kind?: "live" | "scene";
  /**
   * Rendu dans l'overlay 16:9 (source navigateur d'un direct). Une seule
   * différence, mais elle compte : **pas de raccourci**. Devant un public, on
   * montre les cinq cartes ; c'est le jeu normal qui a le droit de sauter.
   */
  overlay?: boolean;
  /** Révèle les cinq cartes d'un coup — absent de l'overlay. */
  onSkipAll?: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const card = cards[index];
  const creator = card ? CREATOR_BY_SLUG.get(card.creatorSlug) : undefined;
  const live = useLive();
  const now = useNow(60_000);
  const cloud = useCloud();

  // La mise en scène vient de `src/lib/reveal.ts` : ici, on ne fait que
  // l'exécuter (jouer les sons, vibrer, verrouiller l'écran).
  const perfect = isPerfect(cards);
  const rarity = card?.rarity ?? "common";
  // Le nombre de refus se **déduit** de l'emplacement courant : inutile de
  // l'écrire dans un état au changement de carte, et donc inutile d'un effet
  // qui redessinerait l'écran pour rien. Ce qui est écrit, c'est seulement ce
  // que le joueur a consommé — et le composant est remonté pour chaque paquet
  // (`key` côté parent), donc le compteur repart de zéro à chaque ouverture.
  const [used, setUsed] = useState(0);
  const resistLeft = Math.max(0, resistCount(index, cards.length, rarity) - used);
  const [shaking, setShaking] = useState(false);
  const [locked, setLocked] = useState(perfect);

  // Le son et la vibration de la carte. Le blanc de 400 ms devant une Épique ou
  // une Légendaire n'est pas une attente : c'est ce qui fait le bruit.
  useEffect(() => {
    if (!card || perfect) return;
    const silence = silenceBefore(card.rarity);
    const timer = window.setTimeout(() => {
      if (silence > 0) playBang(card.rarity, card.variant);
      else playReveal(card.rarity, card.variant);
      buzz(revealHaptic(card.rarity, card.variant));
    }, silence);
    return () => window.clearTimeout(timer);
  }, [card, perfect]);

  // Le Perfect : les cinq d'un coup, l'écran verrouillé deux secondes, et la
  // vibration la plus longue de l'application.
  useEffect(() => {
    if (!perfect) return;
    const best = bestCardOf(cards);
    playBang((best?.rarity as Rarity) ?? "epic", (best?.variant ?? "standard") as CardVariant);
    buzz(PERFECT_HAPTIC);
    const timer = window.setTimeout(() => setLocked(false), PERFECT_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, [perfect, cards]);

  if (!card || !creator) return null;
  const isLast = index === cards.length - 1;
  const onAir = liveFor(live, creator.login, now);
  const spotlight = deservesSpotlight(card.rarity, perfect);
  /*
   * L'effet du moment. La décision vit dans `src/lib/fx.ts` (testée à part) :
   * un éclat pour une Épique, l'explosion dorée pour une Légendaire, et
   * l'écran blanc pour les deux plus grands moments.
   *
   * L'éclat part **avec le son** : les deux observent le même silence
   * (`silenceBefore`), sinon on verrait les étincelles avant d'entendre le bang.
   * `cards.length` change d'une révélation à l'autre sans changer la carte :
   * la clé ci-dessous garantit que l'animation repart au lieu de rester jouée.
   */
  const burst = burstFor(card.rarity, perfect);
  const flash = flashFor(card.rarity, perfect);
  const burstDelay = perfect ? 0 : silenceBefore(card.rarity);

  /**
   * Le geste de révélation. Tant que la carte résiste, l'appui ne fait que la
   * faire frémir : c'est le joueur qui insiste, et c'est pour ça qu'il obtient
   * quelque chose.
   */
  function advance() {
    if (locked) return;
    if (resistLeft > 0) {
      setUsed((value) => value + 1);
      setShaking(true);
      playRefuse();
      buzz(resistHaptic());
      window.setTimeout(() => setShaking(false), RESIST_SHAKE_MS);
      return;
    }
    if (isLast) onClose();
    else onNext();
  }

  return (
    <div
      className={`reveal-overlay${perfect ? " reveal-perfect" : ""}${spotlight ? " reveal-spotlight" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Résultat du booster"
    >
      <div className="reveal-ambient" />
      {flash ? <EffectFlash key={`flash-${card.id}`} /> : null}
      {perfect ? (
        <div className="perfect-banner" role="status">
          <Sparkles size={13} />
          <span>
            {kind === "scene"
              ? "Scène pleine : cinq Épiques de ta famille !"
              : "Booster Perfect : toutes les cartes sont Épique ou mieux !"}
          </span>
        </div>
      ) : null}
      {streakReward ? (
        <div className="streak-gain" role="status">
          <Zap size={13} />
          <span>
            Série <strong>J{streakReward.day}</strong> — {streakRewardLabel(streakReward)}
          </span>
        </div>
      ) : null}
      <div className="reveal-header">
        <span>{perfect ? `${cards.length} / ${cards.length}` : `${index + 1} / ${cards.length}`}</span>
        <div className="reveal-dots">
          {cards.map((item, dotIndex) => {
            const shown = perfect || dotIndex <= index;
            const dotCard = CREATOR_BY_SLUG.get(item.creatorSlug);
            if (!dotCard) return null;
            return (
              <i
                key={item.id}
                className={shown ? "active" : ""}
                style={{ "--dot-color": RARITY_META[item.rarity].color } as CSSProperties}
              />
            );
          })}
        </div>
        {/* Le raccourci des cinq cartes : hors overlay seulement. Devant un
            public, on regarde la mise en scène jusqu'au bout. */}
        {!overlay && !perfect && !isLast ? (
          <button
            type="button"
            className="reveal-skip"
            onClick={onSkipAll}
            aria-label="Révéler les cinq cartes d'un coup"
          >
            ×{cards.length - index}
          </button>
        ) : null}
        <button onClick={onClose} aria-label="Fermer" disabled={locked}><X size={20} /></button>
      </div>

      {perfect ? (
        /* Les cinq cartes ensemble : c'est le moment, il n'y a rien à faire. */
        <div className="reveal-perfect-grid">
          {burst ? <EffectBurst key={`fx-${card.id}`} kind={burst} delayMs={burstDelay} /> : null}
          {cards.map((item) => {
            const dotCard = CREATOR_BY_SLUG.get(item.creatorSlug);
            return dotCard ? (
              <CreatorCard
                key={item.id}
                creator={dotCard}
                variant={item.variant}
                className="reveal-card"
                liveStream={liveFor(live, dotCard.login, now)}
              />
            ) : null;
          })}
        </div>
      ) : (
        <div className="reveal-stage">
          {/* L'explosion se pose **sur la carte**, pas sur l'écran : c'est elle
              qu'on regarde, et un effet plein cadre noierait le nom du créateur. */}
          {burst ? <EffectBurst key={`fx-${card.id}`} kind={burst} delayMs={burstDelay} offset="46%" /> : null}
          {card.isNew ? <span className="new-badge"><Sparkles size={12} /> NOUVELLE</span> : null}
          <div className={shaking ? "reveal-shake" : ""}>
            <CreatorCard
              key={card.id}
              creator={creator}
              variant={card.variant}
              className="reveal-card"
              liveStream={onAir}
            />
          </div>
          {/* Le rang, le nom et la région sont déjà sur la carte (tampon,
              nameplate). Ici : l'état, et rien d'autre. */}
          <div className="reveal-name">
            <p>
              {RARITY_META[card.rarity].label} · {regionLabel(creator.region)}
            </p>
            {/* Le meilleur moment de l'ouverture : la carte tombe pendant que la
                personne est en train de streamer. En plein écran (Légendaire ou
                Perfect), le titre du direct prend la place du simple libellé. */}
            {onAir ? (
              spotlight ? (
                <p className="reveal-live-show">
                  <i aria-hidden="true" />
                  <b>{creator.displayName} est en direct</b>
                  <span>
                    {onAir.title ? `${onAir.title} · ` : ""}
                    {viewersLabel(onAir.viewers)}
                  </span>
                </p>
              ) : (
                <p className="reveal-live">
                  <i aria-hidden="true" />
                  {onAir.gameName
                    ? `En direct maintenant · ${onAir.gameName} · ${viewersLabel(onAir.viewers)}`
                    : `En direct maintenant · ${viewersLabel(onAir.viewers)}`}
                </p>
              )
            ) : null}
            {/* Le tirage réserve toujours la dernière carte : le dire évite de
                croire à un hasard, et annonce le moment fort du paquet. */}
            {isLast && !perfect ? (
              <span className="reveal-guaranteed">Carte garantie du booster</span>
            ) : null}
          </div>
          {/* L'affiche : le geste qui garde la trace d'un moment rare. Elle ne
              s'affiche que si un compte existe (c'est lui qui a un profil à
              dessiner), et seulement sur un Légendaire ou un Perfect. */}
          {spotlight && cloud.configured && cloud.userId && !overlay ? (
            <button
              type="button"
              className="reveal-poster"
              onClick={() => {
                // Le profil public lit l'identifiant hors du rendu : on le
                // capture ici, sinon TypeScript ne peut pas savoir qu'il existe.
                const selfId = cloud.userId;
                if (!selfId) return;
                onClose();
                void cloudStore.openProfile(selfId);
              }}
            >
              <Share2 size={15} />
              <span>Faire une affiche</span>
            </button>
          ) : null}
        </div>
      )}

      <button className="reveal-next" onClick={advance} disabled={locked}>
        <span>
          {locked
            ? "Perfect…"
            : resistLeft > 0
              ? "La carte résiste — insiste"
              : isLast
                ? "Ranger dans le classeur"
                : "Révéler la suivante"}
        </span>
        {locked ? <Sparkles size={18} /> : isLast ? <BookOpen size={18} /> : <ChevronRight size={18} />}
      </button>
    </div>
  );
}
