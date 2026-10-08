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
  X,
} from "lucide-react";

import { useCloud } from "@/hooks/use-cloud";
import { useGame, useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { StreamerOpening } from "@/lib/cloud/store/streamer";
import { gameDay } from "@/lib/progression";
import {
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
  nextSetupLevel,
  setupBonusPermille,
  tierProgress,
  tokensOnDay,
} from "@/lib/streamer";
import { TEAR_HAPTIC } from "@/lib/reveal";

import { buzz } from "@/lib/haptics";
import { swipeVerdict, type SwipeSide } from "@/lib/swipe";

const count = new Intl.NumberFormat("fr-FR");

export function StreamerSheet({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const cloud = useCloud();
  const now = useNow(30_000);
  const [opening, setOpening] = useState<StreamerOpening | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  // Le geste de la carte : la course du doigt, et le côté armé (rien tant que le
  // seuil n'est pas franchi). `armedRef` évite de vibrer à chaque pixel.
  const [drag, setDrag] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [armed, setArmed] = useState<SwipeSide | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef<SwipeSide | null>(null);

  // Ouvre la chaîne : le retour du joueur est payé ici, une fois par absence.
  useEffect(() => {
    let vivant = true;
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
  // La carte du jour : celle que le serveur a donnée, sinon celle du moteur
  // local (même journée de jeu des deux côtés). Le **texte** vient toujours du
  // fichier de règles ; le serveur ne connaît que l'identifiant.
  const etatCarte = vue?.event ?? (streamer?.event?.day === jour ? streamer?.event : null);
  const carte = eventById(etatCarte?.event ?? "") ?? eventForDay(jour);
  const coteGauche = eventChoice(carte, "gauche");
  const coteDroite = eventChoice(carte, "droite");
  const coteJoue = etatCarte ? eventChoice(carte, etatCarte.choice) : null;
  const carteJouee = Boolean(etatCarte);

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
              <button type="button" className="chaine-publish" disabled={busy || !choisi} onClick={() => void publier()}>
                {busy ? "Publication…" : "Publier la vidéo du jour"}
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
            vite — pour toujours.
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
                  {suivant ? (
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
          <p className="chaine-next">
            {prochain
              ? `Prochain palier : « ${prochain.label} » à ${count.format(prochain.price)} points.`
              : "Ton setup est complet : la chaîne grandit une fois et demie plus vite qu'à ses débuts."}
          </p>
        </section>

        <p className="odds-intro">
          La chaîne grandit <strong>par journées de jeu</strong> (6 h UTC, la même journée que les missions),
          pendant que tu joues comme pendant ton absence — {STREAMER.growth.capDays} journées comptées au
          plus, et une horloge reculée ne crédite rien.
        </p>
      </div>
    </div>
  );
}
