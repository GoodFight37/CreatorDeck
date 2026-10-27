"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import briefs from "@/data/audio-briefs.json";
import type { Rarity } from "@/lib/catalog";
import {
  MUSIC_TRACKS,
  SAMPLES,
  getMusicTrackId,
  getMusicVolume,
  getSfxVolume,
  isMusicMuted,
  isMuted,
  playBang,
  playGavel,
  playGrace,
  playLegendaryStinger,
  playPackOpening,
  playPerfectStinger,
  playRefuse,
  playReveal,
  playReward,
  playSample,
  playTear,
  previewMusic,
  previewSfx,
  setMusicMuted,
  setMusicScene,
  setMusicVolume,
  setMuted,
  setSfxVolume,
  startGameAudio,
  stopHubMusic,
  stopPreviewMusic,
  type SampleName,
} from "@/lib/sfx";
import "./audio-lab.css";

/**
 * Laboratoire audio — développement uniquement.
 *
 * Compare les bandes-son et les variantes de bruitages PAR les bus du jeu
 * (mêmes gains, mêmes préférences de volume), dans les vraies animations
 * (déchirure, ouverture, révélations par rareté, Tribunal). Les sélections
 * sont conservées localement ; rien n'est appliqué au jeu tant qu'un humain
 * n'a pas validé et intégré les fichiers. La page est retirée de l'export
 * de production par scripts/prune-prototypes.mjs.
 */

const STORAGE_KEY = "creatordeck.audio-lab.v1";

type ChoixLabo = {
  direction: string;
  variantes: Record<string, string>;
};

const CHOIX_DEFAUT: ChoixLabo = { direction: "", variantes: {} };

function candidatMusique(directionId: string, variante: number): string {
  return `/music/candidates/${directionId}-v${variante}.mp3`;
}

function candidatEffet(nom: string, variante: number): string {
  return `/sfx/${nom}${variante > 1 ? "-alt" : ""}.wav`;
}

const RARETES: { id: Rarity; label: string }[] = [
  { id: "common", label: "Commune" },
  { id: "uncommon", label: "Peu commune" },
  { id: "rare", label: "Rare" },
  { id: "epic", label: "Épique" },
  { id: "legendary", label: "Légendaire" },
];

function choixInitial(): ChoixLabo {
  if (typeof window === "undefined") return CHOIX_DEFAUT;
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    return brut ? { ...CHOIX_DEFAUT, ...(JSON.parse(brut) as ChoixLabo) } : CHOIX_DEFAUT;
  } catch {
    // Choix illisibles : on repart des défauts, sans bloquer l'écoute.
    return CHOIX_DEFAUT;
  }
}

export function AudioLab() {
  // Les préférences du moteur sont la source de vérité des volumes.
  const [volumeMusique, setVolumeMusique] = useState(() => getMusicVolume());
  const [volumeEffets, setVolumeEffets] = useState(() => getSfxVolume());
  const [muet, setMuet] = useState(() => isMuted());
  const [musiqueMuet, setMusiqueMuet] = useState(() => isMusicMuted());
  const [lecture, setLecture] = useState<string | null>(null);
  const [disponibles, setDisponibles] = useState<Record<string, boolean>>({});
  const [choix, setChoix] = useState<ChoixLabo>(choixInitial);
  const [pisteJeu] = useState(() => getMusicTrackId());

  const fichiersCandidats = useMemo(() => {
    const liste: string[] = [];
    for (const direction of briefs.musique.directions) {
      for (let v = 1; v <= direction.variantes; v += 1) liste.push(candidatMusique(direction.id, v));
    }
    for (const son of briefs.effets.sons) {
      for (let v = 1; v <= son.variantes; v += 1) liste.push(candidatEffet(son.nom, v));
    }
    return liste;
  }, []);

  // Quels candidats existent déjà sur le disque ? (HEAD, aucun téléchargement.)
  useEffect(() => {
    let annule = false;
    void (async () => {
      const resultats: Record<string, boolean> = {};
      await Promise.all(
        fichiersCandidats.map(async (src) => {
          try {
            const reponse = await fetch(src, { method: "HEAD" });
            resultats[src] = reponse.ok;
          } catch {
            resultats[src] = false;
          }
        }),
      );
      if (!annule) setDisponibles(resultats);
    })();
    return () => {
      annule = true;
    };
  }, [fichiersCandidats]);

  useEffect(() => () => stopPreviewMusic(), []);

  const enregistrerChoix = useCallback((suivant: ChoixLabo) => {
    setChoix(suivant);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(suivant));
    } catch {
      // Les choix ne survivront pas au rechargement, l'écoute continue.
    }
  }, []);

  const basculerLecture = useCallback(async (src: string) => {
    if (lecture === src) {
      stopPreviewMusic();
      setLecture(null);
      return;
    }
    const demarre = await previewMusic(src);
    setLecture(demarre ? src : null);
  }, [lecture]);

  const jouerEffet = useCallback(async (src: string, nom: string) => {
    const original = (Object.keys(SAMPLES) as SampleName[]).find((cle) => cle === nom);
    if (original && src === "original") {
      playSample(original);
      return;
    }
    await previewSfx(src);
  }, []);

  const pourcentage = (valeur: number) => `${Math.round(valeur * 100)} %`;

  return (
    <main className="al-page">
      <header className="al-entete">
        <p className="al-badge">Développement uniquement — jamais exposé aux joueurs</p>
        <h1>Laboratoire audio</h1>
        <p>
          Compare les bandes-son et les bruitages <strong>par les bus du jeu</strong> : mêmes gains de
          scène, mêmes préférences de volume. Les sélections sont conservées sur cet appareil. Rien
          n&apos;est appliqué au jeu sans validation humaine et intégration des fichiers.
        </p>
      </header>

      <section className="al-carte" aria-labelledby="al-volumes">
        <h2 id="al-volumes">Volumes (préférences du moteur)</h2>
        <label className="al-volume">
          <span>Musique — {pourcentage(volumeMusique)}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={volumeMusique}
            onChange={(event) => {
              const valeur = Number(event.target.value);
              setVolumeMusique(valeur);
              setMusicVolume(valeur);
            }}
          />
        </label>
        <label className="al-volume">
          <span>Effets — {pourcentage(volumeEffets)}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={volumeEffets}
            onChange={(event) => {
              const valeur = Number(event.target.value);
              setVolumeEffets(valeur);
              setSfxVolume(valeur);
            }}
          />
        </label>
        <div className="al-rangee">
          <button type="button" onClick={() => { const v = !muet; setMuet(v); setMuted(v); }}>
            Effets : {muet ? "coupés" : "actifs"}
          </button>
          <button type="button" onClick={() => { const v = !musiqueMuet; setMusiqueMuet(v); setMusicMuted(v); }}>
            Musique : {musiqueMuet ? "coupée" : "active"}
          </button>
        </div>
        <p className="al-note">
          100 % = l&apos;équilibre actuel du jeu (musique de hub à {Math.round(0.08 * 100)} % du plein
          niveau, déjà très basse). Ces curseurs écrivent les préférences du moteur, pas un réglage
          propre au laboratoire.
        </p>
      </section>

      <section className="al-carte" aria-labelledby="al-musique">
        <h2 id="al-musique">Bandes-son</h2>
        <article className="al-piste">
          <div>
            <h3>{MUSIC_TRACKS[0].label}</h3>
            <p>La piste en place dans le jeu aujourd&apos;hui (piste appliquée : {pisteJeu}).</p>
          </div>
          <div className="al-rangee">
            <button type="button" onClick={() => void basculerLecture(MUSIC_TRACKS[0].src)}>
              {lecture === MUSIC_TRACKS[0].src ? "Arrêter" : "Écouter"}
            </button>
            <label className="al-choix">
              <input
                type="radio"
                name="direction"
                checked={choix.direction === "actuelle"}
                onChange={() => enregistrerChoix({ ...choix, direction: "actuelle" })}
              />
              Choisir
            </label>
          </div>
        </article>

        {briefs.musique.directions.map((direction) => (
          <article className="al-piste" key={direction.id}>
            <div>
              <h3>{direction.label}</h3>
              <p>{direction.description}</p>
              <p className="al-brief">{direction.prompt}</p>
            </div>
            <div className="al-rangee">
              {Array.from({ length: direction.variantes }, (_, index) => index + 1).map((variante) => {
                const src = candidatMusique(direction.id, variante);
                const present = disponibles[src] === true;
                return (
                  <span key={src} className="al-rangee">
                    <button type="button" disabled={!present} onClick={() => void basculerLecture(src)}>
                      {lecture === src ? "Arrêter" : `Écouter v${variante}`}
                    </button>
                    {!present ? <em>à générer</em> : null}
                  </span>
                );
              })}
              <label className="al-choix">
                <input
                  type="radio"
                  name="direction"
                  checked={choix.direction === direction.id}
                  onChange={() => enregistrerChoix({ ...choix, direction: direction.id })}
                />
                Choisir
              </label>
            </div>
          </article>
        ))}

        <article className="al-piste">
          <div>
            <h3>Sans musique</h3>
            <p>Uniquement les bruitages. C&apos;est le réglage « Musique coupée » du jeu, promu en choix de direction à part entière.</p>
          </div>
          <div className="al-rangee">
            <button type="button" onClick={() => { stopPreviewMusic(); setLecture(null); stopHubMusic(); }}>
              Tout couper
            </button>
            <label className="al-choix">
              <input
                type="radio"
                name="direction"
                checked={choix.direction === "silence"}
                onChange={() => enregistrerChoix({ ...choix, direction: "silence" })}
              />
              Choisir
            </label>
          </div>
        </article>
        <p className="al-note">
          Les fichiers candidats vivent dans <code>public/music/candidates/</code> (générés par{" "}
          <code>node scripts/elevenlabs-generate.mjs</code> après validation du budget). L&apos;aperçu
          joue une boucle simple : la couture de boucle du jeu sera retravaillée à l&apos;intégration,
          comme pour la piste actuelle.
        </p>
      </section>

      <section className="al-carte" aria-labelledby="al-effets">
        <h2 id="al-effets">Bruitages — originaux et variantes</h2>
        {briefs.effets.sons.map((son) => {
          const aOriginal = (Object.keys(SAMPLES) as string[]).includes(son.nom);
          const selection = choix.variantes[son.nom] ?? "original";
          return (
            <article className="al-piste" key={son.nom}>
              <div>
                <h3>{son.label}</h3>
                <p className="al-brief">{son.prompt}</p>
              </div>
              <div className="al-rangee">
                {aOriginal ? (
                  <span className="al-rangee">
                    <button type="button" onClick={() => void jouerEffet("original", son.nom)}>
                      Original
                    </button>
                    <label className="al-choix">
                      <input
                        type="radio"
                        name={`variante-${son.nom}`}
                        checked={selection === "original"}
                        onChange={() => enregistrerChoix({ ...choix, variantes: { ...choix.variantes, [son.nom]: "original" } })}
                      />
                      Choisir
                    </label>
                  </span>
                ) : (
                  <em>nouveau son, pas d&apos;original</em>
                )}
                {Array.from({ length: son.variantes }, (_, index) => index + 1).map((variante) => {
                  const src = candidatEffet(son.nom, variante);
                  const present = disponibles[src] === true;
                  return (
                    <span key={src} className="al-rangee">
                      <button type="button" disabled={!present} onClick={() => void jouerEffet(src, son.nom)}>
                        v{variante}
                      </button>
                      {!present ? <em>à générer</em> : null}
                      <label className="al-choix">
                        <input
                          type="radio"
                          name={`variante-${son.nom}`}
                          checked={selection === `v${variante}`}
                          onChange={() => enregistrerChoix({ ...choix, variantes: { ...choix.variantes, [son.nom]: `v${variante}` } })}
                        />
                        Choisir
                      </label>
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
        <p className="al-note">
          Important : les sons de <strong>déplacement restent muets</strong> (règle joueur du
          8 octobre 2026). Les variantes « click », « menu-open », « select », « card-turn » ne servent
          qu&apos;à juger la matière sonore — elles ne rouvrent pas cette décision.
        </p>
      </section>

      <section className="al-carte" aria-labelledby="al-jeu">
        <h2 id="al-jeu">Dans le jeu (vraies animations sonores)</h2>
        <h3>Ouverture de booster</h3>
        <div className="al-rangee">
          <button type="button" onClick={() => playTear()}>Déchirure</button>
          <button type="button" onClick={() => playPackOpening()}>Ouverture du pack</button>
          <button type="button" onClick={() => playReward()}>Récompense</button>
          <button type="button" onClick={() => playRefuse()}>Refus doux</button>
        </div>
        <h3>Révélations par rareté</h3>
        <div className="al-rangee">
          {RARETES.map((rarete) => (
            <span key={rarete.id} className="al-rangee">
              <button type="button" onClick={() => playReveal(rarete.id)}>{rarete.label}</button>
              <button type="button" onClick={() => playBang(rarete.id)}>Impact {rarete.label.toLowerCase()}</button>
            </span>
          ))}
          <button type="button" onClick={() => playLegendaryStinger()}>Stinger légendaire</button>
          <button type="button" onClick={() => playPerfectStinger()}>Stinger parfait</button>
        </div>
        <h3>Tribunal</h3>
        <div className="al-rangee">
          <button type="button" onClick={() => playGrace()}>Grâce</button>
          <button type="button" onClick={() => playGavel()}>Marteau</button>
        </div>
        <h3>Scènes musicales du jeu</h3>
        <div className="al-rangee">
          <button type="button" onClick={() => startGameAudio("hub")}>Lancer la BGM (hub)</button>
          <button type="button" onClick={() => setMusicScene("pack")}>Scène pack (plus basse)</button>
          <button type="button" onClick={() => setMusicScene("tribunal")}>Scène Tribunal (coupée)</button>
          <button type="button" onClick={() => setMusicScene("hub")}>Scène hub</button>
          <button type="button" onClick={() => stopHubMusic()}>Arrêter la BGM</button>
        </div>
        <p className="al-note">
          Ces boutons appellent les fonctions exactes des écrans du jeu : c&apos;est le chemin
          d&apos;intégration à retester après promotion des fichiers choisis.
        </p>
      </section>
    </main>
  );
}
