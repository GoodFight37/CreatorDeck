/**
 * Réparer un texte arrivé « doublement encodé ».
 *
 * Les migrations Supabase sont des fichiers UTF-8, et ils partaient à la main
 * par la console. Sous Windows, `curl.exe ... | Set-Clipboard` fait passer les
 * octets par la page de codes de la console : « scène » (deux octets UTF-8)
 * devient « sc├¿ne » (ces deux octets relus en CP850) avant même d'atteindre la
 * base. Elle garde alors ces caractères-là, et l'application les afficherait
 * tels quels au joueur — c'est arrivé : « paquet sc├¿ne : ton paquet du jour
 * est d├⌐j├á ouvert ». (Depuis que les migrations passent par
 * `npx supabase db push`, le fichier ne traverse plus aucune console : la
 * réparation reste là pour les textes déjà en base.)
 *
 * La transformation est **réversible** : il suffit de repasser chaque caractère
 * par sa valeur CP850, puis de relire les octets obtenus en UTF-8. La table
 * ci-dessous est l'inverse de CP850 pour les octets 0x80 à 0xFF.
 *
 * Deux garde-fous, parce qu'un nom propre n'est pas un texte cassé :
 *
 *   - un texte **déjà propre** n'est jamais touché. « Álvaro » donne des octets
 *     qui ne forment pas de l'UTF-8 valide : on rend la chaîne d'origine.
 *   - un texte **sans caractère accentué** traverse tel quel : la plupart des
 *     messages (« paquet scène » mis à part) sont déjà en ASCII.
 *
 * Ce module est pur, donc testé : `src/lib/cloud/mojibake.test.ts`, avec la
 * phrase exacte relevée dans l'application.
 */

/** Octet CP850 de chaque caractère non-ASCII de la page de codes. */
const CP850_BYTE: Record<string, number> = {
  "\u00c7": 128,
  "\u00fc": 129,
  "\u00e9": 130,
  "\u00e2": 131,
  "\u00e4": 132,
  "\u00e0": 133,
  "\u00e5": 134,
  "\u00e7": 135,
  "\u00ea": 136,
  "\u00eb": 137,
  "\u00e8": 138,
  "\u00ef": 139,
  "\u00ee": 140,
  "\u00ec": 141,
  "\u00c4": 142,
  "\u00c5": 143,
  "\u00c9": 144,
  "\u00e6": 145,
  "\u00c6": 146,
  "\u00f4": 147,
  "\u00f6": 148,
  "\u00f2": 149,
  "\u00fb": 150,
  "\u00f9": 151,
  "\u00ff": 152,
  "\u00d6": 153,
  "\u00dc": 154,
  "\u00f8": 155,
  "\u00a3": 156,
  "\u00d8": 157,
  "\u00d7": 158,
  "\u0192": 159,
  "\u00e1": 160,
  "\u00ed": 161,
  "\u00f3": 162,
  "\u00fa": 163,
  "\u00f1": 164,
  "\u00d1": 165,
  "\u00aa": 166,
  "\u00ba": 167,
  "\u00bf": 168,
  "\u00ae": 169,
  "\u00ac": 170,
  "\u00bd": 171,
  "\u00bc": 172,
  "\u00a1": 173,
  "\u00ab": 174,
  "\u00bb": 175,
  "\u2591": 176,
  "\u2592": 177,
  "\u2593": 178,
  "\u2502": 179,
  "\u2524": 180,
  "\u00c1": 181,
  "\u00c2": 182,
  "\u00c0": 183,
  "\u00a9": 184,
  "\u2563": 185,
  "\u2551": 186,
  "\u2557": 187,
  "\u255d": 188,
  "\u00a2": 189,
  "\u00a5": 190,
  "\u2510": 191,
  "\u2514": 192,
  "\u2534": 193,
  "\u252c": 194,
  "\u251c": 195,
  "\u2500": 196,
  "\u253c": 197,
  "\u00e3": 198,
  "\u00c3": 199,
  "\u255a": 200,
  "\u2554": 201,
  "\u2569": 202,
  "\u2566": 203,
  "\u2560": 204,
  "\u2550": 205,
  "\u256c": 206,
  "\u00a4": 207,
  "\u00f0": 208,
  "\u00d0": 209,
  "\u00ca": 210,
  "\u00cb": 211,
  "\u00c8": 212,
  "\u0131": 213,
  "\u00cd": 214,
  "\u00ce": 215,
  "\u00cf": 216,
  "\u2518": 217,
  "\u250c": 218,
  "\u2588": 219,
  "\u2584": 220,
  "\u00a6": 221,
  "\u00cc": 222,
  "\u2580": 223,
  "\u00d3": 224,
  "\u00df": 225,
  "\u00d4": 226,
  "\u00d2": 227,
  "\u00f5": 228,
  "\u00d5": 229,
  "\u00b5": 230,
  "\u00fe": 231,
  "\u00de": 232,
  "\u00da": 233,
  "\u00db": 234,
  "\u00d9": 235,
  "\u00fd": 236,
  "\u00dd": 237,
  "\u00af": 238,
  "\u00b4": 239,
  "\u00ad": 240,
  "\u00b1": 241,
  "\u2017": 242,
  "\u00be": 243,
  "\u00b6": 244,
  "\u00a7": 245,
  "\u00f7": 246,
  "\u00b8": 247,
  "\u00b0": 248,
  "\u00a8": 249,
  "\u00b7": 250,
  "\u00b9": 251,
  "\u00b3": 252,
  "\u00b2": 253,
  "\u25a0": 254,
  "\u00a0": 255,
};

const decoder = new TextDecoder("utf-8", { fatal: true });

/** Vrai si le texte contient au moins un caractère non-ASCII. */
function hasHighChar(text: string): boolean {
  for (const char of text) {
    if (char.codePointAt(0)! > 127) return true;
  }
  return false;
}

/**
 * Rend le texte lisible s'il a été encodé en UTF-8 puis relu en CP850.
 *
 * Un texte qui n'a pas souffert de ce voyage revient **inchangé**, à l'octet
 * près : c'est une réparation, pas une normalisation.
 */
export function repairMojibake(text: string): string {
  if (!text || !hasHighChar(text)) return text;

  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 128) {
      bytes.push(code);
      continue;
    }
    const byte = CP850_BYTE[char];
    // Un caractère absent de CP850 n'a pas pu être produit par ce voyage.
    if (byte === undefined) return text;
    bytes.push(byte);
  }

  try {
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    // Pas de l'UTF-8 valide : le texte était propre, on le laisse tranquille.
    return text;
  }
}
