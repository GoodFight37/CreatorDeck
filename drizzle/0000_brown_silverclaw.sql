CREATE TABLE "pack_openings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"pack_type" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"creator_slug" text NOT NULL,
	"rarity" text NOT NULL,
	"variant" text NOT NULL,
	"obtained_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 120 NOT NULL,
	"hourglasses" integer DEFAULT 12 NOT NULL,
	"live_packs" integer DEFAULT 2 NOT NULL,
	"archive_packs" integer DEFAULT 1 NOT NULL,
	"last_live_regen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_archive_regen" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pack_openings" ADD CONSTRAINT "pack_openings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_cards" ADD CONSTRAINT "player_cards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pack_openings_player_key_unique" ON "pack_openings" USING btree ("player_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "pack_openings_player_idx" ON "pack_openings" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_cards_player_idx" ON "player_cards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_cards_creator_idx" ON "player_cards" USING btree ("creator_slug");