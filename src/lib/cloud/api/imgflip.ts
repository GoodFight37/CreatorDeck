import type { CloudCore } from "./core";
import { CloudError } from "./core";

export type ImgflipStatus = {
  stock: number;
  nextAt: string | null;
  openings: number;
  owned: { id: string; copies: number }[];
};

export type ImgflipOpening = {
  cards: string[];
  stock: number;
  nextAt: string | null;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CloudError("Réponse des cartes Imgflip illisible. Réessaie.", "invalid_response", 0);
  }
  return value as Record<string, unknown>;
}

function stock(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    throw new CloudError("Réserve Imgflip illisible. Réessaie.", "invalid_response", 0);
  }
  return value;
}

function nextAt(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

export async function imgflipStatus(core: CloudCore): Promise<ImgflipStatus> {
  const response = record(await core.rpc("imgflip_status", {}));
  if (!Array.isArray(response.owned) || typeof response.openings !== "number") {
    throw new CloudError("Collection Imgflip illisible. Réessaie.", "invalid_response", 0);
  }
  const owned = response.owned.map((item) => {
    const entry = record(item);
    if (typeof entry.id !== "string" || !Number.isInteger(entry.copies) || Number(entry.copies) < 1) {
      throw new CloudError("Collection Imgflip illisible. Réessaie.", "invalid_response", 0);
    }
    return { id: entry.id, copies: Number(entry.copies) };
  });
  return { stock: stock(response.stock), nextAt: nextAt(response.next_at), openings: response.openings, owned };
}

export async function openImgflipPack(core: CloudCore, requestId: string): Promise<ImgflipOpening> {
  const response = record(await core.rpc("open_imgflip_pack", { p_request_id: requestId }));
  if (!Array.isArray(response.cards) || response.cards.length !== 5
    || !response.cards.every((id) => typeof id === "string")
    || new Set(response.cards).size !== 5) {
    throw new CloudError("Le booster Imgflip est incomplet. Recharge la collection.", "invalid_response", 0);
  }
  return {
    cards: response.cards as string[],
    stock: stock(response.stock),
    nextAt: nextAt(response.next_at),
    replayed: response.replayed === true,
  };
}
