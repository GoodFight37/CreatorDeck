"use client";

/**
 * L'écran **Ta chaîne** : le simulateur de streameur (`0036_streamer.sql`).
 *
 * Ce que le joueur y trouve, dans l'ordre où il se pose la question : où en est
 * sa chaîne (abonnés, palier, croissance par jour), ce qui s'est passé pendant
 * son absence, la vidéo du jour (un format, un appui), et les jetons que la
 * chaîne a versés aujourd'hui.
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
  Coins,
  Hammer,
  Info,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { useCloud } from "@/hooks/use-cloud";
import { useGame, useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import { sacrificeTally, setupSacrificeCandidates } from "@/lib/game-engine";
import type { StreamerOpening } from "@/lib/cloud/store/streamer";
import { gameDay } from "@/lib/progression";
import {
  GUEST_SLOTS,
  GUEST_LIVE_WINDOW_MINUTES,
  SETUP_LEVELS,
  STREAMER,
  STREAMER_TOKEN_CAP,
  availableFormats,
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

const count = new Intl.NumberFormat("fr-FR");

export function StreamerSheet({ onClose }: { onClose: () => void }) {
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
  // Le bureau : la place qu'on est en train de remplir (1 ou 2, `null` sinon).
  const [placeOuverte, setPlaceOuverte] = useState<number | null>(null);
  const [recherche, setRecherche] = useState("");
  const [armed, setArmed] = useState<SwipeSide | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef<SwipeSide | null>(null);

  // Ouvre la chaîne : le retour du joueur est payé ici, une fois par absence.
  useEffect(() => {
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
  // Ce que le bureau vaudrait **maintenant**, avant de poser le deuxième : le
  // joueur voit ce que sa seconde carte apporterait, sans avoir à la poser.
  const raidPossible = useMemo(
    () => raidForGuests(croissance, guests, direct),
    [croissance, guests, direct],
  );
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
    const issue = await cloudStore.publishStreamerVideo(choisi);
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
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
      setOpening((precedent) =>
        precedent?.status === "done" && nouveau.status === "done"
          ? {
              ...nouveau,
              // L'absence ne se rejoue pas : on garde le résumé du premier
              // relevé et on y ajoute seulement ce que le second apporte.
              days: precedent.days,
              countedDays: precedent.countedDays,
              gained: precedent.gained,
              lines: [...precedent.lines, ...nouveau.lines.slice(precedent.lines.length)],
            }
          : nouveau,
      );
    });
    return () => {
      vivant = false;
    };
  }, [opening, jour, raidPaye, guests, direct]);

  /** Installe le prochain palier de setup (le prix est celui du serveur). */
  async function acheter(id: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.buyStreamerSetup(id);
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    setNotice({ message: issue.message ?? "Palier installé.", isError: false });
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
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    setSacrifie([]);
    setConfirmeSacrifice(false);
    setNotice({ message: issue.message ?? "Sacrifice fait.", isError: false });
  }

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Ta chaîne">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>
            <Radio size={18} /> Ta chaîne
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

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
            <div>
              <strong>Cette version-ci n&apos;a pas de serveur</strong>
              <span>
                Ta chaîne vit alors sur cet appareil, avec les mêmes règles ({STREAMER.tokens.perSuccess}{" "}
                jetons par vidéo réussie, +{STREAMER.tokens.perBuzz} si elle buzz, {STREAMER_TOKEN_CAP} au
                plus par journée). Avec un compte, c&apos;est le serveur qui compte.
              </span>
            </div>
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

        <section className="chaine-state">
          <div className="chaine-numbers">
            <div>
              <strong>{count.format(abonnes)}</strong>
              <span>abonnés</span>
            </div>
            <div>
              <strong>+{count.format(croissance)}</strong>
              <span>par jour</span>
            </div>
            <div>
              <strong>{progression.tier.label}</strong>
              <span>palier</span>
            </div>
          </div>
          <div className="progress-track large">
            <i style={{ width: `${Math.round(progression.ratio * 100)}%` }} />
          </div>
          <p className="chaine-next">
            {progression.next
              ? `Prochain palier : « ${progression.next.label} » à ${count.format(progression.next.at)} abonnés — ${count.format(progression.next.at - abonnes)} à trouver.`
              : "Ta chaîne est au sommet : « Légende du direct »."}
          </p>
        </section>

        {/* L'imprévu du jour : une carte, deux réponses, un tirage serveur. */}
        <section className="chaine-event">
          <h3>{carteJouee ? "L'imprévu du jour est joué" : "L'imprévu du jour"}</h3>
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
              <p className="chaine-intro">
                Glisse la carte d&apos;un côté ou de l&apos;autre — ou appuie sur une réponse. La réussite, le buzz et le
                bad buzz sont tirés par le serveur (ou par l&apos;appareil, sans compte) : l&apos;écran ne choisit que le
                côté.
              </p>
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
                <span className="chaine-card-kind">
                  <Sparkles size={13} /> Imprévu
                </span>
                <strong className="chaine-card-title">{carte.label}</strong>
                <p className="chaine-card-text">{carte.detail}</p>
                <div className="chaine-card-sides">
                  <span className={armed === "gauche" ? "arme" : undefined}>{coteGauche?.label}</span>
                  <span className={armed === "droite" ? "arme" : undefined}>{coteDroite?.label}</span>
                </div>
              </div>
              <div className="chaine-card-buttons">
                <button type="button" disabled={busy} onClick={() => void repondre("gauche")}>
                  {coteGauche?.label}
                  {coteGauche ? <em>{(coteGauche.successChancePermille / 10).toFixed(0)} %</em> : null}
                </button>
                <button type="button" disabled={busy} onClick={() => void repondre("droite")}>
                  {coteDroite?.label}
                  {coteDroite ? <em>{(coteDroite.successChancePermille / 10).toFixed(0)} %</em> : null}
                </button>
              </div>
              <p className="chaine-card-odds">
                {[coteGauche, coteDroite].map((cote, index) =>
                  cote ? (
                    <span key={cote.id}>
                      {index === 0 ? "Gauche" : "Droite"} : ×{(cote.gainPermille / 1000).toFixed(1)} de la croissance
                      {" · "}buzz {(cote.buzzPermille / 10).toFixed(0)} %
                      {cote.badBuzzPermille > 0 ? ` · bad buzz ${(cote.badBuzzPermille / 10).toFixed(0)} %` : ""}
                    </span>
                  ) : null,
                )}
              </p>
            </>
          )}
        </section>

        <section className="chaine-video">
          <h3>{deja ? "La vidéo du jour est publiée" : "La vidéo du jour"}</h3>
          {deja && video ? (
            <p className="chaine-outcome">
              {formatById(video.format)
                ? `${formatById(video.format)!.label} : ${video.gained >= 0 ? "+" : "−"}${count.format(Math.abs(video.gained))} abonnés`
                : "Vidéo publiée"}
              {video.tokens > 0 ? ` · +${video.tokens} jetons` : " · plafond de jetons atteint"}
            </p>
          ) : (
            <>
              <p className="chaine-intro">
                Un format par journée de jeu. La réussite, le buzz et le bad buzz sont tirés par le serveur —
                l&apos;appareil ne choisit que le format.
              </p>
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
                        <span>{(format.successChancePermille / 10).toFixed(1)} % de réussite</span>
                      </span>
                      <span className="chaine-format-detail">{format.detail}</span>
                      <span className="chaine-format-odds">
                        ×{(format.gainPermille / 1000).toFixed(1)} de la croissance · buzz{" "}
                        {(format.buzzPermille / 10).toFixed(0)} %
                        {format.badBuzzPermille ? ` · bad buzz ${(format.badBuzzPermille / 10).toFixed(0)} %` : ""}
                        {format.requiresCreator ? " · demande un créateur" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Le live de vingt secondes : c'est le moment de jeu. Il ne paie
                  rien — la vidéo reste tirée par le serveur — et le bouton
                  « Publier » juste en dessous reste le repli de qui ne veut
                  pas jouer la scène. */}
              <button
                type="button"
                className="chaine-live"
                disabled={busy || !choisi}
                onClick={() => setLiveOuvert(true)}
              >
                <Radio size={15} />
                Lancer le live de {LIVE_SECONDS} s
                <span>chat qui défile et bulles à attraper — puis publie ta vidéo</span>
              </button>
              <button type="button" className="chaine-publish" disabled={busy || !choisi} onClick={() => void publier()}>
                {busy ? "Publication…" : "Publier sans jouer le live"}
                <ChevronRight size={15} />
              </button>
            </>
          )}
          <div className="token-row">
            <Coins size={14} />
            <span>
              <strong>{jetons}</strong> / {STREAMER_TOKEN_CAP} jetons versés aujourd&apos;hui par la chaîne
            </span>
          </div>
        </section>

        {/* Ton setup : des paliers en points, une fois chacun, dans l'ordre. */}
        <section className="chaine-setup">
          <h3>
            <Hammer size={16} /> Ton setup
          </h3>
          <p className="chaine-intro">
            Chaque palier s&apos;installe <strong>une fois</strong>, dans l&apos;ordre, et fait grandir la chaîne plus
            vite — pour toujours. Les cinq premiers se paient en <strong>points</strong> ; les trois derniers en{" "}
            <strong>doublons</strong> de ta collection.
            {bonus > 0
              ? ` Aujourd'hui : +${(bonus / 10).toFixed(0)} % de croissance (${count.format(croissance)} par jour au lieu de ${count.format(growthWithSetup(abonnes, []))}).`
              : ""}
          </p>
          <ul className="chaine-setup-list">
            {SETUP_LEVELS.map((niveau) => {
              const installe = setup.includes(niveau.id);
              const suivant = prochain?.id === niveau.id;
              return (
                <li
                  key={niveau.id}
                  className={`chaine-setup-item${installe ? " installe" : suivant ? " suivant" : ""}`}
                >
                  <span className="chaine-setup-head">
                    <strong>{niveau.label}</strong>
                    <span>
                      {installe ? (
                        <>
                          <Check size={13} /> installé
                        </>
                      ) : niveau.currency === "doublons" ? (
                        `${count.format(niveau.price)} doublon${niveau.price > 1 ? "s" : ""}`
                      ) : (
                        `${count.format(niveau.price)} points`
                      )}
                    </span>
                  </span>
                  <span className="chaine-setup-note">
                    {niveau.note}
                    {niveau.growthPermille
                      ? ` (+${(niveau.growthPermille / 10).toFixed(0)} % de croissance)`
                      : ""}
                  </span>
                  {suivant && niveau.currency === "points" ? (
                    <button
                      type="button"
                      className="chaine-setup-buy"
                      disabled={busy}
                      onClick={() => void acheter(niveau.id)}
                    >
                      Installer pour {count.format(niveau.price)} points
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
              <p className="chaine-intro">
                « {prochain.label} » se paie en <strong>doublons</strong> : {count.format(prochain.price)} point
                {prochain.price > 1 ? "s" : ""} de sacrifice. Un <strong>Rare</strong> vaut{" "}
                {sacrificeValue("rare")}, un <strong>Épique</strong> vaut {sacrificeValue("epic")} — et une{" "}
                <strong>Légendaire ne part jamais</strong>.
              </p>
              {candidats.length === 0 ? (
                <p className="chaine-next">
                  Aucun doublon Rare ou Épique dans ton classeur pour l&apos;instant : le studio attend. Les
                  Communes et les Peu communes ne partent pas, une Légendaire non plus, et jamais la dernière
                  copie d&apos;un créateur.
                </p>
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
                  <p className="chaine-next">
                    Sélection : {valeurSacrifice} / {count.format(prochain.price)} point
                    {prochain.price > 1 ? "s" : ""} de sacrifice.
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

          <p className="chaine-next">
            {prochain
              ? prochain.currency === "doublons"
                ? `Prochain palier : « ${prochain.label} » — ${count.format(prochain.price)} point${prochain.price > 1 ? "s" : ""} de sacrifice (des doublons Rares ou Épiques).`
                : `Prochain palier : « ${prochain.label} » à ${count.format(prochain.price)} points.`
              : "Ton setup est complet : la chaîne grandit deux fois plus vite qu'à ses débuts."}
          </p>
        </section>

        {/* Le bureau : deux invités choisis dans la collection. Ce sont eux,
            et eux seuls, qui amènent un raid — quand leur créateur streame
            vraiment. */}
        <section className="chaine-bureau">
          <h3>
            <Users size={16} /> Le bureau
          </h3>
          <p className="chaine-intro">
            Invite <strong>{GUEST_SLOTS} cartes de ta collection</strong>, de deux créateurs différents. Quand le
            créateur streame vraiment — la même fenêtre de {GUEST_LIVE_WINDOW_MINUTES} minutes que le badge du
            direct — son passage fait grandir la chaîne <strong>une fois par journée de jeu</strong>. Ça ne coûte
            rien, et changer d&apos;invité ne repaie jamais la journée.
          </p>
          <ul className="chaine-bureau-list">
            {Array.from({ length: GUEST_SLOTS }, (_, index) => index + 1).map((place) => {
              const invite = guests.find((guest) => guest.slot === place) ?? null;
              const enDirect = invite ? direct.has(invite.slug) : false;
              const nom = invite
                ? CREATOR_BY_SLUG.get(invite.slug)?.displayName ?? invite.slug
                : `Place ${place} libre`;
              const part = invite ? guestRaidPermille(invite.rarity) : 0;
              return (
                <li
                  key={place}
                  className={`chaine-bureau-item${invite ? " pose" : ""}${enDirect ? " en-direct" : ""}`}
                >
                  <span className="chaine-bureau-head">
                    <strong>{nom}</strong>
                    <span>
                      {invite ? (
                        <>
                          <i style={{ color: RARITY_META[invite.rarity].color }}>
                            {RARITY_META[invite.rarity].label}
                          </i>
                          {" · +" + (part / 10).toFixed(1) + " % de croissance"}
                        </>
                      ) : (
                        "aucune carte invitée"
                      )}
                    </span>
                  </span>
                  {invite ? (
                    <span className="chaine-bureau-live">
                      {enDirect ? (
                        <>
                          <Radio size={13} /> en direct — {count.format(Math.floor((croissance * part) / 1000))} abonnés
                          au relevé
                        </>
                      ) : (
                        "hors ligne : son passage ne rapporterait rien"
                      )}
                    </span>
                  ) : null}
                  <span className="chaine-bureau-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setPlaceOuverte(place);
                        setRecherche("");
                      }}
                    >
                      {invite ? "Changer" : "Choisir un invité"}
                    </button>
                    {invite ? (
                      <button type="button" disabled={busy} onClick={() => void poserInvite(place, null)}>
                        Retirer
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {raidPaye > 0 ? (
            <p className="chaine-bureau-raid">{raidLine({ gained: raidPaye, slugs: raidDu?.slugs ?? [] })}</p>
          ) : raidPossible.gained > 0 ? (
            <p className="chaine-bureau-raid">
              Un invité est en direct : ton relevé ajoute <strong>+{count.format(raidPossible.gained)} abonnés</strong>{" "}
              — une fois pour la journée de jeu.
            </p>
          ) : null}
          {placeOuverte === null ? null : (
            <div className="chaine-bureau-pick">
              <div className="chaine-bureau-pick-head">
                <strong>Place {placeOuverte}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceOuverte(null);
                    setRecherche("");
                  }}
                >
                  <X size={14} /> Fermer
                </button>
              </div>
              <p className="chaine-bureau-pick-hint">
                Seuls les créateurs <strong>en direct maintenant</strong> sont proposés : un invité hors ligne
                n&apos;amène rien, et le bureau ne sert qu&apos;à ça. Une carte par créateur.
              </p>
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
                          {RARITY_META[carte.rarity].label} · +{(carte.permille / 10).toFixed(1)} % de croissance ·{" "}
                          {count.format(Math.floor((croissance * carte.permille) / 1000))} abonnés au relevé
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="chaine-bureau-empty">
                  {recherche.trim()
                    ? `Aucun créateur en direct ne correspond à « ${recherche.trim()} ».`
                    : "Aucun créateur de ta collection n'est en direct à cet instant — reviens quand l'un des tiens streame."}
                </p>
              )}
            </div>
          )}
        </section>

        <p className="odds-intro">
          La chaîne grandit <strong>par journées de jeu</strong> (6 h UTC, la même journée que les missions),
          pendant que tu joues comme pendant ton absence — {STREAMER.growth.capDays} journées comptées au
          plus, et une horloge reculée ne crédite rien.
        </p>
          </>
        )}
      </div>
    </div>
  );
}
