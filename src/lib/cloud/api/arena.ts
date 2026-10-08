import type { CloudCore } from "./core";
import type { ArenaBoard, ArenaClaim, ArenaDeposit, ArenaMine } from "./types";
import { CloudError, asRecord } from "./core";

/**
 * Dépose une arène (cinq slugs alignés).
 *
 * Le score n'est pas envoyé : c'est le serveur qui le calcule, à partir du
 * direct frais qu'il connaît. Le client ne peut donc pas s'inventer un score
 * — il choisit cinq cartes, et c'est tout.
 */
export async function arenaSubmit(core: CloudCore, lineup: string[]): Promise<ArenaDeposit> {
  const result = await core.rpc("arena_submit", { p_lineup: lineup });
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse de l'arène illisible.", "invalid_response", 0);
  return {
    week: String(record.week ?? ""),
    score: Number(record.score ?? 0),
    liveCount: Number(record.live_count ?? 0),
    best: Number(record.best ?? 0),
    kept: record.kept === true,
  };
}

/** Mon arène de la semaine : dépôt, rang, draft, récompenses en attente. */
export async function arenaMe(core: CloudCore): Promise<ArenaMine> {
  const result = await core.rpc("arena_me", {});
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse de l'arène illisible.", "invalid_response", 0);
  const entry = asRecord(record.entry);
  const draft = asRecord(record.draft);
  return {
    week: String(record.week ?? ""),
    draftOpen: record.draft_open === true,
    rank: Number.isFinite(Number(record.rank)) ? Number(record.rank) : null,
    entry: entry
      ? {
          lineup: Array.isArray(entry.lineup) ? entry.lineup.map(String) : [],
          score: Number(entry.score ?? 0),
          liveCount: Number(entry.live_count ?? 0),
          submittedAt: String(entry.submitted_at ?? ""),
        }
      : null,
    draft: draft ? { picks: Array.isArray(draft.picks) ? draft.picks.map(String) : [] } : null,
    claims: Array.isArray(record.claims)
      ? record.claims.map((claim) => {
          const item = asRecord(claim);
          return {
            week: String(item?.week ?? ""),
            rank: item?.rank === null || item?.rank === undefined ? null : Number(item.rank),
            hourglasses: Number(item?.hourglasses ?? 0),
            emblem: item?.emblem === true,
          };
        })
      : [],
    pending: Array.isArray(record.pending)
      ? record.pending
          .map((row) => asRecord(row))
          .filter((row): row is Record<string, unknown> => Boolean(row))
          .map((row) => ({ week: String(row.week ?? ""), rank: Number(row.rank ?? 0) }))
      : [],
  };
}

/** Le classement d'une semaine (`null` = la semaine en cours). */
export async function arenaLeaderboard(core: CloudCore, week?: string | null): Promise<ArenaBoard> {
  const result = await core.rpc("arena_leaderboard", week ? { p_week: week } : {});
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse de l'arène illisible.", "invalid_response", 0);
  const rows = Array.isArray(record.rows) ? record.rows : [];
  return {
    week: String(record.week ?? ""),
    endsAt: String(record.endsAt ?? ""),
    draftOpen: record.draft_open === true,
    rows: rows.map((row) => {
      const item = asRecord(row);
      return {
        userId: String(item?.userId ?? ""),
        displayName: String(item?.displayName ?? "Collectionneur"),
        score: Number(item?.score ?? 0),
        liveCount: Number(item?.liveCount ?? 0),
        lineup: Array.isArray(item?.lineup) ? item.lineup.map(String) : [],
        rank: Number(item?.rank ?? 0),
      };
    }),
  };
}

/**
 * Réclame la récompense d'une semaine terminée.
 *
 * Le serveur répond une seule fois `hourglasses > 0` : les sabliers sont
 * crédités par l'appareil (comme les points et l'XP), mais le fait de les
 * avoir reçus est enregistré côté serveur — deux appareils ne peuvent pas
 * toucher deux fois la même semaine.
 */
export async function arenaClaim(core: CloudCore, week: string): Promise<ArenaClaim> {
  const result = await core.rpc("arena_claim", { p_week: week });
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse de l'arène illisible.", "invalid_response", 0);
  return {
    week: String(record.week ?? week),
    alreadyClaimed: record.claimed === true,
    rank: record.rank === null || record.rank === undefined ? null : Number(record.rank),
    hourglasses: Number(record.hourglasses ?? 0),
    emblem: record.emblem === true,
  };
}

/** Les quinze propositions du draft du week-end (cinq emplacements de trois). */
export async function arenaDraftChoices(core: CloudCore): Promise<{ week: string; slots: string[][] }> {
  const result = await core.rpc("arena_draft_choices", {});
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse du draft illisible.", "invalid_response", 0);
  return {
    week: String(record.week ?? ""),
    slots: Array.isArray(record.slots)
      ? record.slots.map((slot) => (Array.isArray(slot) ? slot.map(String) : []))
      : [],
  };
}

/** Enregistre les cinq choix du draft : ils deviennent l'arène de la semaine. */
export async function arenaDraftPick(core: CloudCore, lineup: string[]): Promise<ArenaDeposit> {
  const result = await core.rpc("arena_draft_pick", { p_lineup: lineup });
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse du draft illisible.", "invalid_response", 0);
  return {
    week: String(record.week ?? ""),
    score: Number(record.score ?? 0),
    liveCount: Number(record.live_count ?? 0),
    best: Number(record.score ?? 0),
    kept: false,
  };
}
