import { GameError, openPack } from "@/lib/game-service";
import { resolvePlayerId } from "@/lib/player-session";
import type { PackType } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      packType?: unknown;
      idempotencyKey?: unknown;
    };
    if (body.packType !== "live" && body.packType !== "archive") {
      throw new GameError("Type de booster invalide.", 400, "INVALID_PACK");
    }
    if (
      typeof body.idempotencyKey !== "string" ||
      body.idempotencyKey.length < 12 ||
      body.idempotencyKey.length > 100 ||
      !/^[a-zA-Z0-9-]+$/.test(body.idempotencyKey)
    ) {
      throw new GameError(
        "Clé d'ouverture invalide.",
        400,
        "INVALID_IDEMPOTENCY_KEY",
      );
    }

    const playerId = await resolvePlayerId();
    const result = await openPack(
      playerId,
      body.packType as PackType,
      body.idempotencyKey,
    );
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const code = error instanceof GameError ? error.code : "INTERNAL_ERROR";
    const message =
      error instanceof GameError
        ? error.message
        : "L'ouverture a échoué. Aucun booster n'a été consommé.";
    return Response.json({ error: message, code }, { status });
  }
}
