"use client";

/**
 * « Mes chaînes » — la seule question posée avant le premier booster.
 *
 * Elle remplace le tutoriel en trois étapes (« Ouvre un booster », « Construis
 * ton Binder », « Reviens au Drop ») : un joueur ne lit pas trois écrans pour
 * apprendre ce que fait un bouton, il répond à une question qui le concerne.
 * Ce qu'il écrit ici devient le contenu de son premier booster.
 *
 * Le même écran sert à modifier la liste plus tard (`mode="edit"`).
 */
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Plus, Star, X } from "lucide-react";

import "./circle-onboarding.css";
import { CREATOR_BY_SLUG, CREATORS, creatorImage } from "@/lib/catalog";
import {
  CIRCLE_MAX,
  CIRCLE_MIN,
  buildCreatorIndex,
  completeWithPopular,
  resolveCircleInput,
  searchCreators,
} from "@/lib/circle";

// Construit une fois à l'import : mille entrées, quelques millisecondes.
const INDEX = buildCreatorIndex(CREATORS);

export function CircleOnboarding({
  initial = [],
  mode = "first",
  busy = false,
  onConfirm,
  onCancel,
}: {
  initial?: readonly string[];
  mode?: "first" | "edit";
  busy?: boolean;
  onConfirm: (slugs: string[]) => void;
  onCancel?: () => void;
}) {
  const [slugs, setSlugs] = useState<string[]>(() => [...initial]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const suggestions = searchCreators(draft, INDEX, slugs);
  const missing = Math.max(0, CIRCLE_MIN - slugs.length);
  const ready = missing === 0 && slugs.length <= CIRCLE_MAX;

  function add(next: string[], notice: string | null = null) {
    setSlugs(next);
    setDraft("");
    setMessage(notice);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const result = resolveCircleInput(text, INDEX, slugs);
    // Une frappe incomplète (« kam ») ajoute la première suggestion plutôt que
    // de répondre « inconnu » : sur un téléphone, personne n'écrit un login entier.
    if (result.slugs.length === slugs.length && result.unknown.length && suggestions.length) {
      add([...slugs, suggestions[0].slug]);
      return;
    }
    let notice: string | null = null;
    if (result.unknown.length) {
      notice = `« ${result.unknown[0]} » n’est pas dans le jeu${result.unknown.length > 1 ? ` (et ${result.unknown.length - 1} autre${result.unknown.length > 2 ? "s" : ""})` : ""}.`;
    } else if (result.overflow) {
      notice = `${CIRCLE_MAX} chaînes au maximum.`;
    }
    add(result.slugs, notice);
  }

  function remove(slug: string) {
    setSlugs((list) => list.filter((item) => item !== slug));
    setMessage(null);
  }

  function promote(slug: string) {
    setSlugs((list) => [slug, ...list.filter((item) => item !== slug)]);
    setMessage(null);
  }

  return (
    <div className="welcome-overlay circle-overlay" role="dialog" aria-modal="true" aria-label="Mes chaînes">
      <section className="welcome-card circle-card">
        <span className="welcome-eyebrow">MES CHAÎNES</span>
        <h1>Quelles chaînes regardes-tu déjà ?</h1>
        <p className="circle-lead">
          Cite entre {CIRCLE_MIN} et {CIRCLE_MAX} streameurs. {mode === "edit"
            ? "Ton accueil et ton Binder se recentrent sur eux."
            : "Ton premier booster ne contient qu’eux."}
        </p>

        <form className="circle-form" onSubmit={submit}>
          <input
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setMessage(null); }}
            placeholder="Un nom de chaîne"
            aria-label="Nom d’une chaîne"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            disabled={slugs.length >= CIRCLE_MAX}
          />
          <button type="submit" disabled={!draft.trim() || slugs.length >= CIRCLE_MAX}>
            <Plus size={16} aria-hidden="true" /> Ajouter
          </button>
        </form>

        {suggestions.length ? (
          <ul className="circle-suggestions" aria-label="Suggestions">
            {suggestions.map((creator) => (
              <li key={creator.slug}>
                <button type="button" onClick={() => add([...slugs, creator.slug])}>
                  <strong>{creator.displayName}</strong>
                  <span>@{creator.login}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {message ? <p className="circle-notice" role="status">{message}</p> : null}

        {slugs.length ? (
          <ol className="circle-list" aria-label="Tes chaînes, de la plus précieuse à la plus courante">
            {slugs.map((slug, position) => {
              const creator = CREATOR_BY_SLUG.get(slug);
              if (!creator) return null;
              return (
                <li key={slug} className="circle-chip" data-first={position === 0}>
                  <span className="circle-chip-rank">{position + 1}</span>
                  <Image src={creatorImage(creator)} alt="" width={32} height={32} draggable={false} />
                  <span className="circle-chip-name">{creator.displayName}</span>
                  {position > 0 ? (
                    <button type="button" className="circle-chip-star" onClick={() => promote(slug)}
                      aria-label={`Mettre ${creator.displayName} en première position`}>
                      <Star size={15} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="circle-chip-fav"><Star size={15} aria-hidden="true" /> préférée</span>
                  )}
                  <button type="button" className="circle-chip-remove" onClick={() => remove(slug)}
                    aria-label={`Retirer ${creator.displayName}`}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}

        <p className="circle-count" aria-live="polite">
          {slugs.length} / {CIRCLE_MAX}
          {missing > 0
            ? ` · encore ${missing} pour ${mode === "edit" ? "enregistrer" : "ouvrir ton premier booster"}`
            : " · la première est la plus précieuse : touche ★ pour en changer"}
        </p>

        {missing > 0 ? (
          <button type="button" className="circle-popular" onClick={() => add(completeWithPopular(slugs, INDEX))}>
            Pas d’idée ? Compléter avec les chaînes les plus suivies
          </button>
        ) : null}

        <div className="welcome-actions circle-actions">
          {onCancel ? (
            <button type="button" className="welcome-secondary" onClick={onCancel} disabled={busy}>Annuler</button>
          ) : null}
          <button type="button" className="welcome-primary" disabled={!ready || busy} onClick={() => onConfirm(slugs)}>
            {mode === "edit" ? "Enregistrer" : "Voir mon premier booster"}
          </button>
        </div>
      </section>
    </div>
  );
}
