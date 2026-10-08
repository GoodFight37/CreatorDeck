"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Plus, Search, Star, X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useGame } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { MAX_SHOWCASE, knownShowcase, ownedCreatorSlugs, toggleShowcase } from "@/lib/cloud/showcase";
import { CREATOR_BY_SLUG, creatorImage } from "@/lib/catalog";
import { ShowcaseCard } from "@/components/showcase-card";

/** Combien de créateurs la recherche de la vitrine propose d'un coup. */
const PICKER_LIMIT = 60;

/**
 * La vitrine : les cartes épinglées du joueur, celles que les autres voient sur
 * sa fiche publique.
 *
 * Le panneau tient son propre brouillon : on choisit, on cherche, on remplace —
 * et rien ne part au serveur tant que « Enregistrer la vitrine » n'a pas été
 * touché. La feuille de compte n'a donc rien à lui passer.
 */
export function ShowcasePanel() {
  const cloud = useCloud();
  const state = useGame();
  const [showcaseDraft, setShowcaseDraft] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const owned = useMemo(() => ownedCreatorSlugs(state?.cards ?? []), [state]);
  const pinned = knownShowcase(cloud.showcase);
  const selection = showcaseDraft ?? pinned;
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return owned
      .filter((slug) => {
        const creator = CREATOR_BY_SLUG.get(slug);
        if (!creator) return false;
        if (!needle) return true;
        return `${slug} ${creator.displayName} ${creator.login}`.toLocaleLowerCase("fr").includes(needle);
      })
      .slice(0, PICKER_LIMIT);
  }, [owned, query]);
  const showcaseChanged =
    selection.length !== pinned.length || selection.some((slug, index) => slug !== pinned[index]);

  return (
          <section className="account-card">
            <div className="account-head">
              <Star size={15} />
              <strong>Ma vitrine</strong>
              <span className="account-count">{pinned.length}/{MAX_SHOWCASE}</span>
            </div>
            {pinned.length ? (
              <div className="showcase-grid">
                {pinned.map((slug) => <ShowcaseCard key={slug} slug={slug} />)}
              </div>
            ) : (
              <p className="account-hint">Aucune carte épinglée. Choisis-en jusqu&apos;à {MAX_SHOWCASE} parmi les créateurs que tu possèdes.</p>
            )}

            <details className="account-details">
              <summary>{pinned.length ? "Changer ma vitrine" : "Choisir mes cartes"}</summary>
              <p className="account-hint">
                Tu possèdes {owned.length} créateur{owned.length === 1 ? "" : "s"} distinct{owned.length === 1 ? "" : "s"}. Épingle jusqu&apos;à {MAX_SHOWCASE} cartes sur ton profil public.
              </p>
              <div className="showcase-picked" role="group" aria-label="Emplacements de la vitrine">
                {Array.from({ length: MAX_SHOWCASE }, (_, index) => {
                  const slug = selection[index];
                  if (slug) {
                    const creator = CREATOR_BY_SLUG.get(slug);
                    return (
                      <div className="showcase-slot filled" key={`filled-${slug}`}>
                        <ShowcaseCard slug={slug} small />
                        <button
                          type="button"
                          className="showcase-remove"
                          aria-label={`Retirer ${creator?.displayName ?? slug} de la vitrine`}
                          title="Retirer cette carte"
                          disabled={cloud.busy}
                          onClick={() => setShowcaseDraft(selection.filter((_, selectedIndex) => selectedIndex !== index))}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <span className="showcase-slot vide" key={`empty-${index}`} aria-label={`Emplacement libre ${index + 1}`}>
                      <Plus size={14} />
                    </span>
                  );
                })}
              </div>

              <label className="account-field">
                <span><Search size={10} /> Rechercher un créateur possédé</span>
                <input
                  type="search"
                  placeholder="Nom, identifiant…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="showcase-picker" role="group" aria-label="Créateurs possédés">
                {results.map((slug) => {
                  const creator = CREATOR_BY_SLUG.get(slug);
                  if (!creator) return null;
                  const selectedIndex = selection.indexOf(slug);
                  const selected = selectedIndex >= 0;
                  return (
                    <button
                      type="button"
                      key={slug}
                      className={`showcase-choice${selected ? " on" : ""}`}
                      aria-pressed={selected}
                      disabled={cloud.busy || (!selected && selection.length >= MAX_SHOWCASE)}
                      onClick={() => setShowcaseDraft(toggleShowcase(selection, slug))}
                    >
                      <Image src={creatorImage(creator)} width={36} height={36} alt="" unoptimized />
                      <span>{creator.displayName}</span>
                      {selected ? <b aria-label={`Position ${selectedIndex + 1}`}>{selectedIndex + 1}</b> : null}
                    </button>
                  );
                })}
                {!results.length ? (
                  <p className="account-hint">
                    {owned.length ? "Aucun créateur ne correspond à cette recherche." : "Tu ne possèdes encore aucun créateur à épingler."}
                  </p>
                ) : null}
                {results.length === PICKER_LIMIT && owned.length > PICKER_LIMIT ? (
                  <p className="account-hint">Affichage limité aux {PICKER_LIMIT} premiers résultats. Affine ta recherche pour trouver une autre carte.</p>
                ) : null}
              </div>
              <div className="account-actions">
                <button
                  type="button"
                  className="account-button"
                  disabled={cloud.busy || !showcaseChanged}
                  onClick={() => {
                    void cloudStore.setShowcase(selection).then((ok) => {
                      if (ok) {
                        setShowcaseDraft(null);
                        setQuery("");
                      }
                    });
                  }}
                >
                  <Check size={14} /> Enregistrer la vitrine
                </button>
                <button
                  type="button"
                  className="account-button ghost"
                  disabled={cloud.busy}
                  onClick={() => {
                    setShowcaseDraft(null);
                    setQuery("");
                  }}
                >
                  Annuler
                </button>
              </div>
            </details>
          </section>
  );
}
