/**
 * Aléa cryptographique portable (navigateur, WebView Capacitor, Node ≥ 20).
 *
 * On n'utilise volontairement pas `node:crypto` : le moteur de jeu tourne sur
 * l'appareil, dans un export statique Next.js. `globalThis.crypto` est
 * disponible partout où l'app s'exécute.
 */

function webCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("Web Crypto API indisponible dans cet environnement.");
  }
  return c;
}

/**
 * Entier uniforme dans [0, maxExclusive). Échantillonnage par rejet pour
 * éviter le biais du modulo.
 */
export function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`randomInt: borne invalide (${maxExclusive}).`);
  }
  if (maxExclusive === 1) return 0;
  const buffer = new Uint32Array(1);
  const range = 0x1_0000_0000; // 2^32
  const limit = range - (range % maxExclusive);
  let value: number;
  do {
    webCrypto().getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % maxExclusive;
}

/**
 * UUID v4. `crypto.randomUUID` n'existe qu'en contexte sécurisé (https,
 * localhost, WebView Capacitor) ; on retombe sinon sur `getRandomValues`.
 */
export function randomUUID(): string {
  const c = webCrypto();
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
