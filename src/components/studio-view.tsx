"use client";

/**
 * L'écran **Studio** : le simulateur de streameur (`0036_streamer.sql`).
 *
 * C'est un **onglet** de la barre du bas, pas une feuille : il occupe la hauteur
 * de l'écran et son propre univers. La pièce (décor, équipements qui arrivent
 * avec les paliers, socles d'invités) est en haut — c'est
 * `src/components/streamer-studio-stage.tsx` — puis viennent, dans l'ordre où le
 * joueur se pose la question : l'imprévu du jour, la vidéo du jour (un format,
 * un appui), le setup en paliers (points ou doublons) et le classeur d'invités.
 *
 * Ce que l'écran **ne fait pas** : tirer. Le tirage de la vidéo, le gain et le
 * versement des jetons sont au serveur — et celui qui n'a pas de serveur a le
 * moteur local, avec les mêmes règles, via `cloudStore`.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CirclePlay,
  Clapperboard,
  Gavel,
  Hammer,
  Handshake,
  Info,
  MoonStar,
  Radio,
  Sparkles,
  TrendingUp,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";

import { useCloud } from "@/hooks/use-cloud";
import { useGame, useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import { sacrificeTally, setupSacrificeCandidates } from "@/lib/game-engine";
import { releveApres, type StreamerOpening } from "@/lib/cloud/store/streamer";
import { gameDay } from "@/lib/progression";
import {
  GUEST_SLOTS,
  GUEST_LIVE_WINDOW_MINUTES,
  collabVideoPermille,
  SETUP_LEVELS,
  STREAMER,
  STREAMER_TOKEN_CAP,
  availableFormats,
  collabFor,
  eventById,
  eventChoice,
  eventForDay,
  eventHeadline,
  formatById,
  growthWithSetup,
  guestRaidPermille,
  liveGuestSlugs,
  nextSetupLevel,
  raidForGuests,
  raidLine,
  sacrificePrice,
  sacrificeValue,
  setupBonusPermille,
  tierProgress,
  tokensOnDay,
} from "@/lib/streamer";
import { TEAR_HAPTIC } from "@/lib/reveal";

import { buzz } from "@/lib/haptics";
import { swipeVerdict, type SwipeSide } from "@/lib/swipe";

import { LIVE_SECONDS, StreamerLiveGame } from "@/components/streamer-live-game";
import { liveStore } from "@/lib/live-store";
import { liveFor } from "@/lib/live";
import { StreamerStudioStage } from "@/components/streamer-studio-stage";
import {
  SFX_STUDIO,
  playCardPlace,
  playChime,
  playEquip,
  playFanfare,
  playMenuClose,
  playMenuOpen,
  playPowerUp,
  playSelect,
  preloadSamples,
} from "@/lib/sfx";

const count = new Intl.NumberFormat("fr-FR");

/**
 * Une icône par imprévu : la carte se lit avant de se lire. Le titre reste le
 * texte du fichier de règles ; l'icône n'est qu'une porte d'entrée visuelle.
 */
const ICONES_IMPREVU: Record<string, typeof Sparkles> = {
  modo: Gavel,
  sponsor: Handshake,
  clip: Clapperboard,
  coupure: WifiOff,
  raid: UsersRound,
  nuit: MoonStar,
};

export function StudioView() {
  const state = useGame();
  const cloud = useCloud();
  const now = useNow(30_000);
  const [opening, setOpening] = useState<StreamerOpening | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  // Le studio (rangs 6 à 8) : les doublons choisis pour le prochain palier, et
  // l'écran de confirmation — une carte qui quitte le classeur se confirme,
  // comme le recyclage d'un doublon Live.
  const [sacrifie, setSacrifie] = useState<string[]>([]);
  const [confirmeSacrifice, setConfirmeSacrifice] = useState(false);
  // Le geste de la carte : la course du doigt, et le côté armé (rien tant que le
  // seuil n'est pas franchi). `armedRef` évite de vibrer à chaque pixel.
  const [drag, setDrag] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  // Le live de vingt secondes : ouvert, il prend tout l'écran — c'est une scène,
  // pas un panneau de plus.
  const [liveOuvert, setLiveOuvert] = useState(false);
  // Le palier **qu'on vient d'installer** : ses objets tombent dans la pièce et
  // une bouffée de fumée marque l'endroit. On l'éteint deux secondes plus tard,
  // sinon la pièce rejouerait la scène à chaque retour dans l'onglet.
  const [installe, setInstalle] = useState<string | null>(null);
  // Le bureau : la place qu'on est en train de remplir (1 ou 2, `null` sinon).
  const [placeOuverte, setPlaceOuverte] = useState<number | null>(null);
  const [recherche, setRecherche] = useState("");
  const [armed, setArmed] = useState<SwipeSide | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef<SwipeSide | null>(null);

  // Ouvre la chaîne : le retour du joueur est payé ici, une fois par absence.
  useEffect(() => {
    // Les bruitages du Studio (acheter un palier, publier, poser un invité) sont
    // chargés à l'ouverture de l'onglet : on peut y passer une minute avant le
    // geste qui compte, et un premier achat muet se remarquerait.
    preloadSamples(SFX_STUDIO);
    let vivant = true;
    // On regarde le direct en même temps : c'est lui qui décide si un invité
    // du bureau amène un raid. La lecture est muette (le direct est un bonus,
    // jamais une condition pour jouer) et le relevé du raid se refait tout
    // seul dès qu'elle revient — voir plus bas.
    void liveStore.refresh();
    void cloudStore.openStreamer().then((resultat) => {
      if (vivant) setOpening(resultat);
    });
    return () => {
      vivant = false;
    };
  }, []);

  // L'arrivée d'un palier ne dure que le temps qu'on la voie.
  useEffect(() => {
    if (!installe) return;
    const minuterie = window.setTimeout(() => setInstalle(null), 2_000);
    return () => window.clearTimeout(minuterie);
  }, [installe]);

  const jour = gameDay(now);
  const streamer = state?.streamer;
  // Le premier format ouvert est celui qui marche le plus souvent, à défaut le
  // premier du fichier : la liste reste celle du fichier, dans son ordre.
  const formats = useMemo(() => {
    if (!state) return [];
    // Le même compteur que le serveur (`stats.unique_creators`) : la Collab
    // demande de posséder au moins un créateur.
    const owned = new Set(state.cards.map((card) => card.creatorSlug)).size;
    return availableFormats(owned);
  }, [state]);
  const choisi = formatId ?? formats[0]?.id ?? null;

  const video = streamer?.video?.day === jour ? streamer.video : null;
  const deja = Boolean(video);
  const jetons = streamer ? tokensOnDay(streamer, jour) : 0;
  const abonnes = streamer?.subscribers ?? 0;
  const progression = tierProgress(abonnes);
  const vue = opening?.status === "done" ? opening : null;
  const refuse = opening?.status === "refused" ? opening : null;
  // Le setup vient du serveur quand il y en a un (c'est lui qui débite), de la
  // sauvegarde sinon. Le bonus se lit sur la même liste dans les deux cas.
  const setup = vue?.setup ?? streamer?.setup ?? [];
  // Le bonus affiché est celui du serveur quand il vient de répondre — c'est lui
  // qui paiera la prochaine vidéo ; hors ligne, la même règle (le préfixe
  // contigu) est appliquée en local, et le test miroir garantit qu'elles disent
  // la même chose.
  const bonus = vue ? vue.setupBonus : setupBonusPermille(setup);
  const croissance = growthWithSetup(abonnes, setup);
  const prochain = nextSetupLevel(setup);
  // Le studio : ce que le prochain palier coûte en doublons (0 s'il se paie en
  // points), les doublons qui peuvent partir — Rares et Épiques, jamais la
  // dernière copie, jamais une Légendaire — et la valeur de la sélection.
  const prixDoublons = prochain ? sacrificePrice(prochain) : 0;
  const candidats = useMemo(() => (state ? setupSacrificeCandidates(state) : []), [state]);
  const choixStudio = useMemo(
    () => candidats.filter((entree) => sacrifie.includes(entree.card.id)),
    [candidats, sacrifie],
  );
  const valeurSacrifice = sacrificeTally(choixStudio.map((entree) => entree.card));
  // La carte du jour : celle que le serveur a donnée, sinon celle du moteur
  // local (même journée de jeu des deux côtés). Le **texte** vient toujours du
  // fichier de règles ; le serveur ne connaît que l'identifiant.
  const etatCarte = vue?.event ?? (streamer?.event?.day === jour ? streamer?.event : null);
  const carte = eventById(etatCarte?.event ?? "") ?? eventForDay(jour);
  // L'icône de l'imprévu du jour : la carte du fichier de règles d'abord, sinon
  // celle du jour. Une icône par famille d'imprévu, jamais une devinette.
  const IconeImprevu = ICONES_IMPREVU[carte.id] ?? Sparkles;
  const coteGauche = eventChoice(carte, "gauche");
  const coteDroite = eventChoice(carte, "droite");
  const coteJoue = etatCarte ? eventChoice(carte, etatCarte.choice) : null;
  const carteJouee = Boolean(etatCarte);

  // --- Le bureau : deux invités, choisis dans la collection -----------------
  //
  // Le bureau vient du serveur quand il a répondu (c'est lui qui le garde),
  // sinon de la sauvegarde. Le **direct**, lui, vient de `useBinder()` : c'est
  // la même donnée que le badge de l'accueil, et celle que le serveur lit dans
  // `live_state` au moment de payer — les deux fenêtres valent dix minutes.
  const live = useLive();
  const guests = useMemo(() => vue?.guests ?? streamer?.guests ?? [], [vue, streamer]);
  // Le raid retenu par la sauvegarde : c'est lui qui garde **qui** est passé,
  // même après la fin du direct (le badge, lui, s'éteint avec la fenêtre).
  const raidDu = streamer?.raid?.day === jour ? streamer.raid : null;
  const raidPaye = vue ? vue.raidToday : raidDu?.gained ?? 0;
  const direct = useMemo(() => liveGuestSlugs(guests, live, now), [guests, live, now]);
  // Le direct de chaque invité, pour que **sa carte** porte le badge (le même
  // test de fraîcheur que la scène : `liveFor`, dix minutes).
  const liveStreams = useMemo(() => {
    const out = new Map<string, NonNullable<ReturnType<typeof liveFor>>>();
    for (const invite of guests) {
      const creator = CREATOR_BY_SLUG.get(invite.slug);
      const stream = liveFor(live, creator?.login, now);
      if (stream) out.set(invite.slug, stream);
    }
    return out;
  }, [guests, live, now]);
  // Ce que le bureau vaudrait **maintenant**, avant de poser le deuxième : le
  // joueur voit ce que sa seconde carte apporterait, sans avoir à la poser.
  const raidPossible = useMemo(
    () => raidForGuests(croissance, guests, direct),
    [croissance, guests, direct],
  );
  // Ce que le **plateau** vaut maintenant : le même calcul que le serveur au
  // moment de publier (`collabFor`), donc le chiffre annoncé est celui qui sera
  // payé — rareté des invités, et bonus du direct s'il y en a un.
  const collabPossible = useMemo(() => collabFor(guests, direct), [guests, direct]);
  // Les cartes qu'on peut poser : un créateur **différent** de celui d'à côté,
  // encore en direct, et une seule carte par créateur (le plus rare d'abord).
  const choixInvites = useMemo(() => {
    if (placeOuverte === null) return [];
    const voisins = new Set(guests.filter((g) => g.slot !== placeOuverte).map((g) => g.slug));
    const vus = new Set<string>();
    const out: { id: string; slug: string; label: string; rarity: Rarity; permille: number }[] = [];
    for (const carte of state?.cards ?? []) {
      if (voisins.has(carte.creatorSlug) || vus.has(carte.creatorSlug)) continue;
      if (!direct.has(carte.creatorSlug)) continue;
      vus.add(carte.creatorSlug);
      out.push({
        id: carte.id,
        slug: carte.creatorSlug,
        label: CREATOR_BY_SLUG.get(carte.creatorSlug)?.displayName ?? carte.creatorSlug,
        rarity: carte.rarity,
        permille: guestRaidPermille(carte.rarity),
      });
    }
    const mot = recherche.trim().toLowerCase();
    return out
      .filter((invite) => (mot ? invite.label.toLowerCase().includes(mot) : true))
      .sort((a, b) => b.permille - a.permille || a.label.localeCompare(b.label, "fr"));
  }, [placeOuverte, guests, state?.cards, direct, recherche]);

  async function publier() {
    if (!choisi || busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.publishStreamerVideo(choisi, direct);
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    // Publier, c'est le moment qui paie : le carillon, et la pièce qui monte
    // d'un cran si la chaîne a franchi un palier de notoriété.
    playChime();
    if (issue.message && issue.message.includes("palier")) playPowerUp();
    setNotice({ message: issue.message ?? "Vidéo publiée.", isError: false });
  }

  /** Le doigt se pose sur la carte : le geste commence (sauf si elle est jouée). */
  function cardStart(event: PointerEvent<HTMLElement>) {
    if (carteJouee || busy) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    armedRef.current = null;
    setArmed(null);
    // Le doigt continue de piloter la carte même s'il sort de ses bords. Le
    // test est là pour les environnements sans capture de pointeur (jsdom) :
    // sans elle, le geste marche encore, il perd juste la sortie des bords.
    const cible = event.currentTarget;
    if (typeof cible.setPointerCapture === "function") cible.setPointerCapture(event.pointerId);
  }

  function cardMove(event: PointerEvent<HTMLElement>) {
    const debut = dragRef.current;
    if (!debut) return;
    const verdict = swipeVerdict(event.clientX - debut.x, event.clientY - debut.y);
    if (verdict.armed && armedRef.current !== verdict.armed) {
      // Le seuil est franchi : une vibration courte, une seule fois — c'est le
      // même geste que la déchirure du booster, et le même son serait de trop
      // ici (la carte se choisit en silence).
      buzz(TEAR_HAPTIC);
    }
    armedRef.current = verdict.armed;
    setArmed(verdict.armed);
    setDrag({ dx: verdict.dx, dy: event.clientY - debut.y });
  }

  /** Le doigt se lève : si un côté est armé, l'imprévu est joué. */
  function cardEnd() {
    const choisi = armedRef.current;
    dragRef.current = null;
    armedRef.current = null;
    setArmed(null);
    setDrag({ dx: 0, dy: 0 });
    if (choisi) void repondre(choisi);
  }

  /**
   * Le geste est **retiré** (défilement pris par le navigateur, appel entrant,
   * deuxième doigt) : la carte se repose et ne répond rien. Même règle que le
   * booster : relâcher n'est pas se faire couper.
   */
  function cardCancel() {
    dragRef.current = null;
    armedRef.current = null;
    setArmed(null);
    setDrag({ dx: 0, dy: 0 });
  }

  /** Répond à l'imprévu du jour : le serveur tire, l'appareil applique. */
  async function repondre(cote: SwipeSide) {
    if (!carte || busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.chooseStreamerEvent(carte.id, cote);
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    playSelect();
    setNotice({ message: issue.message ?? "Imprévu joué.", isError: false });
  }

  /**
   * Pose un invité sur le bureau — ou libère la place si `cardId` est nul.
   *
   * Le bureau lui-même ne paie rien : il décide seulement de **qui** peut
   * amener un raid. Le raid est payé par le relevé de la chaîne (le serveur à
   * l'ouverture avec un compte, le moteur local sinon), une fois par journée de
   * jeu — changer d'invité après coup ne repaie donc jamais.
   */
  async function poserInvite(slot: number, cardId: string | null) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.setStreamerGuest(slot, cardId);
    setBusy(false);
    setPlaceOuverte(null);
    setRecherche("");
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    // La carte se pose sur son socle. Si le créateur streame maintenant, c'est
    // un raid qui arrive : la pièce le dit avant que le chiffre tombe.
    playCardPlace();
    const slug = cardId ? state?.cards.find((carte) => carte.id === cardId)?.creatorSlug : null;
    if (slug && direct.has(slug)) playFanfare();
    else playSelect();
    setNotice({ message: issue.message ?? "Bureau à jour.", isError: false });
  }

  /**
   * Le relevé du raid, refait **une fois** si le direct était périmé.
   *
   * Le raid se paie dans le relevé de la chaîne, et le serveur ne paie que si
   * `live_state` a moins de dix minutes : ouvert juste avant un
   * rafraîchissement du direct, l'écran paierait zéro. Le serveur n'écrit
   * alors **aucune** ligne de raid — la journée reste donc ouverte, et ce
   * second relevé la rattrape. Garde-fou : une seule tentative par journée de
   * jeu, et seulement s'il y a vraiment un invité en direct à rattraper.
   */
  const raidRattrape = useRef<string | null>(null);
  useEffect(() => {
    if (raidRattrape.current === jour) return;
    // On attend le premier relevé : sans lui, les invités ne sont pas encore
    // connus et le rattrapage partirait à vide.
    if (!opening || opening.status !== "done") return;
    if (raidPaye > 0) {
      raidRattrape.current = jour;
      return;
    }
    if (guests.length === 0 || direct.size === 0) return;
    raidRattrape.current = jour;
    let vivant = true;
    void cloudStore.openStreamer(direct).then((nouveau) => {
      if (!vivant) return;
      // L'absence ne se rejoue pas : `releveApres` garde le résumé du premier
      // relevé et n'ajoute que ce que le second apporte.
      setOpening((precedent) => releveApres(precedent, nouveau));
    });
    return () => {
      vivant = false;
    };
  }, [opening, jour, raidPaye, guests, direct]);

  /**
   * Relit la pièce : ce que le serveur (ou le moteur local) vient d'écrire.
   *
   * L'ouverture de l'onglet est un **relevé**, pris une fois au montage. Tout ce
   * qui change la chaîne après — un palier acheté, un invité posé — vit dans la
   * sauvegarde, pas dans ce relevé : sans cette relecture, l'objet serait payé
   * et resterait invisible jusqu'à ce qu'on quitte l'onglet. Elle garde le
   * résumé du retour (`releveApres`), qui n'appartient qu'au premier relevé.
   */
  async function rafraichir() {
    const nouveau = await cloudStore.openStreamer(direct);
    setOpening((precedent) => releveApres(precedent, nouveau));
  }

  /** Installe le prochain palier de setup (le prix est celui du serveur). */
  async function acheter(id: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.buyStreamerSetup(id);
    if (issue.status !== "done") {
      setBusy(false);
      setNotice({ message: issue.message, isError: true });
      return;
    }
    // L'équipement entre dans la pièce : le son du matériel qu'on branche, puis
    // la pièce qui tombe.
    playEquip();
    playPowerUp();
    setNotice({ message: issue.message ?? "Palier installé.", isError: false });
    // **Puis la pièce se relit.** Le relevé d'ouverture est celui d'**avant**
    // l'achat : sans cette relecture, l'objet serait payé mais n'entrerait
    // jamais dans la pièce avant de quitter l'onglet. On joue l'arrivée juste
    // après, pour que l'objet tombe et fume **ensemble**.
    await rafraichir();
    setBusy(false);
    setInstalle(id);
  }

  /**
   * Sacrifie les doublons choisis pour installer le prochain palier du studio.
   *
   * Le serveur décide (il relit la collection et le barème) et renvoie les
   * cartes qu'il a **réellement** prises : un refus ne retire rien.
   */
  async function sacrifier() {
    if (busy || !prochain || valeurSacrifice !== prixDoublons) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.sacrificeStreamerSetup(sacrifie);
    if (issue.status !== "done") {
      setBusy(false);
      setNotice({ message: issue.message, isError: true });
      return;
    }
    setSacrifie([]);
    setConfirmeSacrifice(false);
    playCardPlace();
    // Le palier s'installe : même arrivée que celui payé en points, relecture
    // comprise (`rafraichir`), sinon l'objet n'entrerait pas dans la pièce.
    playEquip();
    setNotice({ message: issue.message ?? "Sacrifice fait.", isError: false });
    const id = prochain?.id ?? null;
    await rafraichir();
    setBusy(false);
    setInstalle(id);
  }

  return (
    <div className="view studio-view" aria-label="Studio">
      {liveOuvert && choisi ? (
          <StreamerLiveGame
            day={jour}
            subscribers={abonnes}
            format={formatById(choisi) ?? STREAMER.formats[0]}
            busy={busy}
            onPublish={async () => {
              await publier();
              setLiveOuvert(false);
            }}
            onLeave={() => setLiveOuvert(false)}
          />
      ) : (
        <>
        {notice ? (
          <div className={`account-note ${notice.isError ? "error" : "ok"}`}>
            {notice.isError ? <AlertTriangle size={15} /> : <Check size={15} />}
            <span>{notice.message}</span>
          </div>
        ) : null}

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <span>
              Sans serveur : ta chaîne vit sur cet appareil, mêmes règles ({STREAMER.tokens.perSuccess} jetons
              par vidéo, +{STREAMER.tokens.perBuzz} si elle buzz, {STREAMER_TOKEN_CAP} au plus par jour).
            </span>
          </div>
        ) : null}

        {refuse ? (
          <div className="account-note error">
            <AlertTriangle size={15} />
            <span>{refuse.message}</span>
          </div>
        ) : null}

        {/* Le résumé du retour : la chaîne a grandi pendant l'absence. */}
        {vue && vue.days > 0 ? (
          <div className="chaine-return" role="status">
            <TrendingUp size={15} />
            <div>
              {vue.lines.map((ligne) => (
                <span key={ligne}>{ligne}</span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Le studio : la scène. Le décor, les huit objets du setup qui
            s'allument, les deux socles d'invités — et le HUD (rang, jauge
            d'abonnés, rythme, jetons) qui remplace les trois chiffres de
            l'ancien tableau de bord. */}
        <StreamerStudioStage
          guests={guests}
          direct={direct}
          liveStreams={liveStreams}
          setup={setup}
          justInstalled={installe}
          collabPermille={vue ? vue.collabPermille : collabPossible.permille}
          collabLive={vue ? vue.collabLive : collabPossible.live}
          raidToday={raidPaye}
          raidLine={raidPaye > 0 ? raidLine({ gained: raidPaye, slugs: raidDu?.slugs ?? [] }) : null}
          raidPossible={raidPossible.gained}
          subscribers={abonnes}
          perDay={croissance}
          tierLabel={progression.tier.label}
          nextTierAt={progression.next ? progression.next.at : null}
          progressRatio={progression.ratio}
          tokens={jetons}
          tokensCap={STREAMER_TOKEN_CAP}
          busy={busy}
          onOpenSlot={(place) => {
            playMenuOpen();
            setPlaceOuverte(place);
            setRecherche("");
          }}
          onRemove={(place) => void poserInvite(place, null)}
        />

        {/* L'imprévu du jour : une carte, deux réponses, un tirage serveur.
            Compacte : l'icône, le titre, deux lignes de situation, et les deux
            actions arcade — leurs chances sont sur les boutons. */}
        <section className="chaine-event">
          <h3 className="chaine-badge">
            <Sparkles size={14} /> Événement du jour
          </h3>
          {carteJouee && etatCarte && coteJoue ? (
            <p className="chaine-outcome">
              {eventHeadline({
                choice: coteJoue,
                success: etatCarte.success,
                buzz: etatCarte.buzz,
                badBuzz: etatCarte.badBuzz,
                gained: etatCarte.gained,
              })}
            </p>
          ) : (
            <>
              <div
                className={`chaine-card${armed ? " arme" : ""}`}
                style={{
                  transform: `translateX(${Math.round(drag.dx * 0.6)}px) rotate(${Math.round(drag.dx / 22)}deg)`,
                }}
                onPointerDown={cardStart}
                onPointerMove={cardMove}
                onPointerUp={cardEnd}
                onPointerCancel={cardCancel}
              >
                <span className="chaine-card-head">
                  <span className="chaine-card-icon" aria-hidden="true">
                    <IconeImprevu size={17} />
                  </span>
                  <strong className="chaine-card-title">{carte.label}</strong>
                </span>
                <p className="chaine-card-text">{carte.detail}</p>
                <div className="chaine-card-sides">
                  <span className={armed === "gauche" ? "arme" : undefined}>{coteGauche?.label}</span>
                  <span className={armed === "droite" ? "arme" : undefined}>{coteDroite?.label}</span>
                </div>
              </div>
              <div className="chaine-card-buttons">
                <button type="button" disabled={busy} onClick={() => void repondre("gauche")}>
                  <span>{coteGauche?.label}</span>
                  {coteGauche ? <em>{(coteGauche.successChancePermille / 10).toFixed(0)} %</em> : null}
                </button>
                <button type="button" disabled={busy} onClick={() => void repondre("droite")}>
                  <span>{coteDroite?.label}</span>
                  {coteDroite ? <em>{(coteDroite.successChancePermille / 10).toFixed(0)} %</em> : null}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="chaine-video">
          <h3 className="chaine-badge">
            <CirclePlay size={14} /> {deja ? "Vidéo publiée" : "Vidéo du jour"}
          </h3>
          {deja && video ? (
            <p className="chaine-outcome">
              {formatById(video.format)
                ? `${formatById(video.format)!.label} : ${video.gained >= 0 ? "+" : "−"}${count.format(Math.abs(video.gained))} abonnés`
                : "Vidéo publiée"}
              {video.tokens > 0 ? ` · +${video.tokens} jetons` : " · plafond de jetons atteint"}
              {video.collab > 0 ? ` · plateau +${(video.collab / 10).toFixed(1)} %` : ""}
              {video.raid ? " · RAID !" : ""}
            </p>
          ) : (
            <>
              <div className="chaine-formats" role="radiogroup" aria-label="Format de la vidéo du jour">
                {(formats.length ? formats : STREAMER.formats).map((format) => {
                  const actif = choisi === format.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className={`chaine-format${actif ? " actif" : ""}`}
                      onClick={() => setFormatId(format.id)}
                    >
                      <span className="chaine-format-head">
                        <strong>{format.label}</strong>
                        <em>{(format.successChancePermille / 10).toFixed(0)} %</em>
                      </span>
                      <span className="chaine-format-odds">
                        ×{(format.gainPermille / 1000).toFixed(1)} gain · buzz{" "}
                        {(format.buzzPermille / 10).toFixed(0)} %
                        {format.badBuzzPermille ? ` · bad ${(format.badBuzzPermille / 10).toFixed(0)} %` : ""}
                        {format.requiresCreator ? " · créateur requis" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Le live de vingt secondes : c'est le moment de jeu. Il ne paie
                  rien — la vidéo continue d'être tirée en ligne — et le bouton
                  « Publier » juste en dessous reste le repli de qui ne veut
                  pas jouer la scène. */}
              <button
                type="button"
                className="chaine-live"
                disabled={busy || !choisi}
                onClick={() => setLiveOuvert(true)}
              >
                <CirclePlay size={17} />
                <span>Lancer le live de {LIVE_SECONDS} s</span>
                <em>{formatById(choisi)?.label ?? ""}</em>
              </button>
              <button type="button" className="chaine-publish" disabled={busy || !choisi} onClick={() => void publier()}>
                {busy ? "Publication…" : "Publier sans jouer le live"}
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </section>

        {/* Ton setup : les paliers du studio. Le rang, le prix, le gain — et
            l'action quand c'est le tour du palier. Les chiffres du HUD suivent. */}
        <section className="chaine-setup">
          <h3 className="chaine-badge">
            <Hammer size={14} /> Ton setup
            {bonus > 0 ? <em className="chaine-badge-bonus">+{(bonus / 10).toFixed(0)} %</em> : null}
          </h3>
          <ul className="chaine-setup-list">
            {SETUP_LEVELS.map((niveau, rang) => {
              const installe = setup.includes(niveau.id);
              const suivant = prochain?.id === niveau.id;
              return (
                <li
                  key={niveau.id}
                  className={`chaine-setup-item${installe ? " installe" : suivant ? " suivant" : ""}`}
                >
                  <span className="chaine-setup-rank" aria-hidden="true">
                    {installe ? <Check size={13} /> : rang + 1}
                  </span>
                  <span className="chaine-setup-head">
                    <strong>{niveau.label}</strong>
                    <span>
                      {niveau.currency === "doublons"
                        ? `${count.format(niveau.price)} doublon${niveau.price > 1 ? "s" : ""}`
                        : `${count.format(niveau.price)} pts`}
                      {niveau.growthPermille ? ` · +${(niveau.growthPermille / 10).toFixed(0)} %` : ""}
                    </span>
                  </span>
                  {suivant ? (
                    <button
                      type="button"
                      className="chaine-setup-buy"
                      disabled={busy}
                      onClick={() =>
                        niveau.currency === "points"
                          ? void acheter(niveau.id)
                          : document
                              .querySelector(".chaine-studio")
                              ?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                    >
                      {niveau.currency === "points"
                        ? `Installer · ${count.format(niveau.price)} pts`
                        : `Sacrifier · ${count.format(niveau.price)} doublon${niveau.price > 1 ? "s" : ""}`}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* Le studio : les paliers en doublons. La rareté donne le prix — un
              Épique vaut deux Rares — et une Légendaire ne part jamais. */}
          {prochain && prixDoublons > 0 ? (
            <div className="chaine-studio">
              <div className="chaine-chips">
                <span className="chaine-chip violet">
                  « {prochain.label} » · {count.format(prochain.price)} point
                  {prochain.price > 1 ? "s" : ""} de sacrifice
                </span>
                <span className="chaine-chip">
                  Rare = {sacrificeValue("rare")} · Épique = {sacrificeValue("epic")} · Légendaire jamais
                </span>
              </div>
              {candidats.length === 0 ? (
                <p className="chaine-note">Aucun doublon Rare ou Épique pour l&apos;instant.</p>
              ) : (
                <>
                  <ul className="chaine-studio-list">
                    {candidats.map((entree) => {
                      const choisiIci = sacrifie.includes(entree.card.id);
                      const nom =
                        CREATOR_BY_SLUG.get(entree.card.creatorSlug)?.displayName ??
                        entree.card.creatorSlug;
                      return (
                        <li key={entree.card.id}>
                          <button
                            type="button"
                            className={`chaine-studio-item${choisiIci ? " choisi" : ""}`}
                            disabled={busy}
                            aria-pressed={choisiIci}
                            onClick={() => {
                              setConfirmeSacrifice(false);
                              setSacrifie((actuel) =>
                                actuel.includes(entree.card.id)
                                  ? actuel.filter((id) => id !== entree.card.id)
                                  : [...actuel, entree.card.id],
                              );
                            }}
                          >
                            <span className="chaine-studio-head">
                              <strong>{nom}</strong>
                              <span>+{entree.value}</span>
                            </span>
                            <span className="chaine-studio-note">
                              {RARITY_META[entree.card.rarity].label}
                              {entree.card.variant === "standard" ? "" : ` · ${entree.card.variant}`} ·{" "}
                              {entree.copies} exemplaires
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="chaine-note">
                    Sélection {valeurSacrifice} / {count.format(prochain.price)} point
                    {prochain.price > 1 ? "s" : ""} de sacrifice
                  </p>
                  {confirmeSacrifice ? (
                    <div className="chaine-studio-confirme">
                      <p>
                        <strong>
                          {choixStudio.length} carte{choixStudio.length > 1 ? "s" : ""}
                        </strong>{" "}
                        {choixStudio.length > 1 ? "quittent" : "quitte"} ton classeur{" "}
                        <strong>définitivement</strong> — et « {prochain.label} » s&apos;installe.
                      </p>
                      <div className="chaine-studio-boutons">
                        <button
                          type="button"
                          className="chaine-setup-buy"
                          disabled={busy}
                          onClick={() => void sacrifier()}
                        >
                          Oui, sacrifier
                        </button>
                        <button
                          type="button"
                          className="chaine-studio-annuler"
                          disabled={busy}
                          onClick={() => setConfirmeSacrifice(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="chaine-setup-buy"
                      disabled={busy || valeurSacrifice !== prochain.price}
                      onClick={() => setConfirmeSacrifice(true)}
                    >
                      Sacrifier {choixStudio.length} doublon{choixStudio.length > 1 ? "s" : ""} pour «{" "}
                      {prochain.label} »
                    </button>
                  )}
                </>
              )}
            </div>
          ) : null}

          <p className="chaine-note">
            {prochain
              ? prochain.currency === "doublons"
                ? `Suivant : ${prochain.label} · ${count.format(prochain.price)} point${prochain.price > 1 ? "s" : ""} de sacrifice`
                : `Suivant : ${prochain.label} · ${count.format(prochain.price)} points`
              : "Setup complet · +100 % de croissance"}
          </p>
        </section>

        {/* Le classeur d'invités : il ne s'ouvre que sur un socle, et il ne
            propose que des créateurs **en direct** — un invité hors ligne
            n'amène rien. Deux créateurs différents, une carte par créateur. */}
        {placeOuverte === null ? null : (
          <section className="chaine-bureau">
            <div className="chaine-bureau-pick">
              <div className="chaine-bureau-pick-head">
                <strong>Place {placeOuverte}</strong>
                <button
                  type="button"
                  onClick={() => {
                    playMenuClose();
                    setPlaceOuverte(null);
                    setRecherche("");
                  }}
                >
                  <X size={14} /> Fermer
                </button>
              </div>
              <div className="chaine-chips">
                <span className="chaine-chip violet">
                  <Radio size={11} /> En direct maintenant
                </span>
                <span className="chaine-chip">Un créateur par carte</span>
                <span className="chaine-chip">{GUEST_LIVE_WINDOW_MINUTES} min de fraîcheur</span>
              </div>
              <input
                className="chaine-bureau-search"
                type="search"
                value={recherche}
                placeholder="Chercher un créateur en direct…"
                aria-label="Chercher un créateur en direct"
                onChange={(event) => setRecherche(event.target.value)}
              />
              {choixInvites.length > 0 ? (
                <ul className="chaine-bureau-choix">
                  {choixInvites.map((carte) => (
                    <li key={carte.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void poserInvite(placeOuverte, carte.id)}
                      >
                        <strong>{carte.label}</strong>
                        <span>
                          {RARITY_META[carte.rarity].label} · relevé +
                          {count.format(Math.floor((croissance * carte.permille) / 1000))} · plateau +
                          {(collabVideoPermille(carte.rarity) / 10).toFixed(0)} %
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="chaine-bureau-empty">
                  Aucun créateur de ta collection n&apos;est en direct maintenant.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Les règles du soir, en une ligne : la journée de jeu, le plafond de
            l'absence. Le reste (les taux, le tirage) vit au serveur et sur
            l'écran des taux — pas de notice ici. */}
        <div className="chaine-chips">
          <span className="chaine-chip">Journées de jeu · 6 h UTC</span>
          <span className="chaine-chip">Absence comptée {STREAMER.growth.capDays} jours au plus</span>
        </div>
        </>
      )}
    </div>
  );
}
