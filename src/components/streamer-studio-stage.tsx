"use client";

/**
 * **Le studio** : la pièce de « Ta chaîne », et les deux socles d'invités.
 *
 * C'est une vraie pièce isométrique, composée d'**images** du kit Kenney
 * « Isometric Miniature » (CC0) posées par `src/lib/studio-room.ts` : le sol,
 * les murs, le bureau, l'écran, le siège, l'étagère, la plante. Rien n'est
 * dessiné à la main ici — les rares formes CSS sont deux équipements que le kit
 * ne fournit pas (une webcam, un micro sur bras) et les néons du mur.
 *
 * Trois règles, et tout le reste en découle :
 *
 *   * **un palier acheté se voit** : chaque palier de setup pose un objet dans
 *     la pièce (la table de la webcam, l'enceinte, la lampe, le tapis, les
 *     panneaux acoustiques, les néons, le canapé, la console, le grand écran).
 *     Ce qui n'est pas acheté n'est pas là : aucune silhouette, aucune case à
 *     cocher, aucun pavé de texte. Et le jour de l'achat, ça se voit : les
 *     objets du palier **tombent en place**, l'un après l'autre, avec une
 *     bouffée de fumée là où on vient de les brancher (`justInstalled`, calculé
 *     par `src/lib/studio-install.ts`). Une fois, pas en boucle ;
 *   * **le HUD arcade** remplace les chiffres en colonne : le badge de rang, la
 *     **jauge d'abonnés** qui se remplit vers le palier suivant (`0 / 2 500`),
 *     la pilule du rythme (`⚡ +240 / jour`) et les jetons du jour ;
 *   * **deux socles d'invités** sur le devant du bureau : une carte posée est
 *     une **vraie `CreatorCard`** en miniature ; une place libre est un piédestal
 *     translucide au halo qui invite au tap — jamais une boîte pointillée. Une
 *     carte dont le créateur streame **maintenant** vire au rouge : aura et badge
 *     **EN DIRECT**.
 *
 * Ce que la scène **ne décide pas** : ce que les invités rapportent. Le barème
 * vit dans `src/data/streamer.json`, c'est le serveur qui paie (`0041`), et la
 * scène ne fait que montrer les chiffres qu'on lui donne.
 *
 * Une seule animation perpétuelle, et elle dit quelque chose : l'aura d'un
 * invité **en direct** (et le voyant REC qui bat avec elle). Elle s'éteint avec
 * le direct, `prefers-reduced-motion` la coupe, et l'interrupteur « Reflets des
 * cartes » aussi.
 */
import { useMemo } from "react";
import { Coins, Radio, Trophy, X, Zap } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { EffectBurst } from "@/components/effect-burst";
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";
import {
  GUEST_SLOTS,
  collabVideoPermille,
  type StreamerGuest,
} from "@/lib/streamer";
import { EMBLEME_ASSET, emblemesSurLEtagere } from "@/lib/studio-emblem";
import { studioArrivees, studioNuages } from "@/lib/studio-install";
import {
  studioAccessories,
  studioCanvas,
  studioFloor,
  studioFurniture,
  studioLights,
  studioSpriteSize,
  studioSpriteUrl,
  studioStands,
  studioWallPanels,
  studioWalls,
} from "@/lib/studio-room";

const count = new Intl.NumberFormat("fr-FR");

/** La pièce est calculée une fois : elle ne dépend pas de la partie en cours. */
const CANVAS = studioCanvas();
const SOL = studioFloor();
const MURS = studioWalls();
const MEUBLES = studioFurniture();
const PANNEAUX = studioWallPanels();
const LUMIERES = studioLights();
const GADGETS = studioAccessories();
const PLACES = studioStands();

/** La part d'une coordonnée du canevas, pour le DOM (le décor suit la largeur). */
const partX = (valeur: number) => `${(valeur / CANVAS[0]) * 100}%`;
const partY = (valeur: number) => `${(valeur / CANVAS[1]) * 100}%`;

export type StreamerStudioStageProps = {
  guests: readonly StreamerGuest[];
  /** Les créateurs invités **en direct** maintenant (`liveGuestSlugs()`). */
  direct: ReadonlySet<string>;
  /** Le direct de chaque invité, pour le point « on air » de sa carte. */
  liveStreams: ReadonlyMap<string, LiveStream>;
  /** Les paliers de setup installés, dans l'ordre. */
  setup: readonly string[];
  /**
   * Le palier **qu'on vient d'acheter**, s'il y en a un : ses objets tombent en
   * place et une bouffée de fumée marque l'endroit. `null` (ou absent) : la
   * pièce est celle du quotidien, rien ne bouge.
   */
  justInstalled?: string | null;
  /**
   * Les **emblèmes d'Arène** gagnés (une semaine terminée dans le top 10) : ils
   * attendent sur l'étagère du fond. Le pont entre les deux univers du jeu —
   * ce qui se gagne dans l'Arène se voit dans le Studio (le TCG se joue dans le
   * Drop et le Binder, la chaîne vit ici). Zéro : rien sur l'étagère.
   */
  emblemes?: number;
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

/**
 * Une image du kit, posée en pourcentage du canevas.
 *
 * Déclaré **hors** du rendu : un composant défini dans le rendu change
 * d'identité à chaque passage, et React remonterait les trente images de la
 * pièce à chaque abonné gagné.
 */
function Sprite({
  asset,
  left,
  top,
  /** L'objet vient d'être installé : il tombe en place au lieu d'apparaître. */
  neuf = false,
  /** Son tour d'arrivée, en ms (les objets d'un même palier se suivent). */
  delayMs = 0,
}: {
  asset: string;
  left: number;
  top: number;
  neuf?: boolean;
  delayMs?: number;
}) {
  const [largeur, hauteur] = studioSpriteSize(asset);
  return (
    // Les sprites du kit sont déjà des PNG à la bonne taille, posés en
    // pourcentage du canevas : le pipeline d'images n'aurait rien à optimiser
    // ici, et l'image n'a pas de taille intrinsèque à connaître d'avance.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`chaine-sprite${asset.includes("wall") ? (asset.includes("Window") ? " fenetre" : " mur") : ""}${
        neuf ? " vient-d-installer" : ""
      }`}
      src={studioSpriteUrl(asset)}
      alt=""
      draggable={false}
      style={{
        left: partX(left),
        top: partY(top),
        width: partX(largeur),
        height: partY(hauteur),
        ...(neuf ? ({ "--install-delay": `${delayMs}ms` } as React.CSSProperties) : {}),
      }}
    />
  );
}

export function StreamerStudioStage({
  guests,
  direct,
  liveStreams,
  setup,
  justInstalled = null,
  emblemes = 0,
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
  /** Le palier est-il installé ? C'est **tout** ce qui fait entrer un objet. */
  const on = (id: string | null) => id === null || setup.includes(id);
  const places = Array.from({ length: GUEST_SLOTS }, (_, index) => index + 1);
  const ratio = Math.max(0, Math.min(1, progressRatio));

  // Ce qui vient d'arriver : l'ordre de la pièce (`studioArrivees`) donne à
  // chaque objet son tour, et `studioNuages` pose trois bouffées au plus. Les
  // deux listes viennent du **même** fichier de pièce : rien n'est écrit ici.
  const arrivees = useMemo(() => studioArrivees(justInstalled ?? ""), [justInstalled]);
  const fumee = useMemo(() => studioNuages(justInstalled ?? ""), [justInstalled]);
  // Les couronnes de l'Arène : posées sur l'étagère, une par semaine gagnée
  // (trois au plus). Rien à gagner, rien à montrer.
  const couronnes = useMemo(() => emblemesSurLEtagere(emblemes), [emblemes]);
  // L'objet est-il de ceux qui viennent d'arriver, et à quel tour ?
  const tour = (id: string) => arrivees.findIndex((entree) => entree.id === id);
  const arrive = (id: string) => tour(id) >= 0;
  // `revele` dit à la feuille de style de ne pas toucher au `transform` de ces
  // formes : il ne se pose donc **que** sur ce qui arrive.
  const classe = (id: string, extra: string) =>
    arrive(id) ? `${extra} vient-d-installer revele` : extra;
  const retard = (id: string) => (arrive(id) ? `${tour(id) * 90}ms` : "0ms");

  return (
    <section
      className={`chaine-stage${collabLive ? " raid" : ""}`}
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
      <div
        className={`chaine-room${on("lumiere") ? " eclaire" : ""}${on("studio") ? " neon" : ""}${
          collabLive ? " en-direct" : ""
        }`}
        style={{ aspectRatio: `${CANVAS[0]} / ${CANVAS[1]}` }}
      >
        {/* Le décor : le sol, les murs, puis le mobilier dans l'ordre du peintre.
            Un objet dont le palier n'est pas acheté n'est pas rendu du tout. */}
        {SOL.map((sprite) => (
          <Sprite key={sprite.id} asset={sprite.asset} left={sprite.left} top={sprite.top} />
        ))}
        {MURS.map((sprite) => (
          <Sprite key={sprite.id} asset={sprite.asset} left={sprite.left} top={sprite.top} />
        ))}
        {PANNEAUX.filter((sprite) => on(sprite.setup)).map((sprite) => (
          <Sprite
            key={sprite.id}
            asset={sprite.asset}
            left={sprite.left}
            top={sprite.top}
            neuf={arrive(sprite.id)}
            delayMs={Math.max(0, tour(sprite.id)) * 90}
          />
        ))}
        {MEUBLES.filter((sprite) => on(sprite.setup)).map((sprite) => (
          <Sprite
            key={sprite.id}
            asset={sprite.asset}
            left={sprite.left}
            top={sprite.top}
            neuf={arrive(sprite.id)}
            delayMs={Math.max(0, tour(sprite.id)) * 90}
          />
        ))}

        {/* Les néons du mur : le studio s'allume quand on l'a payé. */}
        {LUMIERES.filter((lumiere) => on(lumiere.setup)).map((lumiere) =>
          lumiere.kind === "neon" ? (
            <i
              key={lumiere.id}
              className={classe(lumiere.id, `chaine-neon ${lumiere.couleur}`)}
              aria-hidden="true"
              style={{
                left: partX(lumiere.at[0]),
                top: partY(lumiere.at[1]),
                width: partX(lumiere.longueur),
                transform: `translate(-50%, -50%) rotate(${lumiere.angle}deg)`,
                "--install-delay": retard(lumiere.id),
              } as React.CSSProperties}
            />
          ) : (
            <i
              key={lumiere.id}
              className={classe(lumiere.id, `chaine-halo ${lumiere.couleur}`)}
              aria-hidden="true"
              style={{
                left: partX(lumiere.at[0]),
                top: partY(lumiere.at[1]),
                width: partX(lumiere.rayon * 2),
                height: partY(lumiere.rayon * 2),
                transform: "translate(-50%, -50%)",
                "--install-delay": retard(lumiere.id),
              } as React.CSSProperties}
            />
          ),
        )}

        {/* Les deux équipements que le kit n'a pas : une webcam, un micro. */}
        {GADGETS.filter((gadget) => on(gadget.setup)).map((gadget) => (
          <i
            key={gadget.id}
            className={classe(gadget.id, `chaine-gadget ${gadget.kind}`)}
            aria-hidden="true"
            style={
              {
                left: partX(gadget.at[0]),
                top: partY(gadget.at[1]),
                "--install-delay": retard(gadget.id),
              } as React.CSSProperties
            }
          />
        ))}

        {/* L'emblème d'Arène, sur l'étagère du fond : le TCG qui entre dans le
            Studio. Un gagne de l'Arène, et l'autre le voit chez soi. */}
        {couronnes.map((couronne, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`embleme-${index}`}
            className="chaine-embleme"
            src={EMBLEME_ASSET}
            alt={index === 0 ? "" : undefined}
            // Une seule ligne lisible pour tout le groupe : le nom de ce que
            // c'est, et combien de semaines ça représente. Le reste est du
            // dessin, il n'a rien à annoncer.
            role={index === 0 ? "img" : undefined}
            aria-label={
              index === 0
                ? couronnes.length > 1
                  ? `Emblèmes d'Arène : ${couronnes.length}`
                  : "Emblème d'Arène"
                : undefined
            }
            aria-hidden={index === 0 ? undefined : true}
            draggable={false}
            style={{
              left: partX(couronne.left),
              top: partY(couronne.top),
              width: partX(couronne.largeur),
              height: partY(couronne.hauteur),
            }}
          />
        ))}

        {/* La fumée de l'installation : le palier qu'on vient d'acheter se
            voit **arriver**. Les centres viennent de la pièce elle-même
            (`studioNuages`), la taille et la découpe de la planche du CSS. */}
        {fumee.map((nuage, index) => (
          <EffectBurst
            key={`fumee-${index}`}
            kind="fumee"
            className="fx-arrivee"
            left={partX(nuage.at[0])}
            offset={partY(nuage.at[1])}
            delayMs={nuage.delayMs}
          />
        ))}

        {/* ------------------------------------------------- les deux socles */}
        <ul className="chaine-stands">
          {places.map((place) => {
            const invite = guests.find((guest) => guest.slot === place) ?? null;
            const at = PLACES.find((p) => p.slot === place) ?? PLACES[0];

            // Une place libre : un piédestal translucide et son halo. Le tap
            // ouvre le classeur ; rien à lire, tout à voir.
            if (!invite) {
              return (
                <li
                  key={place}
                  className="chaine-stand libre"
                  data-place={place}
                  style={{ left: partX(at.x * CANVAS[0]), top: partY(at.y * CANVAS[1]) }}
                >
                  <button
                    type="button"
                    className="chaine-stand-empty"
                    disabled={busy}
                    aria-label={`Choisir un invité pour la place ${place}`}
                    onClick={() => onOpenSlot(place)}
                  >
                    <span className="chaine-stand-ghost" aria-hidden="true" />
                    <span className="chaine-stand-socle" aria-hidden="true" />
                    <span className="chaine-stand-glow" aria-hidden="true" />
                  </button>
                </li>
              );
            }

            const creator = CREATOR_BY_SLUG.get(invite.slug) ?? null;
            const enDirect = direct.has(invite.slug);
            const stream = liveStreams.get(invite.slug) ?? null;
            const bonus = collabVideoPermille(invite.rarity);
            return (
              <li
                key={place}
                className={`chaine-stand pose${enDirect ? " en-direct" : ""}`}
                data-place={place}
                style={{ left: partX(at.x * CANVAS[0]), top: partY(at.y * CANVAS[1]) }}
              >
                {enDirect ? <span className="chaine-stand-aura" aria-hidden="true" /> : null}
                <button
                  type="button"
                  className="chaine-stand-empty pose"
                  disabled={busy}
                  aria-label={`Changer l'invité de la place ${place}`}
                  onClick={() => onOpenSlot(place)}
                >
                  <span className="chaine-stand-card">
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
                  </span>
                  <span className="chaine-stand-socle" aria-hidden="true" />
                </button>
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
                </span>
                <button
                  type="button"
                  className="chaine-stand-remove"
                  disabled={busy}
                  aria-label={`Retirer l'invité de la place ${place}`}
                  onClick={() => onRemove(place)}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* -------------------------------------------------- les états du soir */}
      <div className="chaine-chips">
        {collabLive ? (
          <span className="chaine-chip live">
            <Radio size={12} aria-hidden="true" />
            RAID ! le direct entre dans la vidéo du jour
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
      </div>
    </section>
  );
}
