"use client";

/**
 * La scène 16:9 : ce que voit le public quand le streamer ouvre un booster.
 *
 * Trois partis pris.
 *
 * **1. Le cadre est imposé par la page, pas par le jeu.** L'écran est un
 * rectangle noir plein cadre, et la scène vit *dans* un 16:9 centré
 * (`aspect-ratio`). Collé en source navigateur dans OBS, ça remplit la scène
 * sans bandes noires ni recadrage, et sur un simple écran de bureau ça ressemble
 * à une fenêtre de jeu.
 *
 * **2. Aucun raccourci.** Pas de bouton « ×5 » : devant un public, les cinq
 * cartes se montrent une par une, la cinquième résiste, et le Perfect verrouille
 * l'écran. C'est tout l'intérêt de faire l'ouverture en direct plutôt que dans
 * son coin (`RevealOverlay` reçoit `overlay`).
 *
 * **3. Le clavier remplace le doigt.** Un streamer ne touche pas sa souris
 * pendant une ouverture : **Espace** ouvre un Live Drop, **Entrée** révèle la
 * carte suivante. Le reste (état des boosters, Paquet Scène du jour) s'affiche
 * en petit sous les boutons, pour ne pas occuper la scène.
 *
 * Le tirage suit exactement les mêmes règles que le jeu : serveur quand un
 * compte est connecté, moteur local sinon — jamais un mélange des deux.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Hourglass, Layers3, LoaderCircle, Zap } from "lucide-react";
import { RevealOverlay } from "@/components/reveal-overlay";
import { usePackOpening, type DrawSource } from "@/hooks/use-pack-opening";
import { useGame, useNow } from "@/hooks/use-game";
import { getGameView, type DrawnCard } from "@/lib/game-engine";
import { playPackOpening } from "@/lib/sfx";

/** Le petit texte sous les boutons : il dit qui décide, sans le décider. */
const DRAW_SOURCE_LABEL: Record<DrawSource, string> = {
  server: "Tirage décidé par le serveur",
  account: "Non connecté — ouvre l'écran Compte dans le jeu",
  local: "Hors ligne : tirage local",
};

export function OverlayStage() {
  const state = useGame();
  const now = useNow(15_000);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [index, setIndex] = useState(0);
  const [kind, setKind] = useState<"live" | "scene">("live");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // La vue dérivée (réserve de boosters, Paquet Scène du jour) : la recharge
  // passive se recalcule à chaque tick, comme dans le jeu.
  const game = useMemo(() => (state ? getGameView(state, now) : null), [state, now]);
  // Le même module que le jeu : une seule règle « serveur ou appareil ».
  const { openLivePack, openScenePack, drawSource } = usePackOpening(game);
  const sceneOpened = game?.scene.opened ?? false;
  const packs = game?.player.packs ?? 0;

  const openLive = useCallback(async () => {
    if (!game || busy || cards.length) return;
    setBusy(true);
    setProblem(null);
    try {
      // Qui tire — le serveur ou l'appareil — se décide dans `usePackOpening`,
      // le même module que le jeu : l'overlay n'a plus sa propre règle.
      const result = await openLivePack();
      if (result.status === "refused") {
        setProblem(result.message);
        return;
      }
      playPackOpening();
      setKind("live");
      setCards(result.cards);
      setIndex(0);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Ouverture impossible.");
    } finally {
      setBusy(false);
    }
  }, [busy, cards.length, game, openLivePack]);

  const openScene = useCallback(async () => {
    const family = game?.scene.family;
    if (!game || !family || busy || cards.length || game.scene.opened) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await openScenePack();
      if (result.status === "refused") {
        setProblem(result.message);
        return;
      }
      playPackOpening();
      setKind("scene");
      setCards(result.cards);
      setIndex(0);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Ouverture impossible.");
    } finally {
      setBusy(false);
    }
  }, [busy, cards.length, game, openScenePack]);

  const close = useCallback(() => {
    setCards([]);
    setIndex(0);
  }, []);

  // Le clavier : Espace ouvre un Live Drop, Entrée révèle (ou range).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (cards.length) setIndex((value) => Math.min(value + 1, cards.length - 1));
        else void openLive();
        return;
      }
      if (event.key === "Enter") {
        if (!cards.length) return;
        if (index >= cards.length - 1) close();
        else setIndex((value) => value + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length, close, index, openLive]);

  if (!game) {
    return (
      <div className="overlay-root">
        <div className="overlay-frame" />
      </div>
    );
  }

  return (
    <div className="overlay-root">
      <div className="overlay-frame">
        {cards.length ? (
          <RevealOverlay
            key={cards[0]?.id ?? "reveal"}
            cards={cards}
            index={index}
            kind={kind}
            overlay
            onNext={() => setIndex((value) => Math.min(value + 1, cards.length - 1))}
            onClose={close}
          />
        ) : (
          <div className="overlay-idle">
            <p className="overlay-kicker">CreatorDeck · overlay</p>
            <h1>Ouvre un booster en direct</h1>
            <div className="overlay-actions">
              <button type="button" onClick={() => void openLive()} disabled={busy || packs === 0}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <Zap size={17} />}
                <span>{packs > 0 ? `Ouvrir un Live Drop (${packs})` : "Plus de booster"}</span>
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => void openScene()}
                disabled={busy || sceneOpened}
              >
                {sceneOpened ? <Hourglass size={17} /> : <Layers3 size={17} />}
                <span>{sceneOpened ? "Paquet Scène déjà ouvert" : "Paquet Scène du jour"}</span>
              </button>
            </div>
            <p className="overlay-hint">
              Espace ouvre · Entrée révèle. Aucun raccourci ici : les cinq cartes se montrent.
            </p>
            {problem ? <p className="overlay-problem">{problem}</p> : null}
            <p className="overlay-meta">{DRAW_SOURCE_LABEL[drawSource]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
