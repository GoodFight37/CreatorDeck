/**
 * La fiche publique d'un joueur, en plein écran.
 *
 * Elle s'ouvre depuis le classement (touche une ligne) ou depuis un lien
 * `?profil=<identifiant>` — le seul « lien de partage » que permet une
 * application sans serveur. Ce qu'elle montre vient **entièrement du serveur**
 * (`player_profile`) : des compteurs, la complétion, les rangs et les quatre
 * cartes épinglées. La collection, elle, ne sort jamais de la base.
 *
 * L'affiche de partage est dessinée sur place (voir `src/lib/poster.ts`) : pas
 * besoin d'un serveur pour fabriquer une « Open Graph image ».
 */
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Check, Copy, Download, RefreshCw, Share2, Target, Trophy, X } from "lucide-react";
import { ShowcaseCard } from "@/components/showcase-card";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { drawPoster, posterFileName, posterModel } from "@/lib/poster";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { describeCard, formatPoints } from "@/lib/market";
import { seasonHue } from "@/lib/cosmetics";
import { regionLabel } from "@/lib/regions";

/**
 * Le lien à partager, ou `null` quand il n'aiderait personne : dans l'APK l'app
 * est servie depuis `https://localhost`, et sur un serveur de développement le
 * lien ne vaut que pour cette machine. Mieux vaut ne rien copier que copier
 * `localhost`.
 */
function shareableLink(userId: string): string | null {
  if (typeof window === "undefined") return null;
  const { protocol, hostname, origin, pathname } = window.location;
  if (protocol !== "http:" && protocol !== "https:") return null;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  return `${origin}${pathname}?profil=${userId}`;
}

/** Charge un portrait local ; `null` si l'image manque (l'affiche reste valable). */
function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function percent(ratio: number): string {
  const value = Math.max(0, Math.min(1, ratio)) * 100;
  return `${(value >= 10 ? value.toFixed(0) : value.toFixed(1)).replace(".", ",")} %`;
}

function count(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

export function PublicProfileSheet() {
  const cloud = useCloud();
  const profile = cloud.profile;
  const [poster, setPoster] = useState<{ url: string; name: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const close = useCallback(() => {
    setPoster(null);
    setCopied(false);
    setProblem(null);
    cloudStore.closeProfile();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (poster) setPoster(null);
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [poster, close]);

  // Les URL d'images doivent être libérées, sinon le WebView garde les affiches
  // en mémoire à chaque partage.
  useEffect(() => {
    if (!poster) return;
    return () => URL.revokeObjectURL(poster.url);
  }, [poster]);

  if (!profile && !cloud.profileBusy) return null;

  const makePoster = async () => {
    if (!profile) return;
    setMaking(true);
    setProblem(null);
    try {
      const model = posterModel(profile);
      const images = new Map<string, CanvasImageSource>();
      await Promise.all(
        model.cards.map(async (card) => {
          const image = await loadImage(card.image);
          if (image) images.set(card.slug, image);
        }),
      );
      const canvas = document.createElement("canvas");
      drawPoster(canvas, model, images);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("affiche vide");
      setPoster({ url: URL.createObjectURL(blob), name: posterFileName(model.title) });
    } catch {
      setProblem("Impossible de fabriquer l'image sur cet appareil.");
    } finally {
      setMaking(false);
    }
  };

  const copyLink = async () => {
    if (!profile) return;
    const link = shareableLink(profile.userId);
    if (!link) {
      setProblem("Le lien de partage demande la version web hébergée : ici, partage plutôt l'image.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setProblem("Copie refusée par le navigateur : sélectionne le lien à la main.");
    }
  };

  const mine = cloud.userId === profile?.userId;
  // Le créateur épinglé de la fiche. Le catalogue est local : pas de requête de
  // plus pour afficher un nom.
  const wishlistCreator = profile?.wishlistSlug
    ? CREATOR_BY_SLUG.get(profile.wishlistSlug) ?? null
    : null;

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-label="Profil public">
      <div className="profile-sheet-panel">
        <div className="profile-sheet-head">
          <span className="profile-sheet-title">
            <Trophy size={15} /> {profile ? "Profil public" : "Chargement…"}
          </span>
          <button type="button" className="profile-sheet-close" onClick={close} aria-label="Fermer">
            <X size={15} />
          </button>
        </div>

        {!profile ? (
          <p className="account-hint">
            <RefreshCw size={11} /> Lecture du profil…
          </p>
        ) : (
          <>
            <div className="profile-sheet-id">
              <h2>{profile.displayName}</h2>
              <p>
                Niveau {count(profile.level)}
                {profile.rankCompletion ? ` · ${count(profile.rankCompletion)}ᵉ à la complétion` : ""}
                {profile.rankCards ? ` · ${count(profile.rankCards)}ᵉ au total` : ""}
                {mine ? " · toi" : ""}
              </p>
              {!profile.verified ? (
                <p className="account-hint">
                  Collection en cours de vérification : ce joueur n&apos;apparaît pas au classement.
                  {mine
                    ? " Si c'est ta fiche : rien à faire, ta progression se met à jour toute seule. Une Légendaire ou une variante Live, Holo ou Gold doit venir d'un tirage, d'un échange ou de l'hôtel pour compter au classement."
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="profile-completion">
              <div className="profile-completion-head">
                <b>{percent(profile.completion)}</b>
                <span>
                  {count(profile.uniqueCreators)} créateurs sur {count(profile.catalogSize)}
                </span>
              </div>
              <div className="profile-bar">
                <span style={{ width: `${Math.max(1, Math.round(profile.completion * 1000) / 10)}%` }} />
              </div>
            </div>

            {wishlistCreator ? (
              <div className="wishlist-share">
                <Target size={16} />
                <div>
                  <span>{mine ? "Tu cherches" : `${profile.displayName} cherche`}</span>
                  <b>{wishlistCreator.displayName}</b>
                </div>
              </div>
            ) : null}

            {profile.showcaseSlugs.length ? (
              <div className="showcase-grid">
                {profile.showcaseSlugs.map((slug) => (
                  <ShowcaseCard key={slug} slug={slug} />
                ))}
              </div>
            ) : (
              <p className="account-hint">Pas de vitrine pour l&apos;instant.</p>
            )}

            <ul className="profile-stats">
              <li><b>{count(profile.totalCards)}</b><span>Cartes</span></li>
              <li><b>{count(profile.legendaryCards)}</b><span>Légendaires</span></li>
              <li><b>{count(profile.epicCards)}</b><span>Épiques</span></li>
              <li><b>{count(profile.holoCards)}</b><span>Holo</span></li>
              <li><b>{count(profile.goldCards)}</b><span>Gold</span></li>
              <li><b>{count(profile.points)}</b><span>Points</span></li>
            </ul>

            {profile.byRegion.length ? (
              <>
                <h3 className="profile-subtitle">Familles de collection</h3>
                <ul className="profile-rarity profile-families">
                  {profile.byRegion.map((family) => {
                    // Une famille = une teinte, la même que son emblème et son
                    // thème de collection : la progression se lit d'un coup
                    // d'œil, sans légende.
                    const hue = seasonHue(family.regionId);
                    const ratio = family.total ? family.owned / family.total : 0;
                    return (
                      <li key={family.regionId}>
                        <span className="profile-rarity-label" title={regionLabel(family.regionId)}>
                          {regionLabel(family.regionId)}
                        </span>
                        <span className="profile-rarity-bar">
                          <i
                            style={{
                              width: `${family.owned ? Math.max(1, Math.round(ratio * 100)) : 0}%`,
                              background: `hsl(${hue} 80% 58%)`,
                            }}
                          />
                        </span>
                        <b>
                          {count(family.owned)} / {count(family.total)}
                        </b>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}

            {cloud.profileMarket.length ? (
              <>
                <h3 className="profile-subtitle">En vente à l&apos;hôtel</h3>
                {/* Ce que ce joueur a déposé, au prix de l'étiquette : la
                    vitrine donne un sens au mot « hôtel » sur une fiche, sans
                    jamais montrer sa collection. */}
                <ul className="market-shelf">
                  {cloud.profileMarket.map((listing) => (
                    <li key={listing.id}>
                      <b>{CREATOR_BY_SLUG.get(listing.creatorSlug)?.displayName ?? listing.creatorSlug}</b>
                      <span>{describeCard(listing.rarity, listing.variant)}</span>
                      <em>{formatPoints(listing.price)}</em>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="profile-subtitle">Par rareté</h3>
            <ul className="profile-rarity">
              {profile.byRarity.map((row) => (
                <li key={row.rarity}>
                  <span className="profile-rarity-label">{row.rarity}</span>
                  <span className="profile-rarity-bar">
                    <i style={{ width: `${row.total ? Math.max(1, Math.round((row.owned / row.total) * 100)) : 0}%` }} />
                  </span>
                  <b>
                    {count(row.owned)} / {count(row.total)}
                  </b>
                </li>
              ))}
            </ul>

            <div className="account-actions">
              <button type="button" className="account-button" disabled={making} onClick={() => void makePoster()}>
                <Share2 size={13} /> {making ? "Fabrication…" : "Affiche de partage"}
              </button>
              <button type="button" className="account-button ghost" onClick={() => void copyLink()}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Lien copié" : "Copier le lien"}
              </button>
            </div>
            {problem ? <p className="account-hint account-warning">{problem}</p> : null}
            <p className="account-hint">
              Le lien de partage ouvre la fiche dans la version web (dans l&apos;app installée, l&apos;adresse est
              locale) — l&apos;affiche, elle, partout.
            </p>
          </>
        )}
      </div>

      {poster ? (
        <div className="poster-modal" role="dialog" aria-modal="true" aria-label="Affiche de partage">
          {/* Une URL `blob:` fabriquée à l'instant : `next/image` n'a rien à
              optimiser ici (le format est déjà du PNG, à la bonne taille). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster.url} alt={`Affiche de ${profile?.displayName ?? "ce joueur"}`} />
          <div className="poster-actions">
            <a className="account-button" href={poster.url} download={poster.name}>
              <Download size={13} /> Enregistrer l&apos;image
            </a>
            <button type="button" className="account-button ghost" onClick={() => setPoster(null)}>
              <Bookmark size={13} /> Fermer
            </button>
          </div>
          <p className="account-hint">
            Si l&apos;enregistrement ne propose rien : appuie longuement sur l&apos;image pour la garder dans tes
            photos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
