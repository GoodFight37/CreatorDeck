import { getGameState, GameError } from "@/lib/game-service";
import { resolvePlayerId } from "@/lib/player-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const playerId = await resolvePlayerId();
    const state = await getGameState(playerId);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const message =
      error instanceof GameError
        ? error.message
        : "Impossible de charger la partie pour le moment.";
    return Response.json({ error: message }, { status });
  }
}
