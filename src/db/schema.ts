import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id").primaryKey(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  points: integer("points").notNull().default(120),
  hourglasses: integer("hourglasses").notNull().default(12),
  livePacks: integer("live_packs").notNull().default(2),
  archivePacks: integer("archive_packs").notNull().default(1),
  lastLiveRegen: timestamp("last_live_regen", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastArchiveRegen: timestamp("last_archive_regen", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const playerCards = pgTable(
  "player_cards",
  {
    id: uuid("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    creatorSlug: text("creator_slug").notNull(),
    rarity: text("rarity").notNull(),
    variant: text("variant").notNull(),
    obtainedAt: timestamp("obtained_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("player_cards_player_idx").on(table.playerId),
    index("player_cards_creator_idx").on(table.creatorSlug),
  ],
);

export const packOpenings = pgTable(
  "pack_openings",
  {
    id: uuid("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    packType: text("pack_type").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pack_openings_player_key_unique").on(
      table.playerId,
      table.idempotencyKey,
    ),
    index("pack_openings_player_idx").on(table.playerId),
  ],
);
