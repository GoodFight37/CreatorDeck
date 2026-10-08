"use client";

/**
 * **Le Tribunal des Bannis** : l'écran.
 *
 * Le mode ne raconte rien de plus que ce qu'il montre : cinq dossiers, un
 * ticket à lire, deux gros boutons, et un bilan. Pas de scène, pas de décor —
 * le plaisir est dans le texte et dans le geste du pouce, et c'est pour ça que
 * tout tient dans un écran plein, sombre, sans fenêtre par-dessus.
 *
 * Ce que l'écran **ne décide pas** :
 *
 *   * **les dossiers du jour** viennent de `dossiersDuJour()` (tirage
 *     déterministe par journée et par joueur) — quitter au troisième et revenir
 *     ne rebat pas les cartes ;
 *   * **la justesse** d'un verdict est calculée par `evaluateVerdict()` :
 *     l'écran affiche un résultat, il ne le juge pas ;
 *   * **la récompense** est versée par `use-points.ts`, donc par le serveur
 *     quand un compte est connecté. L'écran affiche le karma qu'il a calculé
 *     pour l'affichage, et c'est le chiffre du serveur qui est versé.
 *
 * Deux sons, et seulement deux : le **tampon** quand on accorde la grâce, le
 * **marteau** quand on maintient le ban. Ils passent par `@/lib/sfx`, donc
 * l'interrupteur du joueur les coupe comme les autres. Rien ne sonne à
 * l'ouverture, ni à la fermeture : se déplacer ne sonne pas.
 */
import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { useBackHandler } from "@/hooks/use-back-handler";
import { CREATOR_BY_SLUG, type Creator } from "@/lib/catalog";
import { liveFor, type LiveSnapshot } from "@/lib/live";
import { gameDay } from "@/lib/progression";
import { playCoins, playGavel, playGrace } from "@/lib/sfx";
import {
  badgesAffiches,
  dossiersDuJour,
  evaluateVerdict,
  karma,
  reactionDuChat,
  recompenseSeance,
  type Dossier,
  type Verdict,
} from "@/lib/tribunal";
import type { OwnedCard, TribunalSeance, TribunalVerdict } from "@/lib/game-engine";

/** Ce que l'encaissement a donné, tel que l'écran l'affiche. */
export type TribunalPayout = {
  message: string;
  /** Points réellement versés (0 si la séance ne payait pas). */
  delta: number;
};

/** La séance à encaisser : l'écran ne calcule pas l'argent, il le demande. */
export type TribunalClaimRequest = {
  day: string;
  verdicts: Record<string, TribunalVerdict>;
  /** Le login Twitch du créateur qui préside (`null` si personne). */
  login: string | null;
  karma: number;
  points: number;
};

export function TribunalView({
  playerId,
  seance,
  cards,
  live,
  now,
  onVerdict,
  onClaim,
  onClose,
}: {
  playerId: string;
  seance: TribunalSeance;
  /** Le classeur : c'est là qu'on choisit la carte qui préside. */
  cards: OwnedCard[];
  /** Le direct, lu dans le cache : le créateur qui préside est-il en live ? */
  live: LiveSnapshot;
  now: number;
  onVerdict: (dossierId: string, verdict: TribunalVerdict) => void;
  onClaim: (request: TribunalClaimRequest) => Promise<TribunalPayout>;
  onClose: () => void;
}) {
  // Le retour Android ferme l'écran : c'est le dernier de la pile.
  useBackHandler(true, onClose);

  /**
   * La journée de jeu **en cours**, et non celle de la sauvegarde.
   *
   * C'est le détail qui a cassé le premier jugement : une sauvegarde neuve
   * porte `day: ""`, et le moteur, lui, rangeait le verdict dans la journée
   * d'aujourd'hui (`gameDay(now)`). Les deux tirages étaient différents, le
   * verdict était refusé, et **l'appui ne faisait rien** — pour toujours, puisque
   * rien n'était jamais enregistré. L'écran tire donc ses dossiers avec la
   * journée que le moteur va utiliser ; les deux ne peuvent plus se tromper.
   */
  const jour = gameDay(now);
  const dossiers = useMemo(() => dossiersDuJour(jour, playerId), [jour, playerId]);

  /** Les verdicts **déjà rendus**, dans l'ordre du tirage. */
  const rendus = useMemo(
    () =>
      dossiers.flatMap((dossier) => {
        const verdict = seance.verdicts[dossier.id];
        if (verdict !== "deban" && verdict !== "ban") return [];
        return [evaluateVerdict(dossier, verdict)];
      }),
    [dossiers, seance.verdicts],
  );

  const termine = dossiers.length > 0 && rendus.length >= dossiers.length;
  const enCours = dossiers[Math.min(rendus.length, dossiers.length - 1)];

  /** La carte qui préside : `null` tant qu'elle n'est pas choisie. */
  const [presidence, setPresidence] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [reaction, setReaction] = useState<{ dossier: Dossier; verdict: Verdict } | null>(null);
  const [paiement, setPaiement] = useState<TribunalPayout | null>(null);
  const [alerte, setAlerte] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  /** Sans classeur, on siège quand même : le Tribunal est ouvert à tous. */
  const siegeOuvert = presidence !== null || cards.length === 0;
  const bilan = termine;

  const cartePresidente = presidence ? cards.find((card) => card.id === presidence) ?? null : null;
  const createurPresident: Creator | null = cartePresidente
    ? CREATOR_BY_SLUG.get(cartePresidente.creatorSlug) ?? null
    : null;
  // Le direct est relu **au serveur** pour la récompense ; ici il ne sert qu'à
  // afficher le badge rouge et à annoncer le multiplicateur.
  const stream = liveFor(live, createurPresident?.login, now);

  const karmaPct = karma(rendus);
  const recompense = recompenseSeance(karmaPct, stream !== null);

  /** Le classeur, du plus rare au plus commun, filtré par la recherche. */
  const propositions = useMemo(() => {
    const rang: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    const cherche = recherche.trim().toLowerCase();
    return cards
      .map((card) => ({ card, creator: CREATOR_BY_SLUG.get(card.creatorSlug) }))
      .filter((entry): entry is { card: OwnedCard; creator: Creator } => Boolean(entry.creator))
      .filter(
        (entry) =>
          !cherche ||
          entry.creator.displayName.toLowerCase().includes(cherche) ||
          entry.creator.login.toLowerCase().includes(cherche),
      )
      .sort(
        (a, b) =>
          (rang[a.card.rarity] ?? 9) - (rang[b.card.rarity] ?? 9) ||
          a.creator.displayName.localeCompare(b.creator.displayName, "fr"),
      )
      .slice(0, 24);
  }, [cards, recherche]);

  async function encaisser(verdicts: Record<string, TribunalVerdict>) {
    if (occupe) return null;
    setOccupe(true);
    // Le serveur recalcule le karma et les points ; l'écran ne fait que
    // demander, avec ce qu'il a affiché.
    const resultat = await onClaim({
      // La journée du jour : c'est elle qui garde le paiement « une fois par
      // jour » côté serveur. Envoyer celle de la sauvegarde (vide au premier
      // jugement) ferait refuser la récompense.
      day: jour,
      verdicts,
      login: createurPresident?.login ?? null,
      karma: karmaPct,
      points: recompense.points,
    });
    if (resultat.delta > 0) playCoins();
    setPaiement(resultat);
    setOccupe(false);
    return resultat;
  }

  function juger(verdict: Verdict) {
    if (!enCours || reaction || occupe) return;
    // Le son dit le geste : le tampon pour la grâce, le marteau pour le ban.
    if (verdict === "deban") playGrace();
    else playGavel();
    try {
      onVerdict(enCours.id, verdict);
    } catch {
      // Un verdict qu'on n'arrive pas à enregistrer **se dit** : un bouton qui
      // ne fait rien, c'est le pire bug qui soit — le joueur croit avoir mal
      // appuyé, et il réessaie sans fin.
      setAlerte("Ce verdict n'a pas pu être enregistré. Reviens demain : la séance du jour est close.");
      return;
    }
    setAlerte(null);
    setReaction({ dossier: enCours, verdict });
    // Cinquième verdict : la séance est finie, elle est encaissée tout de
    // suite — le bilan n'a pas de bouton « encaisser » à oublier.
    if (rendus.length + 1 >= dossiers.length) {
      void encaisser({ ...seance.verdicts, [enCours.id]: verdict });
    }
  }

  /** Passe au dossier suivant (ou au bilan) : effacer la réaction suffit. */
  function suivant() {
    setReaction(null);
  }

  if (bilan) {
    return (
      <Bilan
        rendus={rendus}
        karmaPct={karmaPct}
        recompense={recompense}
        paiement={paiement}
        occupe={occupe}
        multiplicateurLive={stream !== null}
        createurPresident={createurPresident}
        onRetry={
          !seance.claimed && !paiement
            ? () => void encaisser(seance.verdicts)
            : null
        }
        onClose={onClose}
      />
    );
  }

  if (!siegeOuvert) {
    return (
      <div className="tribunal-overlay" role="dialog" aria-modal="true" aria-label="Tribunal des Bannis">
        <header className="tribunal-top">
          <button type="button" className="tribunal-quit" onClick={onClose}>
            <ChevronLeft size={18} aria-hidden="true" />
            <span>Quitter</span>
          </button>
        </header>
        <div className="tribunal-pick">
          <h2>Qui préside ?</h2>
          <p>
            Choisis une carte de ton classeur : elle trône au-dessus du Tribunal pour toute la séance.
            Si son créateur est <strong>en direct</strong>, la séance paie{' '}
            <strong>×{recompenseSeance(100, true).multiplicateur}</strong>.
          </p>
          {cards.length > 24 ? (
            <label className="tribunal-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Chercher un créateur"
                aria-label="Chercher un créateur dans le classeur"
              />
            </label>
          ) : null}
          <div className="tribunal-grid">
            {propositions.map(({ card, creator }) => (
              <button
                key={card.id}
                type="button"
                className="tribunal-choice"
                onClick={() => setPresidence(card.id)}
                aria-label={`${creator.displayName} préside la séance`}
              >
                <CreatorCard creator={creator} variant={card.variant} compact liveStream={liveFor(live, creator.login, now)} />
              </button>
            ))}
          </div>
          {propositions.length === 0 ? (
            <p className="tribunal-note">Aucune carte de ce nom dans ton classeur.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="tribunal-overlay" role="dialog" aria-modal="true" aria-label="Tribunal des Bannis">
      <header className="tribunal-top">
        <button type="button" className="tribunal-quit" onClick={onClose}>
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Quitter</span>
        </button>
        <p className="tribunal-count">
          Dossier <strong>{Math.min(rendus.length + 1, dossiers.length)}</strong> sur {dossiers.length}
        </p>
      </header>

      {createurPresident && cartePresidente ? (
        <div className="tribunal-seat">
          <CreatorCard
            creator={createurPresident}
            variant={cartePresidente.variant}
            liveStream={stream}
          />
          <div className="tribunal-seat-text">
            <span className="tribunal-seat-role">Préside la séance</span>
            <strong>{createurPresident.displayName}</strong>
            {stream ? (
              <span className="tribunal-live" role="status">
                EN DIRECT · séance ×{recompense.multiplicateur}
              </span>
            ) : (
              <span className="tribunal-seat-hint">Hors direct · séance ×1</span>
            )}
          </div>
        </div>
      ) : (
        <div className="tribunal-seat tribunal-seat-vide">
          <span className="tribunal-seat-role">Séance sans président</span>
          <p>Ton classeur est vide : le Tribunal siège quand même, sans bonus de direct.</p>
        </div>
      )}

      {alerte ? (
        <p className="tribunal-alerte" role="alert">
          {alerte}
        </p>
      ) : null}

      {enCours && !reaction ? (
        <Ticket dossier={enCours} onJudge={juger} />
      ) : null}

      {reaction ? (
        <div className="tribunal-reaction" role="status">
          <p className="tribunal-reaction-verdict">
            {reaction.verdict === "deban" ? "Grâce accordée" : "Ban maintenu"}
            {evaluateVerdict(reaction.dossier, reaction.verdict).juste ? (
              <span className="tribunal-tag tribunal-tag-juste">Le Tribunal approuve</span>
            ) : (
              <span className="tribunal-tag tribunal-tag-faux">
                {evaluateVerdict(reaction.dossier, reaction.verdict).complaisant
                  ? "Complaisance"
                  : "Sévérité"}
              </span>
            )}
          </p>
          <p className="tribunal-reaction-chat">{reactionDuChat(reaction.dossier, reaction.verdict)}</p>
          <button type="button" className="tribunal-next" onClick={suivant}>
            Dossier suivant
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Le ticket d'accusation : le pseudo et ses badges, le motif, la pièce à
 * conviction (en rouge sombre) et le plaidoyer.
 */
function Ticket({ dossier, onJudge }: { dossier: Dossier; onJudge: (verdict: Verdict) => void }) {
  const badges = badgesAffiches(dossier);
  return (
    <article className="tribunal-ticket">
      <header className="tribunal-head">
        <p className="tribunal-pseudo">{dossier.username}</p>
        <p className="tribunal-badges">
          {badges.length ? (
            badges.map((badge) => (
              <span key={badge.id} className={`tribunal-badge tribunal-badge-${badge.ton}`}>
                {badge.label}
              </span>
            ))
          ) : (
            <span className="tribunal-badge tribunal-badge-neuf">Sans badge</span>
          )}
        </p>
        <p className="tribunal-motif">
          Motif : <strong>{dossier.banReason}</strong>
        </p>
        {/* Le décor : sur quoi le stream tournait. Sans lui, le message ne
            veut rien dire — on ne juge pas une phrase, on juge une scène. */}
        <p className="tribunal-contexte">{dossier.contexte}</p>
      </header>

      <section className="tribunal-evidence" aria-label="Pièce à conviction">
        <span className="tribunal-label">Pièce à conviction</span>
        <blockquote>{dossier.chatMessage}</blockquote>
      </section>

      <section className="tribunal-appeal" aria-label="Plaidoyer">
        <span className="tribunal-label">Plaidoyer</span>
        <p>{dossier.appealText}</p>
      </section>

      <div className="tribunal-actions">
        <button type="button" className="tribunal-grace" onClick={() => onJudge("deban")}>
          Accorder la grâce
        </button>
        <button type="button" className="tribunal-ban" onClick={() => onJudge("ban")}>
          Maintenir le ban
        </button>
      </div>
    </article>
  );
}

/** Le bilan : les cinq jugements, le karma, et ce que la séance a payé. */
function Bilan({
  rendus,
  karmaPct,
  recompense,
  paiement,
  occupe,
  multiplicateurLive,
  createurPresident,
  onRetry,
  onClose,
}: {
  rendus: ReturnType<typeof evaluateVerdict>[];
  karmaPct: number;
  recompense: ReturnType<typeof recompenseSeance>;
  paiement: TribunalPayout | null;
  occupe: boolean;
  multiplicateurLive: boolean;
  createurPresident: Creator | null;
  onRetry: (() => void) | null;
  onClose: () => void;
}) {
  return (
    <div className="tribunal-overlay" role="dialog" aria-modal="true" aria-label="Bilan de la séance">
      <header className="tribunal-top">
        <button type="button" className="tribunal-quit" onClick={onClose}>
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Quitter</span>
        </button>
      </header>

      <section className="tribunal-bilan">
        <h2>Séance close</h2>

        <div className="tribunal-karma">
          <div className="tribunal-karma-head">
            <span>Karma de modération</span>
            <strong>{karmaPct} %</strong>
          </div>
          <div
            className="tribunal-jauge"
            role="progressbar"
            aria-valuenow={karmaPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Karma de modération"
          >
            <span style={{ width: `${karmaPct}%` }} />
          </div>
          <p className="tribunal-note">
            {rendus.filter((verdict) => verdict.juste).length} verdicts justes sur {rendus.length} ·
            seuil de paiement {recompense.seuil} %
            {multiplicateurLive ? ` · ${createurPresident?.displayName ?? "créateur"} en direct ×${recompense.multiplicateur}` : ""}
          </p>
        </div>

        <ul className="tribunal-lignes">
          {rendus.map(({ dossier, rendu, juste, complaisant }) => (
            <li key={dossier.id} className={juste ? "tribunal-ligne juste" : "tribunal-ligne"}>
              <div>
                <strong>{dossier.username}</strong>
                <span>{dossier.banReason}</span>
              </div>
              <p className="tribunal-ligne-verdict">
                {rendu === "deban" ? "Grâce" : "Ban"}
                <em>{juste ? "juste" : complaisant ? "complaisant" : "sévère"}</em>
              </p>
              <p className="tribunal-ligne-chat">{reactionDuChat(dossier, rendu)}</p>
            </li>
          ))}
        </ul>

        <div className="tribunal-paye" role="status">
          {occupe ? <p>Encaissement…</p> : null}
          {!occupe && paiement ? (
            <p>
              {paiement.message}
              {paiement.delta > 0 ? <strong> +{paiement.delta} points</strong> : null}
            </p>
          ) : null}
          {!occupe && !paiement && !recompense.paye ? (
            <p>En dessous de {recompense.seuil} %, la séance ne paie pas.</p>
          ) : null}
          {onRetry ? (
            <button type="button" className="tribunal-next" onClick={onRetry}>
              Réclamer la récompense
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
