"use client";

/**
 * L'écran **Toi** : les statistiques, la wishlist, puis **trois familles** de
 * portes — Compte (tout ce qui vit en ligne), Progression (ce que le jeu
 * publie : objectifs, taux) et Réglages (thème, son, reflets) — et, tout en
 * bas, le bouton rouge de remise à zéro.
 *
 * Trois familles et pas une seule liste : sur un téléphone, onze lignes à la
 * suite se lisent mal, et une ligne qu'on ne trouve pas est une ligne qui
 * n'existe pas. Chaque titre dit ce qu'il y a dessous.
 */
import { useEffect, useState } from "react";

import { BookOpen, ChevronRight, Layers3, Target, Zap } from "lucide-react";

import { CreditsBlock } from "@/components/credits";
import { useCloud } from "@/hooks/use-cloud";

import { useInbox } from "@/hooks/use-inbox";
import { useNow } from "@/hooks/use-game";

import { CATALOG_EDITION, CREATORS, CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";
import { readySteals } from "@/lib/last-pack";

import { regionLabel } from "@/lib/regions";

import { applyTiltChoice, setTiltEnabled, tiltAvailable, tiltEnabled } from "@/lib/tilt";

import {
  SFX_LEVEL_LABELS,
  SFX_LEVELS,
  getSfxLevel,
  isMuted,
  playSelect,
  setMuted,
  setSfxLevel,
  type SfxLevel,
} from "@/lib/sfx";
import { type GameView } from "@/lib/game-engine";

import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";


export function ProfileView({
  game,
  onNotice,
  onError,
  onShowOdds,
  onShowMissions,
  onShowThemes,
  onShowStudio,
  onShowAccount,
  onShowLeaderboard,
  onShowFriends,
  onShowMarket,
  onShowLastPack,
  onShowArena,
  onShowNotifications,
  onShowOwnProfile,
  onShowWishlist,
}: {
  game: GameView;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  onShowThemes: () => void;
  onShowStudio: () => void;
  onShowAccount: () => void;
  onShowLeaderboard: () => void;
  onShowFriends: () => void;
  onShowMarket: () => void;
  onShowLastPack: () => void;
  onShowArena: () => void;
  onShowNotifications: () => void;
  onShowOwnProfile: () => void;
  onShowWishlist: () => void;
}) {
  const cloud = useCloud();
  // Le compte du carnet passe par le hook, et non par le store : lui seul
  // ajoute la ligne du direct du créateur épinglé, que le serveur ne fabrique
  // pas. La pastille et la feuille comptent ainsi exactement la même liste.
  const { unread: inboxUnread } = useInbox();
  // Ce qui est prenable maintenant : la pastille du menu, calculée à partir de
  // l'étagère du serveur et de son horloge (voir `readySteals`).
  const lastPackNow = useNow(15_000);
  const lastPackReady = readySteals(cloud.lastPacks, cloud.lastPacksAt ?? lastPackNow, lastPackNow);
  // Les récompenses d'arène non encaissées : même principe que le Last Pack —
  // une pastille qui compte ce qui attend le joueur, pas ce qui l'attend lui.
  const arenaRewards = cloud.arenaMine?.pending.length ?? 0;
  // L'épinglé se relit au montage de l'onglet, et à chaque changement de
  // compte : ce n'est pas l'épinglé d'un autre joueur qui doit s'afficher.
  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    void cloudStore.loadWishlist();
  }, [cloud.configured, cloud.userId]);
  const wishlistCreator = cloud.wishlistSlug ? CREATOR_BY_SLUG.get(cloud.wishlistSlug) ?? null : null;
  // Le son vit hors de React (module Web Audio) : l'état local ne sert qu'à
  // dessiner le bon côté de l'interrupteur.
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  // Le cran de volume vit dans le module du son (comme le silence) : l'état
  // local ne sert qu'à dessiner le cran choisi.
  const [soundLevel, setSoundLevel] = useState<SfxLevel>(() => getSfxLevel());
  // Le réglage des reflets s'applique au document dès le démarrage : sans ça,
  // un joueur qui les a coupés les reverrait le temps d'un rendu (le CSS, lui,
  // ne connaît pas `localStorage`).
  useEffect(() => {
    applyTiltChoice();
  }, []);
  // Les reflets des cartes (Holo, Gold, Live) : le foil suit le doigt, et
  // l'inclinaison quand l'appareil a un capteur. Le réglage coupe **tout** —
  // c'est le bouton de secours de celui que l'effet fatigue.
  const [tiltOn, setTiltOn] = useState(() => tiltEnabled());
  const [canTilt] = useState(() => tiltAvailable());
  // Le studio de tirages est un outil de mise au point, pas une option de jeu :
  // il s'ouvre en appuyant cinq fois sur la pastille de niveau.
  const [tools, setTools] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  function tapLevel() {
    const now = Date.now();
    const count = now - lastTap > 3_000 ? 1 : tools + 1;
    setLastTap(now);
    if (count >= 5) {
      setTools(0);
      onShowStudio();
    } else {
      setTools(count);
    }
  }

  function toggleTilt() {
    const next = !tiltOn;
    setTiltOn(next);
    setTiltEnabled(next);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    // À l'activation, une **sélection courte** : l'utilisateur entend ce qu'il
    // vient de rallumer, au volume qu'il a réglé. Pas un carillon de
    // récompense — il n'a rien gagné, il a touché un interrupteur. (Et rien
    // quand il coupe : c'est le principe.)
    if (next) playSelect();
  }

  function choisirVolume(cran: SfxLevel) {
    setSoundLevel(cran);
    setSfxLevel(cran);
    // Le son qui répond est **celui du réglage** : court, et joué au nouveau
    // cran, donc le joueur entend exactement ce qu'il vient de choisir.
    playSelect();
  }

  async function handleReset() {
    if (!window.confirm("Réinitialiser la progression ? Toutes tes cartes seront perdues.\n\nSi tu joues connecté, ce qui est enregistré en ligne est effacé aussi.")) {
      return;
    }
    // L'appareil d'abord, le serveur ensuite : la partie neuve qu'il faut
    // remonter est celle que `gameStore.reset()` vient d'écrire.
    gameStore.reset();
    if (!cloud.configured || !cloud.userId) {
      onNotice("Nouvelle partie lancée.");
      return;
    }
    onNotice("Nouvelle partie lancée.");
    const outcome = await cloudStore.resetProgress();
    if (outcome.status === "done") onNotice(outcome.message);
    else if (outcome.status === "unavailable") {
      // L'appareil a bien redémarré : le serveur, lui, garde sa réserve. On le
      // dit, plutôt que de laisser croire à une remise à zéro complète.
      onError(`Partie locale remise à zéro. En ligne : ${outcome.message}`);
    }
  }

  return (
    <div className="view profile-view">
      <section className="profile-card">
        <button
          type="button"
          className="profile-avatar"
          onClick={tapLevel}
          aria-label={`Niveau ${game.player.level}`}
        >
          <span>{game.player.level}</span>
        </button>
        <div>
          <h1>Mon profil</h1>
          <span>{CATALOG_EDITION}</span>
        </div>
      </section>

      <div className="stats-grid">
        <article>
          <Layers3 size={18} />
          <strong>{game.stats.totalCards}</strong>
          <span>cartes</span>
        </article>
        <article>
          <BookOpen size={18} />
          <strong>{game.stats.uniqueCreators}/{CREATORS.length}</strong>
          <span>streameurs</span>
        </article>
        <article>
          <Zap size={18} />
          <strong>{game.stats.openings}</strong>
          <span>boosters</span>
        </article>
      </div>

      {/*
       * La wishlist. Elle ne s'affiche que sur un build avec cloud : un épinglé
       * que personne ne peut voir n'a pas de sens, et un bloc grisé de plus
       * encombrerait l'onglet pour rien.
       */}
      {cloud.configured ? (
        <section className="wishlist-block" aria-label="Wishlist">
          <div className="wishlist-title">
            <Target size={16} />
            <h2>Wishlist</h2>
          </div>
          {!cloud.userId ? (
            <div className="wishlist-body">
              <p>
                Connecte-toi pour épingler le créateur que tu cherches : les autres le verront sur
                ta fiche.
              </p>
            </div>
          ) : wishlistCreator ? (
            <div className="wishlist-body">
              <div className="wishlist-name">
                <b>{wishlistCreator.displayName}</b>
                <span>
                  {RARITY_META[wishlistCreator.rarity].label} · {regionLabel(wishlistCreator.region)}
                </span>
              </div>
              <div className="wishlist-actions">
                <button type="button" className="account-button ghost" onClick={onShowWishlist}>
                  Changer
                </button>
                <button
                  type="button"
                  className="account-button ghost"
                  disabled={cloud.wishlistBusy}
                  onClick={() => void cloudStore.clearWishlist()}
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <div className="wishlist-body">
              <p>Le créateur qui te manque le plus. Un seul, et il s&apos;affiche chez toi.</p>
              <button type="button" className="account-button ghost" onClick={onShowWishlist}>
                Épingler un créateur
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/*
       * Le menu : trois familles, des libellés seuls. Pas de sous-texte pour
       * expliquer chaque ligne — un menu de jeu se lit d'un coup d'œil. Ce qui
       * a besoin d'explications les donne là où on s'en sert : l'écran Compte,
       * la feuille des taux, le thème.
       */}
      <section className="menu-group" aria-label="Compte">
        <h2>Compte</h2>
        <button type="button" className="menu-row" onClick={onShowAccount}>
          <span>Mon compte</span>
          <ChevronRight size={16} />
        </button>
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowLeaderboard}>
            <span>Classement mondial</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured && cloud.userId ? (
          <button type="button" className="menu-row" onClick={onShowOwnProfile}>
            <span>Ma fiche publique</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowFriends}>
            <span>Amis</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowMarket}>
            <span>Hôtel des ventes</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowArena}>
            <span>Arène</span>
            {arenaRewards > 0 ? <b className="menu-count">{arenaRewards}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowLastPack}>
            <span>Last Pack</span>
            {lastPackReady > 0 ? <b className="menu-count">{lastPackReady}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
        {cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowNotifications}>
            <span>Notifications</span>
            {inboxUnread > 0 ? <b className="menu-count">{inboxUnread}</b> : null}
            <ChevronRight size={16} />
          </button>
        ) : null}
      </section>

      {/*
       * Progression : ce que le jeu publie (les objectifs de la saison, les
       * taux du tirage). Ce sont des écrans qu'on ouvre pour lire, pas pour
       * jouer — d'où leur famille à part.
       */}
      <section className="menu-group" aria-label="Progression">
        <h2>Progression</h2>
        <button type="button" className="menu-row" onClick={onShowMissions}>
          <span>Objectifs et saisons</span>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="menu-row" onClick={onShowOdds}>
          <span>Taux de drop</span>
          <ChevronRight size={16} />
        </button>
      </section>

      {/* Réglages : les trois choses qu'on règle une fois. Le thème est une
          porte (il se choisit), le son et les reflets sont des interrupteurs
          (ils se coupent sur place). */}
      <section className="menu-group" aria-label="Réglages">
        <h2>Réglages</h2>
        <button type="button" className="menu-row" onClick={onShowThemes}>
          <span>Thème du classeur</span>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="menu-row"
          role="switch"
          aria-checked={soundOn}
          onClick={toggleSound}
        >
          <span>Son</span>
          <span className="switch" data-on={soundOn ? "on" : "off"} aria-hidden="true">
            <i />
          </span>
        </button>
        {/* Le volume, sous l'interrupteur et seulement quand le son est actif :
            trois crans, pas un curseur — c'est un réglage qu'on cherche quand un
            son dérange, pas une balance à ajuster. */}
        {soundOn ? (
          <div className="menu-row sound-row">
            <span id="volume-label">Volume</span>
            <div className="sound-choice" role="group" aria-labelledby="volume-label">
              {SFX_LEVELS.map((cran) => (
                <button
                  key={cran}
                  type="button"
                  className={soundLevel === cran ? "sound-chip active" : "sound-chip"}
                  aria-pressed={soundLevel === cran}
                  onClick={() => choisirVolume(cran)}
                >
                  {SFX_LEVEL_LABELS[cran]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {canTilt ? (
          <button
            type="button"
            className="menu-row"
            role="switch"
            aria-checked={tiltOn}
            onClick={toggleTilt}
          >
            <span>Reflets des cartes</span>
            <span className="switch" data-on={tiltOn ? "on" : "off"} aria-hidden="true">
              <i />
            </span>
          </button>
        ) : null}
        {/*
         * Le code promo n'est plus dans le menu : il ne sert que le jour où un
         * code existe, et « Toi » a déjà trop de portes pour un écran de
         * téléphone. Sa place, quand il reviendra, est **ici** : c'est un
         * réglage, pas une activité. L'écran (`promo-code-sheet.tsx`) et la
         * fonction serveur restent en place — remettre la ligne suffit à le
         * rallumer.
         */}
      </section>

      {/* Les crédits : ce que le jeu n'a pas dessiné, et qui l'a fait. Discrets,
          repliés, et avant le rouge — on ne tombe pas dessus en cherchant autre
          chose, et deux licences demandent qu'ils soient là. */}
      <CreditsBlock />

      {/* Le rouge, tout en bas et séparé du reste : on ne le touche pas par
          accident. */}
      <button type="button" className="menu-reset" onClick={() => void handleReset()}>
        Réinitialiser la progression
      </button>
    </div>
  );
}

