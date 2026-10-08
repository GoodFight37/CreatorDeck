"use client";

/**
 * **Le studio** : le décor de « Ta chaîne », et les deux socles d'invités.
 *
 * C'est la pièce visuelle du mini-jeu — pas une liste, pas un tableau : une
 * pièce dessinée en SVG (mur, panneaux acoustiques, bandeau néon, bureau) vue
 * de face, avec :
 *
 *   * **un HUD de jeu** — le rang (palier de notoriété), la **jauge d'abonnés**
 *     qui se remplit vers le palier suivant (`0 / 2 500`), la pilule du rythme
 *     (`⚡ +240 / jour`) et le compteur de jetons de la journée ;
 *   * **un setup qui se voit** : les huit paliers dessinent chacun un objet dans
 *     la pièce (caméra, micro sur bras, éclairage LED, déco néon, fond de studio,
 *     seconde caméra, régie, plateau). Un objet non acheté reste une
 *     **silhouette éteinte** — on voit ce qui manque, et chaque achat allume sa
 *     lueur. Aucun palier ne se « coche » : il s'allume ;
 *   * **deux socles d'invités** en acrylique, posés sur le bureau : une carte
 *     posée est une **vraie `CreatorCard`** (compacte) légèrement inclinée ; une
 *     place libre est un socle translucide au halo qui invite au tap — plus de
 *     boîte pointillée ; une carte dont le créateur streame **maintenant** vire
 *     au rouge : aura qui pulse et badge **EN DIRECT**.
 *
 * Ce que la scène **ne décide pas** : ce que les invités rapportent. Le barème
 * vit dans `src/data/streamer.json`, c'est le serveur qui paie (`0041`), et la
 * scène ne fait que montrer les chiffres qu'on lui donne — le plateau
 * (`collabPermille`, `collabLive`) et le relevé du soir. Aucune règle ici.
 *
 * Une seule animation perpétuelle, et elle dit quelque chose : l'aura d'un
 * invité **en direct**. Elle s'éteint avec le direct, `prefers-reduced-motion`
 * la coupe, et l'interrupteur « Reflets des cartes » aussi.
 */
import { Coins, Plus, Radio, Sparkles, Trophy, X, Zap } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";
import {
  GUEST_SLOTS,
  collabVideoPermille,
  guestRaidPermille,
  type StreamerGuest,
} from "@/lib/streamer";

const count = new Intl.NumberFormat("fr-FR");

/** Les huit objets du studio, dans l'ordre où ils s'achètent (`setup.levels`). */
const OBJETS = [
  "webcam",
  "micro",
  "lumiere",
  "deco",
  "studio",
  "webcam2",
  "regie",
  "plateau",
] as const;

/** Les panneaux acoustiques du mur : trois rangées de huit, dessinées une fois. */
const PANNEAUX = [26, 58, 90].flatMap((y) =>
  Array.from({ length: 8 }, (_, i) => ({ x: 20 + i * 34, y })),
);

export type StreamerStudioStageProps = {
  guests: readonly StreamerGuest[];
  /** Les créateurs invités **en direct** maintenant (`liveGuestSlugs()`). */
  direct: ReadonlySet<string>;
  /** Le direct de chaque invité, pour le point « on air » de sa carte. */
  liveStreams: ReadonlyMap<string, LiveStream>;
  /** Les paliers de setup installés, dans l'ordre. */
  setup: readonly string[];
  /** Ce que le plateau vaut **maintenant**, pour mille (`collabFor()`). */
  collabPermille: number;
  /** Un invité streame à cet instant. */
  collabLive: boolean;
  /** Le raid déjà payé aujourd'hui (0 : personne n'est passé). */
  raidToday: number;
  /** Une ligne de raid, si un raid a été payé — écrite par l'appelant. */
  raidLine?: string | null;
  /** Ce que le plateau vaudrait maintenant, en abonnés (aperçu du relevé). */
  raidPossible?: number;
  /** Le HUD : les abonnés, le rythme du jour, et le palier en cours. */
  subscribers: number;
  perDay: number;
  tierLabel: string;
  /** Le seuil du palier suivant, `null` au sommet. */
  nextTierAt: number | null;
  /** La part du palier parcourue, de 0 à 1. */
  progressRatio: number;
  /** Les jetons versés aujourd'hui, et le plafond de la journée. */
  tokens: number;
  tokensCap: number;
  busy: boolean;
  onOpenSlot: (slot: number) => void;
  onRemove: (slot: number) => void;
};

export function StreamerStudioStage({
  guests,
  direct,
  liveStreams,
  setup,
  collabPermille,
  collabLive,
  raidToday,
  raidLine = null,
  raidPossible = 0,
  subscribers,
  perDay,
  tierLabel,
  nextTierAt,
  progressRatio,
  tokens,
  tokensCap,
  busy,
  onOpenSlot,
  onRemove,
}: StreamerStudioStageProps) {
  /** Le palier est-il installé ? C'est **tout** ce qui allume un objet. */
  const on = (id: string) => setup.includes(id);
  const places = Array.from({ length: GUEST_SLOTS }, (_, index) => index + 1);
  const objectClass = (id: string) => `chaine-object obj-${id}${on(id) ? " on" : ""}`;
  const ratio = Math.max(0, Math.min(1, progressRatio));

  return (
    <section
      className={`chaine-stage${on("lumiere") ? " eclaire" : ""}${on("plateau") ? " plateau" : ""}${
        collabLive ? " raid" : ""
      }`}
      aria-label="Le studio"
    >
      {/* ---------------------------------------------------------- le HUD */}
      <div className="chaine-hud">
        <span className="chaine-hud-rank" title={`Palier : ${tierLabel}`}>
          <Trophy size={13} aria-hidden="true" />
          {tierLabel}
        </span>
        <div
          className="chaine-hud-track"
          role="progressbar"
          aria-label={nextTierAt === null ? "Palier au sommet" : `Abonnés vers ${count.format(nextTierAt)}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <i style={{ width: `${Math.round(ratio * 100)}%` }} />
          <span>
            {count.format(subscribers)}
            {nextTierAt === null ? " abonnés" : ` / ${count.format(nextTierAt)}`}
          </span>
        </div>
        <span className="chaine-hud-pill" title="Croissance de la chaîne par journée de jeu">
          <Zap size={12} aria-hidden="true" />+{count.format(perDay)} / jour
        </span>
        <span className="chaine-hud-pill jetons" title="Jetons versés aujourd'hui par la chaîne">
          <Coins size={12} aria-hidden="true" />
          {tokens}/{tokensCap}
        </span>
      </div>

      {/* --------------------------------------------------------- la pièce */}
      <div className={`chaine-room${collabLive ? " en-direct" : ""}`}>
        <svg viewBox="0 0 320 280" role="img" aria-label="Le décor du studio">
          <defs>
            <linearGradient id="chaine-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d1630" />
              <stop offset="62%" stopColor="#0e0b16" />
              <stop offset="100%" stopColor="#090711" />
            </linearGradient>
            <linearGradient id="chaine-band" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ff4d9d" />
            </linearGradient>
            <linearGradient id="chaine-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#141020" />
              <stop offset="100%" stopColor="#08060e" />
            </linearGradient>
            <linearGradient id="chaine-desk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#241c38" />
              <stop offset="100%" stopColor="#0d0a16" />
            </linearGradient>
            <linearGradient id="chaine-screen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b2a72" />
              <stop offset="55%" stopColor="#1b2a5c" />
              <stop offset="100%" stopColor="#123043" />
            </linearGradient>
            <linearGradient id="chaine-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd27a" stopOpacity=".22" />
              <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="chaine-glow" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity=".34" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="chaine-glow-live" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#ff4d5e" stopOpacity=".34" />
              <stop offset="100%" stopColor="#ff4d5e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Le mur, et ses panneaux acoustiques — allumés par « Fond de studio ». */}
          <rect x="0" y="0" width="320" height="172" fill="url(#chaine-wall)" />
          <g className={objectClass("studio")}>
            {PANNEAUX.map(({ x, y }) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={26}
                height={24}
                rx="4"
                fill="#a855f7"
                fillOpacity=".14"
                stroke="#c4b5fd"
                strokeOpacity=".22"
              />
            ))}
            {/* La plante du coin, posée au sol. */}
            <path d="M22 160v-32" stroke="#3c7a52" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M22 132c-11-6-15-17-8-24 9 3 13 13 8 24Z" fill="#2f6b45" />
            <path d="M22 142c10-5 15-16 9-23-9 3-13 12-9 23Z" fill="#255738" />
            <path d="M13 158h18l-3 13H16Z" fill="#2a2240" stroke="#463a63" strokeWidth=".8" />
          </g>

          {/* Le bandeau néon — la pièce passe en couleur quand la lumière est achetée. */}
          <g className={objectClass("lumiere")}>
            <rect x="18" y="8" width="284" height="4" rx="2" fill="url(#chaine-band)" />
            <rect x="26" y="150" width="268" height="3" rx="1.5" fill="url(#chaine-band)" />
            <rect x="0" y="0" width="320" height="172" fill="url(#chaine-glow)" />
          </g>

          {/* La déco de fond : deux cadres néon, accrochés au mur. */}
          <g className={objectClass("deco")}>
            <rect
              x="30"
              y="26"
              width="58"
              height="42"
              rx="9"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.2"
            />
            <path d="M59 84 71 66h-9l11-18" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
            <rect
              x="230"
              y="32"
              width="60"
              height="44"
              rx="9"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.2"
            />
            <circle cx="260" cy="54" r="9" fill="none" stroke="#ff4d9d" strokeWidth="2" />
          </g>

          {/* Le plateau : deux projecteurs et l'étoile — c'est le dernier palier. */}
          <g className={objectClass("plateau")}>
            <path d="M46 0 132 150H92Z" fill="url(#chaine-beam)" />
            <path d="M274 0 228 150h-40Z" fill="url(#chaine-beam)" />
            <path
              d="m160 24 4.9 10.2 11.1 1.6-8 8 1.9 11.1-9.9-5.3-9.9 5.3 1.9-11.1-8-8 11.1-1.6Z"
              fill="#ffd27a"
            />
          </g>

          {/* Le sol, puis le bureau du premier plan. */}
          <rect x="0" y="172" width="320" height="108" fill="url(#chaine-floor)" />
          <rect x="14" y="140" width="292" height="14" rx="4" fill="url(#chaine-desk)" />
          <rect x="14" y="140" width="292" height="3" rx="1.5" fill="#c4b5fd" fillOpacity=".28" />
          <rect x="24" y="154" width="272" height="34" rx="3" fill="#0e0b18" />
          <rect x="34" y="188" width="10" height="26" rx="3" fill="#0b0914" />
          <rect x="276" y="188" width="10" height="26" rx="3" fill="#0b0914" />

          {/* La seconde caméra, sur son trépied, à gauche du bureau. */}
          <g className={objectClass("webcam2")}>
            <path
              d="M40 120 28 148M44 120v28M48 120l12 28"
              stroke="#4a4266"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect x="26" y="106" width="26" height="14" rx="4" fill="#1b1628" stroke="#4a4266" />
            <circle cx="34" cy="113" r="3.4" fill="#0a0910" stroke="#6d6390" />
            <circle cx="34" cy="113" r="1.4" fill="#22d3ee" />
          </g>

          {/* Le micro sur bras articulé, posé sur le bureau. */}
          <g className={objectClass("micro")}>
            <path
              d="M296 146 258 118l-138-8"
              fill="none"
              stroke="#4a4266"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="258" cy="118" r="3" fill="#6d6390" />
            <rect x="104" y="92" width="18" height="28" rx="9" fill="#20202e" stroke="#8f8aa8" />
            <rect x="108" y="96" width="10" height="14" rx="5" fill="#14131c" />
            <path d="M100 120h26" stroke="#5b5570" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* La caméra : l'écran, la webcam posée dessus, et son voyant rouge. */}
          <g className={objectClass("webcam")}>
            <rect x="124" y="100" width="72" height="48" rx="4" fill="#0b0913" stroke="#392f52" />
            <rect x="128" y="104" width="64" height="40" rx="2" fill="url(#chaine-screen)" />
            <rect x="152" y="148" width="16" height="6" rx="2" fill="#241c38" />
            <rect x="140" y="154" width="40" height="4" rx="2" fill="#2d2444" />
            <rect x="150" y="84" width="26" height="16" rx="5" fill="#181324" stroke="#4a4266" />
            <circle cx="162" cy="92" r="4.4" fill="#0a0910" stroke="#6d6390" />
            <circle cx="162" cy="92" r="1.8" fill="#8b7cff" />
            <circle cx="171" cy="88" r="1.7" fill="#ff4d5e" />
          </g>

          {/* La régie : une console à faders, à droite. */}
          <g className={objectClass("regie")}>
            <path d="M212 140 224 110h84l-10 30Z" fill="#171225" stroke="#392f52" />
            <g stroke="#6d6390" strokeWidth="1.6" strokeLinecap="round">
              <path d="M234 134v-14M246 134v-10M258 134v-17M270 134v-12" />
            </g>
            <g fill="#22d3ee">
              <circle cx="234" cy="118" r="1.6" />
              <circle cx="246" cy="122" r="1.6" />
              <circle cx="258" cy="115" r="1.6" />
              <circle cx="270" cy="120" r="1.6" />
            </g>
            <rect x="282" y="114" width="20" height="9" rx="2" fill="#0c1a24" stroke="#22d3ee" strokeWidth=".8" />
          </g>

          {/* Le halo de la pièce : violet d'ambiance, rouge quand un invité streame. */}
          <rect
            x="0"
            y="0"
            width="320"
            height="172"
            fill={collabLive ? "url(#chaine-glow-live)" : "url(#chaine-glow)"}
            opacity={collabLive ? 1 : on("lumiere") ? 1 : 0}
          />
        </svg>

        {/* ------------------------------------------------- les deux socles */}
        <ul className="chaine-stands">
          {places.map((place) => {
            const invite = guests.find((guest) => guest.slot === place) ?? null;

            // Une place libre : un socle translucide, un halo, un « + » — et
            // le tap ouvre le classeur. Rien à lire, tout à voir.
            if (!invite) {
              return (
                <li key={place} className="chaine-stand libre">
                  <button
                    type="button"
                    className="chaine-stand-empty"
                    disabled={busy}
                    aria-label={`Choisir un invité pour la place ${place}`}
                    onClick={() => onOpenSlot(place)}
                  >
                    <span className="chaine-stand-plate" aria-hidden="true">
                      <Plus size={18} />
                    </span>
                    <span className="chaine-stand-base" aria-hidden="true" />
                    <span className="chaine-stand-glow" aria-hidden="true" />
                  </button>
                  <span className="chaine-stand-plaque">Place {place}</span>
                </li>
              );
            }

            const creator = CREATOR_BY_SLUG.get(invite.slug) ?? null;
            const enDirect = direct.has(invite.slug);
            const stream = liveStreams.get(invite.slug) ?? null;
            const part = guestRaidPermille(invite.rarity);
            const bonus = collabVideoPermille(invite.rarity);
            return (
              <li
                key={place}
                className={`chaine-stand pose${enDirect ? " en-direct" : ""}`}
                data-place={place}
              >
                {enDirect ? <span className="chaine-stand-aura" aria-hidden="true" /> : null}
                <div className="chaine-stand-card">
                  {creator ? (
                    <CreatorCard
                      creator={creator}
                      variant={invite.variant}
                      compact
                      liveStream={stream}
                    />
                  ) : (
                    <span className="chaine-stand-unknown">{invite.slug}</span>
                  )}
                </div>
                <span className="chaine-stand-base" aria-hidden="true" />
                <span className="chaine-stand-glow" aria-hidden="true" />
                {enDirect ? (
                  <span className="chaine-stand-live">
                    <Radio size={11} aria-hidden="true" />
                    EN DIRECT
                    {stream ? ` · ${count.format(stream.viewers)}` : ""}
                  </span>
                ) : null}
                <span className="chaine-stand-meta">
                  <i style={{ color: RARITY_META[invite.rarity as Rarity]?.color ?? undefined }}>
                    {RARITY_META[invite.rarity as Rarity]?.label ?? invite.rarity}
                  </i>
                  {bonus > 0 ? <em>+{(bonus / 10).toFixed(0)} %</em> : null}
                  {part > 0 ? <em className="raid">+{(part / 10).toFixed(1)} % raid</em> : null}
                </span>
                <span className="chaine-stand-actions">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Changer l'invité de la place ${place}`}
                    onClick={() => onOpenSlot(place)}
                  >
                    Changer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Retirer l'invité de la place ${place}`}
                    onClick={() => onRemove(place)}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* -------------------------------------------------- les états du soir */}
      <div className="chaine-chips">
        {collabLive ? (
          <span className="chaine-chip live">
            <Sparkles size={12} aria-hidden="true" /> RAID ! le direct entre dans la vidéo du jour
          </span>
        ) : null}
        <span className={`chaine-chip${collabPermille > 0 ? " violet" : ""}`}>
          Plateau {collabPermille > 0 ? `+${(collabPermille / 10).toFixed(1)} %` : "vide"}
          {collabLive ? " (direct compris)" : ""}
        </span>
        {raidToday > 0 && raidLine ? (
          <span className="chaine-chip gold">{raidLine}</span>
        ) : raidToday === 0 && raidPossible > 0 ? (
          <span className="chaine-chip gold">
            Relevé du soir +{count.format(raidPossible)} abonnés
          </span>
        ) : null}
        {guests.length === 0 ? (
          <span className="chaine-chip">Socles libres : invite deux cartes</span>
        ) : null}
      </div>
    </section>
  );
}
