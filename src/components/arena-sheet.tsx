"use client";

/**
 * L'écran de l'Arène : cinq cartes contre la réalité.
 *
 * C'est le seul écran du jeu qui se joue **contre l'instant**. Cinq cartes de
 * son classeur, au plus une Légendaire, dont au moins un créateur en direct —
 * et le score, c'est la somme des viewers réels. Il est calculé par le serveur :
 * ici on choisit cinq cartes, on regarde le classement, et on encaisse quand la
 * semaine est finie.
 *
 * Trois choses sur cet écran, dans cet ordre :
 *
 *   1. **ma semaine** — ce que j'ai déposé, mon score, mon rang, le temps qu'il
 *      reste, et la récompense à encaisser si la semaine précédente a payé ;
 *   2. **le composeur** (ou le draft le week-end) — mes cartes, celles qui
 *      streament en tête, les refus dits en français avant même d'envoyer ;
 *   3. **le classement** — qui est devant, avec quelles cartes.
 *
 * Le week-end, le composeur laisse la place au **draft** : cinq emplacements,
 * trois propositions chacun, une seule à garder. Les propositions sont tirées
 * par le serveur dans la collection réelle, de façon reproductible : deux
 * appels donnent les mêmes cartes, et un choix non proposé est refusé.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Crown,
  Flame,
  Info,
  RefreshCw,
  Search,
  Shuffle,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { CREATOR_BY_SLUG, RARITY_META, type Creator } from "@/lib/catalog";
import { useCloud } from "@/hooks/use-cloud";
import { connecteToi } from "@/lib/cloud/store-text";
import { useGame, useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { cloudStore, type CloudActionOutcome } from "@/lib/cloud/cloud-store";
import {
  ARENA_DRAFT_CHOICES,
  ARENA_EMBLEM_TOP,
  ARENA_LINEUP_SIZE,
  ARENA_MAX_LEGENDARY,
  arenaDraftChoose,
  arenaDraftLineup,
  arenaDraftWindow,
  arenaEmblemEarned,
  arenaHourglasses,
  arenaLineupProblems,
  arenaRankLabel,
  arenaScore,
  arenaWeekKey,
  arenaWeekLabel,
} from "@/lib/arena";
import { ownedSlugs } from "@/lib/game-engine";

/** « lundi 12 octobre à 08:00 » — à l'heure de l'appareil, pas à celle du serveur. */
function formatMoment(moment: string | number): string {
  const date = new Date(moment);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** « 2 j 04 h » : le temps restant, deux unités suffisent. */
function formatLeft(ms: number): string {
  if (ms <= 0) return "terminée";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  if (days > 0) return `${days} j ${String(hours).padStart(2, "0")} h`;
  if (hours > 0) return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
  return `${minutes} min`;
}

function lineupLabel(slugs: readonly string[]): string {
  return slugs.map((slug) => CREATOR_BY_SLUG.get(slug)?.displayName ?? slug).join(" · ");
}

export function ArenaSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const state = useGame();
  const live = useLive();
  // Trente secondes : l'arène se joue contre une horloge (fin de semaine, draft).
  const now = useNow(30_000);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [lineup, setLineup] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  // Le draft est **définitif** : un par semaine, tranché par le serveur. Le
  // bouton qui valide demande donc confirmation — cinq choix d'un coup, sans
  // retour, méritent un deuxième geste.
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");

  const ready = cloud.configured && Boolean(cloud.userId);

  useEffect(() => {
    if (ready) void cloudStore.loadArena();
  }, [ready]);

  const draftWindow = arenaDraftWindow(now);
  // Quand le serveur a parlé, c'est lui qui tranche : la fenêtre locale ne sert
  // qu'à afficher le compte à rebours et à dire quand ça ouvre (avant le premier
  // chargement, et pour un joueur sans compte).
  const draftOpen = cloud.arenaMine ? cloud.arenaMine.draftOpen : draftWindow.open;

  // Les propositions du draft ne se demandent que quand la fenêtre est ouverte
  // et qu'aucun choix n'est encore enregistré.
  const needsDraft = ready && draftOpen && !cloud.arenaMine?.draft && !cloud.arenaDraftSlots;
  useEffect(() => {
    if (needsDraft) void cloudStore.loadDraftSlots();
  }, [needsDraft]);

  // Le direct frais seulement : un direct périmé ne vaut rien, et l'écran ne
  // doit pas laisser croire le contraire.
  const liveLogins = useMemo(() => {
    const set = new Set<string>();
    if (live.stale) return set;
    for (const login of live.byLogin.keys()) set.add(login);
    return set;
  }, [live]);

  const viewersOf = useCallback(
    (creator: Creator | undefined) =>
      !creator || live.stale ? 0 : (live.byLogin.get(creator.login)?.viewers ?? 0),
    [live],
  );

  const owned = useMemo(() => (state ? ownedSlugs(state) : new Set<string>()), [state]);

  // Mes cartes : les créateurs en direct d'abord, puis la rareté, puis l'ordre
  // alphabétique. Le composeur met devant ce qui compte — l'instant.
  const creators = useMemo(() => {
    const list: Creator[] = [];
    for (const slug of owned) {
      const creator = CREATOR_BY_SLUG.get(slug);
      if (creator) list.push(creator);
    }
    list.sort((a, b) => {
      const viewers = viewersOf(b) - viewersOf(a);
      if (viewers !== 0) return viewers;
      const rarity = RARITY_META[a.rarity].order - RARITY_META[b.rarity].order;
      if (rarity !== 0) return rarity;
      return a.displayName.localeCompare(b.displayName, "fr");
    });
    return list;
  }, [owned, viewersOf]);

  const problems = useMemo(
    () => arenaLineupProblems(lineup, { owned, liveLogins }),
    [lineup, owned, liveLogins],
  );
  const preview = useMemo(() => {
    const map = new Map<string, number>();
    if (!live.stale) for (const [login, stream] of live.byLogin) map.set(login, stream.viewers);
    return arenaScore(lineup, map);
  }, [lineup, live]);

  const act = useCallback(async (run: () => Promise<CloudActionOutcome>) => {
    setBusy(true);
    const result = await run();
    if (result.message) setNotice({ message: result.message, isError: result.status !== "done" });
    setBusy(false);
  }, []);

  const mine = cloud.arenaMine;
  const board = cloud.arena;
  const week = mine?.week ?? arenaWeekKey(now);
  const entry = mine?.entry ?? null;
  const endsAt = board?.endsAt ?? null;

  /** Coche ou décoche une carte du composeur (cinq au maximum). */
  const toggle = useCallback((slug: string) => {
    setLineup((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= ARENA_LINEUP_SIZE) return current;
      return [...current, slug];
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? creators.filter((creator) => creator.displayName.toLowerCase().includes(needle))
      : creators;
    // Cent vingt lignes : au-delà, c'est la recherche qui sert.
    return list.slice(0, 120);
  }, [creators, query]);

  const draftSlots = cloud.arenaDraftSlots ?? [];
  const draftLineup = arenaDraftLineup(draftSlots.length, draft);
  const draftReady = draftSlots.length > 0 && draftLineup.length === draftSlots.length;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Arène">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>
            <Swords size={18} /> Arène
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {notice ? (
          <div className={`account-note ${notice.isError ? "error" : "ok"}`}>
            {notice.isError ? <AlertTriangle size={15} /> : <Info size={15} />}
            <span>{notice.message}</span>
          </div>
        ) : null}

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>{connecteToi("L'Arène")}</strong>
              <span>
                Le score, c&apos;est la somme des viewers réels : il faut être en ligne pour savoir
                qui streame à cet instant.
              </span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Connecte-toi pour entrer dans l&apos;arène</strong>
              <span>
                Cinq cartes, au plus une Légendaire, au moins un créateur en direct. Le classement se
                referme le <b>lundi à 6 h UTC</b> ({ARENA_MAX_LEGENDARY} Légendaire maximum ; hors
                direct, une carte vaut zéro).
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ---------------------- Ma semaine ---------------------- */}
            <section className="arena-week">
              <div className="arena-week-head">
                <span className="arena-week-key">{arenaWeekLabel(week)}</span>
                {endsAt ? (
                  <span className="arena-week-left">
                    <CalendarClock size={13} />
                    fini dans {formatLeft(Date.parse(endsAt) - now)}
                  </span>
                ) : null}
              </div>

              {entry ? (
                <div className="arena-entry">
                  <div className="arena-entry-score">
                    <strong>{entry.score.toLocaleString("fr-FR")}</strong>
                    <span>viewers</span>
                  </div>
                  <div className="arena-entry-meta">
                    <span className="arena-rank">
                      <Crown size={13} />
                      {mine?.rank ? (
                        <>
                          {arenaRankLabel(mine.rank)} sur {board?.rows.length ?? "?"}
                        </>
                      ) : (
                        "rang en cours"
                      )}
                    </span>
                    <span className="arena-entry-lineup">{lineupLabel(entry.lineup)}</span>
                    <span className="arena-entry-live">
                      {entry.liveCount} carte{entry.liveCount > 1 ? "s" : ""} en direct au moment du
                      dépôt
                    </span>
                  </div>
                </div>
              ) : (
                <p className="arena-empty">
                  Aucune arène déposée cette semaine. Choisis cinq cartes : il en faut au moins une
                  dont le créateur streame maintenant — c&apos;est elle qui fait le score.
                </p>
              )}

              {/* ---------- Les récompenses qui attendent ---------- */}
              {mine?.pending.length ? (
                <div className="arena-pending">
                  {mine.pending.map((reward) => (
                    <div key={reward.week} className="arena-pending-row">
                      <div>
                        <strong>{arenaWeekLabel(reward.week)}</strong>
                        <span>
                          {arenaRankLabel(reward.rank)} · +{arenaHourglasses(reward.rank)} sablier
                          {arenaHourglasses(reward.rank) > 1 ? "s" : ""}
                          {arenaEmblemEarned(reward.rank) ? " · emblème d'arène" : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(() => cloudStore.claimArena(reward.week))}
                      >
                        Encaisse
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {!draftOpen ? (
                <button
                  type="button"
                  className="arena-compose-open"
                  onClick={() => setComposing((open) => !open)}
                >
                  <Swords size={15} />
                  {composing ? "Fermer le composeur" : entry ? "Changer mon arène" : "Composer mon arène"}
                </button>
              ) : null}
            </section>

            {/* ---------------------- Le composeur ---------------------- */}
            {composing && !draftOpen ? (
              <section className="arena-composer">
                <div className="arena-slots">
                  {Array.from({ length: ARENA_LINEUP_SIZE }, (_, index) => {
                    const slug = lineup[index];
                    const creator = slug ? CREATOR_BY_SLUG.get(slug) : undefined;
                    const viewers = viewersOf(creator);
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`arena-slot${slug ? " filled" : ""}${viewers > 0 ? " live" : ""}`}
                        disabled={!slug}
                        onClick={() => slug && toggle(slug)}
                        aria-label={
                          creator ? `Retirer ${creator.displayName}` : `Emplacement ${index + 1}`
                        }
                      >
                        {creator ? (
                          <>
                            <b>{creator.displayName}</b>
                            <span>
                              {viewers > 0
                                ? `${viewers.toLocaleString("fr-FR")} viewers`
                                : "hors direct"}
                            </span>
                          </>
                        ) : (
                          <span className="arena-slot-empty">{index + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="arena-composer-score">
                  <Flame size={14} />
                  <span>
                    {preview.total.toLocaleString("fr-FR")} viewers · {preview.liveCount} en direct
                  </span>
                  <span className="arena-composer-rule">
                    max {ARENA_MAX_LEGENDARY} Légendaire · au moins 1 en direct
                  </span>
                </div>

                {problems.length > 0 ? (
                  <ul className="arena-problems">
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="arena-ready">
                    Arène recevable : le serveur recalculera le score à l&apos;envoi.
                  </p>
                )}

                <div className="arena-search">
                  <Search size={14} />
                  <input
                    type="search"
                    value={query}
                    placeholder="Chercher dans mon classeur"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button type="button" onClick={() => setQuery("")} aria-label="Effacer">
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="arena-picker">
                  {filtered.map((creator) => {
                    const chosen = lineup.includes(creator.slug);
                    const viewers = viewersOf(creator);
                    return (
                      <button
                        key={creator.slug}
                        type="button"
                        className={`arena-pick${chosen ? " chosen" : ""}${viewers > 0 ? " live" : ""}`}
                        onClick={() => toggle(creator.slug)}
                        aria-pressed={chosen}
                      >
                        <b>{creator.displayName}</b>
                        <span>{RARITY_META[creator.rarity].label}</span>
                        {viewers > 0 ? <em>{viewers.toLocaleString("fr-FR")}</em> : null}
                      </button>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <p className="arena-empty">
                      Rien trouvé. Ouvre des boosters : le classeur se remplit.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="arena-submit"
                  disabled={busy || problems.length > 0}
                  onClick={() =>
                    void act(async () => {
                      const result = await cloudStore.submitArena(lineup);
                      if (result.status === "done") {
                        setComposing(false);
                        setLineup([]);
                      }
                      return result;
                    })
                  }
                >
                  <Swords size={15} />
                  {busy ? "Dépôt…" : "Déposer mon arène"}
                </button>
              </section>
            ) : null}

            {/* ---------------------- Le draft ---------------------- */}
            <section className={`arena-draft${draftOpen ? " open" : ""}`}>
              <div className="arena-draft-head">
                <h3>
                  <Shuffle size={15} /> Draft du week-end
                </h3>
                <span>
                  {draftOpen
                    ? `ouvert — se referme dans ${formatLeft(draftWindow.closesAt - now)}`
                    : `ouvre ${formatMoment(draftWindow.opensAt)}`}
                </span>
              </div>

              {!draftOpen ? (
                <p className="arena-empty">
                  Samedi, la même arène se joue autrement : cinq emplacements, trois propositions
                  chacun, une seule à garder. Quarante-huit heures pour décider.
                </p>
              ) : mine?.draft ? (
                <div className="arena-draft-done">
                  <span>
                    <b>Draft enregistré</b>
                    {lineupLabel(mine.draft.picks)}
                  </span>
                  <span className="arena-draft-once">Un draft par semaine, définitif.</span>
                </div>
              ) : cloud.arenaDraftSlots ? (
                <>
                  <div className="arena-draft-slots">
                    {draftSlots.map((slot, index) => (
                      <div key={index} className="arena-draft-slot">
                        <span className="arena-draft-number">{index + 1}</span>
                        {slot.map((slug) => {
                          const creator = CREATOR_BY_SLUG.get(slug);
                          const chosen = draft[index] === slug;
                          const viewers = viewersOf(creator);
                          return (
                            <button
                              key={slug}
                              type="button"
                              className={`arena-draft-choice${chosen ? " chosen" : ""}${
                                viewers > 0 ? " live" : ""
                              }`}
                              aria-pressed={chosen}
                              onClick={() =>
                                setDraft((current) => arenaDraftChoose(current, index, slug))
                              }
                            >
                              <b>{creator?.displayName ?? slug}</b>
                              {creator ? <span>{RARITY_META[creator.rarity].label}</span> : null}
                              {viewers > 0 ? <em>{viewers.toLocaleString("fr-FR")}</em> : null}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="arena-draft-note">
                    Les propositions viennent de ton classeur ({ARENA_DRAFT_CHOICES} par
                    emplacement). Une seule carte par emplacement — l&apos;arène du week-end est
                    celle-là, et elle sera déposée d&apos;un coup.
                  </p>
                  {confirming ? (
                    <div className="arena-draft-confirm">
                      <span>
                        Un draft par semaine : ces {draftSlots.length} cartes deviennent ton arène,
                        et on n&apos;y revient pas cette semaine.
                      </span>
                      <div>
                        <button
                          type="button"
                          className="arena-submit"
                          disabled={busy}
                          onClick={() =>
                            void act(async () => {
                              const result = await cloudStore.pickDraft(
                                arenaDraftLineup(draftSlots.length, draft),
                              );
                              if (result.status === "done") {
                                setDraft({});
                                setConfirming(false);
                              }
                              return result;
                            })
                          }
                        >
                          <Shuffle size={15} />
                          {busy ? "Enregistrement…" : "Confirmer"}
                        </button>
                        <button
                          type="button"
                          className="arena-compose-open ghost"
                          disabled={busy}
                          onClick={() => setConfirming(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="arena-submit"
                      disabled={busy || !draftReady}
                      onClick={() => setConfirming(true)}
                    >
                      <Shuffle size={15} />
                      {`Valider mes ${draftSlots.length} choix`}
                    </button>
                  )}
                </>
              ) : (
                <div className="arena-draft-retry">
                  <p className="arena-empty">
                    {cloud.arenaDraftBusy
                      ? "Tirage des propositions…"
                      : "Le tirage n'est pas passé. Réessaie dans un instant."}
                  </p>
                  {!cloud.arenaDraftBusy ? (
                    <button
                      type="button"
                      onClick={() => void cloudStore.loadDraftSlots()}
                      disabled={busy}
                    >
                      <RefreshCw size={14} /> Réessayer
                    </button>
                  ) : null}
                </div>
              )}
            </section>

            {/* ---------------------- Le classement ---------------------- */}
            <section className="arena-board">
              <div className="arena-board-head">
                <h3>
                  <Trophy size={15} /> Classement de la semaine
                </h3>
                <button
                  type="button"
                  onClick={() => void cloudStore.loadArena()}
                  disabled={cloud.arenaBusy}
                  aria-label="Rafraîchir"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              {board && board.rows.length > 0 ? (
                <ol className="arena-rows">
                  {board.rows.slice(0, 20).map((row) => (
                    <li key={row.userId} className={row.userId === cloud.userId ? "me" : undefined}>
                      <span className="arena-row-rank">{row.rank}</span>
                      <span className="arena-row-name">
                        {row.displayName}
                        <em>{lineupLabel(row.lineup)}</em>
                      </span>
                      <span className="arena-row-score">
                        {row.score.toLocaleString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="arena-empty">
                  Personne n&apos;a encore déposé d&apos;arène cette semaine. La place est libre.
                </p>
              )}
              <p className="arena-rules">
                {ARENA_LINEUP_SIZE} cartes · {ARENA_MAX_LEGENDARY} Légendaire maximum · au moins un
                créateur en direct. Le score est la somme des viewers réels : hors direct, une carte
                vaut zéro. La semaine va du <b>lundi 6 h UTC</b> au lundi suivant, et son classement
                est figé à la fermeture. Récompenses : 5 sabliers au 1er, 3 au 2e, 2 au 3e, 1 aux
                dix premiers — et l&apos;emblème d&apos;arène à encaisser pour une semaine finie dans
                le top {ARENA_EMBLEM_TOP}.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

