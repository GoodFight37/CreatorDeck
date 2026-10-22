"use client";

/**
 * « Mes chaînes » — le premier écran est le booster, pas un formulaire.
 *
 * Le bouton du premier booster est actif tout de suite, avec zéro nom (0058).
 * Ajouter des chaînes est proposé, jamais exigé : chaque chaîne est choisie
 * par le joueur, en tapant un visage suggéré ou un nom. Rien ne complète la
 * liste à sa place, et aucun compteur ne lui demande d'en inventer.
 *
 * Le même écran sert à modifier la liste plus tard (`mode="edit"`).
 */
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Plus, Star, X } from "lucide-react";

import "./circle-onboarding.css";
import { CREATOR_BY_SLUG, CREATORS, creatorImage } from "@/lib/catalog";
import { ChannelInitials } from "@/components/circle-strip";
import {
  CIRCLE_MAX,
  buildCreatorIndex,
  customLogin,
  isValidCircle,
  popularCreators,
  resolveCircleInput,
  searchCreators,
} from "@/lib/circle";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";

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
  const dialogRef = usePresentationFocus(true, undefined, onCancel);
  const [slugs, setSlugs] = useState<string[]>(() => [...initial]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const full = slugs.length >= CIRCLE_MAX;
  // Sans frappe : quelques visages proposés, un appui = un choix du joueur.
  const suggestions = full ? [] : draft.trim() ? searchCreators(draft, INDEX, slugs) : popularCreators(INDEX, slugs, 6);
  // Une chaîne hors catalogue est acceptée sans carte (0060) : elle ne sert qu'au direct.
  const ready = isValidCircle(slugs) && slugs.every((slug) => CREATOR_BY_SLUG.has(slug) || customLogin(slug) !== null);

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
    let notice: string | null = null;
    if (result.unknown.length) {
      notice = `Ce nom de chaîne Twitch n’est pas valide : « ${result.unknown[0]} ».`;
    } else if (result.overflow) {
      notice = `${CIRCLE_MAX} chaînes au maximum.`;
    } else if (result.custom.length) {
      notice = `@${customLogin(result.custom[0])} ajoutée sans carte : tu verras quand elle est en direct.`;
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

  const actions = (
    <div className="welcome-actions circle-actions">
      {onCancel ? (
        <button type="button" className="welcome-secondary" onClick={onCancel} disabled={busy}>Annuler</button>
      ) : null}
      <button type="button" className="welcome-primary" disabled={!ready || busy} onClick={() => onConfirm(slugs)}>
        {mode === "edit" ? "Enregistrer" : "Voir mon premier booster"}
      </button>
    </div>
  );

  return (
    <div className="welcome-overlay circle-overlay" role="dialog" tabIndex={-1} ref={dialogRef} aria-modal="true" aria-label="Mes chaînes">
      <section className="welcome-card circle-card">
        <span className="welcome-eyebrow">MES CHAÎNES</span>
        {mode === "edit" ? (
          <>
            <h1>Quelles chaînes regardes-tu déjà ?</h1>
            <p className="circle-lead">Facultatif, jusqu’à {CIRCLE_MAX}. Ton accueil et ton Binder se recentrent sur eux.</p>
          </>
        ) : (
          <>
            <h1>Ton premier booster t’attend</h1>
            <p className="circle-lead">Ouvre-le tout de suite. Si tu veux, ajoute des chaînes que tu regardes déjà : tes boosters les mettront en avant.</p>
            {actions}
          </>
        )}

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
            disabled={full}
          />
          <button type="submit" disabled={!draft.trim() || full}>
            <Plus size={16} aria-hidden="true" /> Ajouter
          </button>
        </form>

        {suggestions.length ? (
          <ul className="circle-suggestions" aria-label="Suggestions">
            {suggestions.map((creator) => {
              const entry = CREATOR_BY_SLUG.get(creator.slug);
              return (
                <li key={creator.slug}>
                  <button type="button" onClick={() => add([...slugs, creator.slug])} aria-label={`Ajouter ${creator.displayName}`}>
                    {entry ? <Image src={creatorImage(entry)} alt="" width={28} height={28} draggable={false} /> : null}
                    <strong>{creator.displayName}</strong>
                    <span>@{creator.login}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {message ? <p className="circle-notice" role="status">{message}</p> : null}

        {slugs.length ? (
          <ol className="circle-list" aria-label="Tes chaînes, de la plus précieuse à la plus courante">
            {slugs.map((slug, position) => {
              const creator = CREATOR_BY_SLUG.get(slug);
              const login = creator ? null : customLogin(slug);
              if (!creator && !login) return null;
              const name = creator?.displayName ?? login!;
              return (
                <li key={slug} className="circle-chip" data-first={position === 0} data-custom={!creator || undefined}>
                  <span className="circle-chip-rank">{position + 1}</span>
                  {creator
                    ? <Image src={creatorImage(creator)} alt="" width={32} height={32} draggable={false} />
                    : <ChannelInitials name={name} size={32} />}
                  <span className="circle-chip-name">
                    {name}
                    {creator ? null : <small className="circle-chip-nocard">sans carte</small>}
                  </span>
                  {position > 0 ? (
                    <button type="button" className="circle-chip-star" onClick={() => promote(slug)}
                      aria-label={`Mettre ${name} en première position`}>
                      <Star size={15} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="circle-chip-fav"><Star size={15} aria-hidden="true" /> préférée</span>
                  )}
                  <button type="button" className="circle-chip-remove" onClick={() => remove(slug)}
                    aria-label={`Retirer ${name}`}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}

        {slugs.length ? (
          <p className="circle-count" aria-live="polite">
            {slugs.length} / {CIRCLE_MAX} · la première est la plus précieuse : touche ★ pour en changer
          </p>
        ) : null}

        {mode === "edit" ? actions : null}
      </section>
    </div>
  );
}
