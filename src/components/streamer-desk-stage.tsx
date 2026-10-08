"use client";

/**
 * **Le bureau du streamer** : la scène du studio, et les deux places d'invités.
 *
 * C'est la pièce visuelle de « Ta chaîne » — le moment où l'on voit sa chaîne
 * plutôt que de la lire. Trois choses s'y lisent d'un coup d'œil :
 *
 *   * **le studio s'équipe** : chaque palier acheté (`setup`) allume un objet de
 *     la scène — la caméra, le micro, l'éclairage néon, le cadre, le fond, la
 *     seconde caméra, la régie, la scène de plateau. Rien d'acheté ne reste
 *     invisible : un palier se voit avant de se lire ;
 *   * **les deux invités** sont de **vraies cartes** du classeur, posées sur
 *     leur socle (`CreatorCard` en format compacte). Un invité dont le créateur
 *     streame **maintenant** s'allume : aura rouge, badge LIVE, et la scène
 *     passe en mode raid ;
 *   * **les places libres** sont des socles en pointillés avec un « + » : un
 *     appui ouvre le classeur de sélection (`onOpenSlot`).
 *
 * Ce que la scène **ne décide pas** : ce que les invités rapportent. Le barème
 * vit dans `src/data/streamer.json` (`collabFor()` le lit), le serveur le paie,
 * et la scène ne fait que montrer le chiffre qu'on lui donne — le même que celui
 * qui tombera à la publication.
 *
 * Un mot sur les animations : l'aura d'un invité en direct **pulse**, parce que
 * le direct est un état vivant et rare (dix minutes de fenêtre) ; tout le reste
 * est immobile. `prefers-reduced-motion` coupe la pulsation, comme le réglage du
 * jeu coupe le reflet des cartes.
 */
import {
  Armchair,
  Camera,
  Frame,
  Lightbulb,
  Mic,
  Plus,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";
import {
  GUEST_SLOTS,
  collabVideoPermille,
  guestRaidPermille,
  type StreamerGuest,
} from "@/lib/streamer";

/** Les objets du studio, dans l'ordre où ils s'achètent (`setup.levels`). */
const PROPS: readonly { id: string; label: string; Icon: typeof Camera }[] = [
  { id: "webcam", label: "Caméra", Icon: Camera },
  { id: "micro", label: "Micro", Icon: Mic },
  { id: "lumiere", label: "Éclairage néon", Icon: Lightbulb },
  { id: "deco", label: "Déco", Icon: Frame },
  { id: "studio", label: "Fond de studio", Icon: Armchair },
  { id: "webcam2", label: "Seconde caméra", Icon: Video },
  { id: "regie", label: "Régie", Icon: SlidersHorizontal },
  { id: "plateau", label: "Plateau", Icon: Star },
];

const count = new Intl.NumberFormat("fr-FR");

export type StreamerDeskStageProps = {
  guests: readonly StreamerGuest[];
  /** Les créateurs invités **en direct** maintenant (`liveGuestSlugs()`). */
  direct: ReadonlySet<string>;
  /** Le direct de chaque invité, pour le badge « en direct » de sa carte. */
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
  busy: boolean;
  onOpenSlot: (slot: number) => void;
  onRemove: (slot: number) => void;
};

export function StreamerDeskStage({
  guests,
  direct,
  liveStreams,
  setup,
  collabPermille,
  collabLive,
  raidToday,
  raidLine = null,
  raidPossible = 0,
  busy,
  onOpenSlot,
  onRemove,
}: StreamerDeskStageProps) {
  const eclaire = setup.includes("lumiere");
  const plateau = setup.includes("plateau");

  const places = Array.from({ length: GUEST_SLOTS }, (_, index) => index + 1);

  return (
    <section
      className={`chaine-scene${eclaire ? " eclaire" : ""}${plateau ? " plateau" : ""}${collabLive ? " raid" : ""}`}
      aria-label="Le bureau du streamer"
    >
      <h3 className="chaine-scene-title">
        <Users size={16} /> Le bureau
        <span>
          {guests.length} / {GUEST_SLOTS} invité{guests.length === 1 ? "" : "s"}
        </span>
      </h3>

      <div className="chaine-scene-studio">
        {/* Le fond : mur sombre, halo néon, et le bandeau qui s'allume avec
            l'éclairage. Purement décoratif — tout ce qui compte est lu par les
            composants React au-dessus. */}
        <div className="chaine-scene-wall" aria-hidden="true" />
        <div className="chaine-scene-neon" aria-hidden="true" />

        <ul className="chaine-scene-props">
          {PROPS.map(({ id, label, Icon }) => {
            const installe = setup.includes(id);
            return (
              <li key={id} className={`chaine-prop prop-${id}${installe ? " on" : ""}`} title={label}>
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </li>
            );
          })}
        </ul>

        <div className="chaine-scene-floor" aria-hidden="true" />
        <div className="chaine-scene-desk" aria-hidden="true" />

        <ul className="chaine-scene-slots">
          {places.map((place) => {
            const invite = guests.find((guest) => guest.slot === place) ?? null;
            if (!invite) {
              return (
                <li key={place} className="chaine-slot libre">
                  <button
                    type="button"
                    className="chaine-slot-empty"
                    disabled={busy}
                    aria-label={`Choisir un invité pour la place ${place}`}
                    onClick={() => onOpenSlot(place)}
                  >
                    <span className="chaine-slot-socle" aria-hidden="true">
                      <Plus size={20} />
                    </span>
                    <span className="chaine-slot-label">Place {place} libre</span>
                    <span className="chaine-slot-hint">Choisir un invité</span>
                  </button>
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
                className={`chaine-slot pose${enDirect ? " en-direct" : ""}`}
                data-place={place}
              >
                {enDirect ? <span className="chaine-slot-aura" aria-hidden="true" /> : null}
                <div className="chaine-slot-card">
                  {creator ? (
                    <CreatorCard
                      creator={creator}
                      variant={invite.variant}
                      compact
                      liveStream={stream}
                    />
                  ) : (
                    <span className="chaine-slot-unknown">{invite.slug}</span>
                  )}
                </div>
                <div className="chaine-slot-meta">
                  <strong>{creator?.displayName ?? invite.slug}</strong>
                  <span>
                    <i style={{ color: RARITY_META[invite.rarity as Rarity]?.color ?? undefined }}>
                      {RARITY_META[invite.rarity as Rarity]?.label ?? invite.rarity}
                    </i>
                    {bonus > 0 ? ` · +${(bonus / 10).toFixed(0)} % vidéo` : ""}
                    {part > 0 ? ` · +${(part / 10).toFixed(1)} % raid` : ""}
                  </span>
                </div>
                {enDirect ? (
                  <span className="chaine-slot-live">
                    <Radio size={12} /> LIVE
                    {stream ? ` — ${count.format(stream.viewers)} spectateurs` : ""}
                  </span>
                ) : (
                  <span className="chaine-slot-off">hors ligne</span>
                )}
                <span className="chaine-slot-actions">
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
                    <X size={13} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>

        {collabLive ? (
          <p className="chaine-scene-raid" role="status">
            <Sparkles size={14} /> RAID ! Un invité est en direct : sa part tombe sur ta vidéo du jour (le
            gain du direct <strong>et</strong> la chance de buzz).
          </p>
        ) : null}
      </div>

      <p className="chaine-scene-foot">
        {collabPermille > 0 ? (
          <>
            <strong>Plateau : +{(collabPermille / 10).toFixed(1)} %</strong> sur la vidéo du jour — la
            rareté de tes invités, {collabLive ? "direct compris" : "sans le direct"}.
          </>
        ) : (
          <>Invite une carte de ta collection pour qu&apos;elle pèse sur la vidéo du jour.</>
        )}
        {raidToday > 0 && raidLine ? <span className="chaine-scene-raidline">{raidLine}</span> : null}
        {raidToday === 0 && raidPossible > 0 ? (
          <span className="chaine-scene-raidline">
            Un invité est en direct : ton relevé ajoute +{count.format(raidPossible)} abonnés, une fois pour
            la journée.
          </span>
        ) : null}
      </p>
    </section>
  );
}
