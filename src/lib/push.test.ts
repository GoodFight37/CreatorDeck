/**
 * Les notifications côté appareil, vues d'un poste sans téléphone.
 *
 * Ce qui se teste ici : les **décisions** de `src/lib/push.ts` — un appareil
 * sans greffon ne peut rien promettre, un stockage refusé ne casse rien, un
 * jeton ne se perd pas. Ce qui ne se teste pas : la permission Android et
 * Firebase, qui demandent un vrai téléphone (voir le carnet, interrupteur
 * « Directs de ma collection »).
 */
import { describe, expect, it } from "vitest";
import {
  PUSH_TOKEN_KEY,
  pushSupported,
  readPushToken,
  requestPushToken,
  writePushToken,
} from "@/lib/push";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("notifications de direct (côté appareil)", () => {
  it("n'existe pas hors de l'application Android", async () => {
    expect(pushSupported()).toBe(false);
    const result = await requestPushToken();
    expect(result.status).toBe("refusal");
    if (result.status === "refusal") {
      expect(result.reason).toBe("absent");
      // La phrase est montrée à l'écran : elle ne parle pas de greffon.
      expect(result.message).toContain("Android");
    }
  });

  it("garde le jeton de cet appareil dans le stockage local", () => {
    const storage = fakeStorage();
    expect(readPushToken(storage)).toBeNull();
    writePushToken(storage, "fcm-jeton-de-test");
    expect(storage.map.get(PUSH_TOKEN_KEY)).toBe("fcm-jeton-de-test");
    expect(readPushToken(storage)).toBe("fcm-jeton-de-test");
    writePushToken(storage, null);
    expect(readPushToken(storage)).toBeNull();
    expect(storage.map.has(PUSH_TOKEN_KEY)).toBe(false);
  });

  it("survit à un stockage refusé (navigation privée, quota)", () => {
    const broken = {
      getItem: () => {
        throw new Error("refusé");
      },
      setItem: () => {
        throw new Error("refusé");
      },
      removeItem: () => {
        throw new Error("refusé");
      },
    };
    expect(readPushToken(broken)).toBeNull();
    expect(() => writePushToken(broken, "fcm-jeton")).not.toThrow();
    expect(readPushToken(null)).toBeNull();
    expect(() => writePushToken(null, "fcm-jeton")).not.toThrow();
  });
});
