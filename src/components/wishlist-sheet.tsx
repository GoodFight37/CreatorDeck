"use client";

/**
 * Feuille « Wishlist » : épingler le créateur qu'on cherche.
 *
 * Deux choses valent d'être dites ici.
 *
 * **La recherche est locale.** Le catalogue des 1 000 streameurs est déjà dans
 * l'application (il sert à tout : le tirage, le classeur, les taux). Chercher
 * dedans ne demande donc pas de réseau, pas de table, pas de frappe serveur — et
 * fonctionne même quand le joueur écrit « kame » en trois lettres. C'est
 * l'inverse de la recherche d'amis, qui interroge le serveur parce qu'il est le
 * seul à savoir qui existe comme joueur.
 *
 * **Un seul créateur.** Épingler remplace : le bouton change d'état, il n'y a
 * pas de file d'attente à afficher ni de plafond à surveiller. La ligne « déjà
 * épinglé » reste visible pour que le joueur sache ce qu'il perd.
 *
 * La feuille n'écrit jamais l'état elle-même : elle demande au store, qui parle
 * au serveur, et lit la réponse. Un épinglé affiché sans l'avoir été n'aurait
 * aucune valeur — c'est ce que les autres verront.
 */
import { useMemo, useState } from "react";
import { Check, Info, Search, Target, X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { connecteToi } from "@/lib/cloud/store-text";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { CATALOG_SIZE, CREATORS, CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";

/** Nombre de propositions affichées : au-delà, la liste devient un annuaire. */
const MAX_RESULTS = 24;

export function WishlistSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const [query, setQuery] = useState("");

  const picked = cloud.wishlistSlug ? CREATOR_BY_SLUG.get(cloud.wishlistSlug) ?? null : null;

  const results = useMemo(() => {
    const q = query.toLocaleLowerCase("fr").trim();
    const matches = q
      ? CREATORS.filter((creator) =>
          `${creator.displayName} ${creator.login} ${creator.category}`
            .toLocaleLowerCase("fr")
            .includes(q),
        )
      : // Sans recherche, les têtes d'affiche : le catalogue est trié par rang.
        CREATORS.slice(0, MAX_RESULTS);
    return matches.slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Wishlist">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Wishlist</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>{connecteToi("La wishlist")}</strong>
              <span>
                Cette version est hors ligne : un épinglé n&apos;a personne à qui être montré.
              </span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Connecte-toi pour épingler</strong>
              <span>
                C&apos;est le créateur que les autres verront sur ta fiche publique — celui que tu
                cherches, même si tu ne l&apos;as pas encore.
              </span>
            </div>
          </div>
        ) : (
          <>
            <section className="account-card">
              <div className="account-head">
                <Target size={15} />
                <strong>{picked ? "Ton épinglé" : "Aucun épinglé"}</strong>
              </div>
              {picked ? (
                <div className="friend-row wishlist-current">
                  <b>{picked.displayName}</b>
                  <span>
                    {RARITY_META[picked.rarity].label} · {regionLabel(picked.region)}
                  </span>
                  <button
                    type="button"
                    className="account-button"
                    disabled={cloud.wishlistBusy}
                    onClick={() => void cloudStore.clearWishlist()}
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <p className="account-intro">
                  Un créateur, un seul. Il s&apos;affiche sur ta fiche publique : c&apos;est une
                  demande, pas un secret.
                </p>
              )}
            </section>

            <section className="account-card">
              <div className="account-head">
                <Search size={15} />
                <strong>Changer d&apos;épinglé</strong>
              </div>
              <label className="account-field">
                <span>Créateur</span>
                <input
                  type="search"
                  placeholder={`Nom, pseudo ou jeu — parmi ${CATALOG_SIZE} streameurs`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="friend-rows">
                {results.map((creator) => {
                  const isPicked = creator.slug === cloud.wishlistSlug;
                  return (
                    <div className="friend-row" key={creator.slug}>
                      <b>{creator.displayName}</b>
                      <span>
                        {RARITY_META[creator.rarity].label} · {regionLabel(creator.region)}
                      </span>
                      {isPicked ? (
                        <span className="wishlist-check" aria-label="Déjà épinglé">
                          <Check size={15} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="account-button"
                          disabled={cloud.wishlistBusy}
                          onClick={() => void cloudStore.setWishlist(creator.slug)}
                        >
                          Épingler
                        </button>
                      )}
                    </div>
                  );
                })}
                {!results.length ? (
                  <p className="account-hint">Aucun streameur ne porte ce nom.</p>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
