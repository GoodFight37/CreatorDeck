import { GameError, spendHourglass } from "@/lib/game-service";
import { resolvePlayerId } from "@/lib/player-session";
import type { PackType } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { packType?: unknown };
    if (body.packType !== "live" && body.packType !== "archive") {
      throw new GameError("Type de booster invalide.", 400, "INVALID_PACK");
    }
    const playerId = await resolvePlayerId();
    const result = await spendHourglass(playerId, body.packType as PackType);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const code = error instanceof GameError ? error.code : "INTERNAL_ERROR";
    const message =
      error instanceof GameError
        ? error.message
        : "Impossible d'utiliser un sablier pour le moment.";
    return Response.json({ error: message, code }, { status });
  }
}
