/**
 * L'affiche de partage d'un profil : une image fabriquée **sur l'appareil**,
 * sans serveur.
 *
 * Pourquoi pas une « Open Graph image » : il faudrait un serveur qui la génère
 * à la demande — impossible ici (l'application est un export statique dans
 * l'APK). Le canvas du WebView sait très bien le faire, et l'avantage est le
 * même : le joueur partage une image qui montre sa vitrine, pas une capture
 * d'écran approximative.
 *
 * Le module est coupé en deux :
 *   * `posterModel()` / `posterFileName()` — **purs**, testés, c'est là que se
 *     trouvent les textes et les chiffres de l'affiche ;
 *   * `drawPoster()` — le dessin, qui n'a de sens qu'à l'écran (et qu'une image
 *     relue par un œil humain vaut mieux qu'un test sur un canvas simulé).
 */
import {
  CREATOR_BY_SLUG,
  RARITY_META,
  creatorImage,
  type Rarity,
} from "@/lib/catalog";
import type { PlayerProfile } from "@/lib/cloud/api";

/** Format 4:5, celui qui passe partout (Discord, X, Instagram). */
export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350;

export type PosterCard = {
  slug: string;
  displayName: string;
  rarityLabel: string;
  color: string;
  /** Chemin du portrait, pré-encodé à la taille utile (600×600). */
  image: string;
};

export type PosterModel = {
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  rarity: { label: string; value: string; ratio: number; color: string }[];
  cards: PosterCard[];
  footer: string;
};

/** Un entier à la française : `1234` → `1 234`. */
function count(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

/**
 * Une part, à la française : `0.1234` → `12,3 %`. Une décimale est utile ici —
 * « 13 % » et « 13,7 % » ne racontent pas la même progression — sauf à 100 %,
 * où la décimale ne veut plus rien dire.
 */
function percent(ratio: number): string {
  const value = Math.max(0, Math.min(1, ratio)) * 100;
  if (value >= 99.95) return "100 %";
  return `${value.toFixed(1).replace(".", ",")} %`;
}

/**
 * Le texte et les chiffres de l'affiche. Tout vient du profil renvoyé par le
 * serveur : l'affiche ne recalcule rien, sinon elle pourrait raconter autre
 * chose que la fiche publique.
 */
export function posterModel(profile: PlayerProfile): PosterModel {
  const cards: PosterCard[] = profile.showcaseSlugs.flatMap((slug) => {
    const creator = CREATOR_BY_SLUG.get(slug);
    if (!creator) return [];
    const rarity = RARITY_META[creator.rarity];
    return [
      {
        slug: creator.slug,
        displayName: creator.displayName,
        rarityLabel: rarity.label,
        color: rarity.color,
        image: creatorImage(creator),
      },
    ];
  });

  const rank = profile.rankCompletion;
  const subtitle = profile.verified
    ? `${count(profile.uniqueCreators)} créateurs sur ${count(profile.catalogSize)} · ${percent(profile.completion)}`
    : "Collection en cours de vérification";

  return {
    title: profile.displayName,
    subtitle,
    stats: [
      { label: "Complétion", value: percent(profile.completion) },
      { label: "Cartes", value: count(profile.totalCards) },
      { label: "Créateurs uniques", value: count(profile.uniqueCreators) },
      { label: "Légendaires", value: count(profile.legendaryCards) },
      { label: "Gold", value: count(profile.goldCards) },
      {
        label: "Classement",
        value: rank && rank > 0 ? `${count(rank)}ᵉ` : "non classé",
      },
    ],
    rarity: profile.byRarity.map((row) => {
      const meta = RARITY_META[row.rarity as Rarity];
      return {
        label: meta?.label ?? row.rarity,
        value: `${count(row.owned)} / ${count(row.total)}`,
        ratio: row.total > 0 ? row.owned / row.total : 0,
        color: meta?.color ?? "#8b8b9a",
      };
    }),
    cards,
    footer: `CreatorDeck · niveau ${count(profile.level)}`,
  };
}

/** `Diane` → `creatordeck-diane.png` (sans accent, sans espace, sans surprise). */
export function posterFileName(displayName: string): string {
  const slug = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `creatordeck-${slug || "joueur"}.png`;
}

/** Coin arrondi, sans dépendre de `ctx.roundRect` (WebView anciens compris). */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Dessine l'affiche. `images` associe un slug de créateur à une image déjà
 * chargée (`HTMLImageElement` ou `ImageBitmap`) : l'appelant les charge avant,
 * parce qu'un chargement paresseux au milieu du dessin donnerait une affiche à
 * moitié vide.
 */
export function drawPoster(
  canvas: HTMLCanvasElement,
  model: PosterModel,
  images: Map<string, CanvasImageSource> = new Map(),
): void {
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Fond : le dégradé violet du jeu, du plus clair en haut au plus sombre en
  // bas, pour que l'affiche se reconnaisse même réduite à une vignette.
  const background = ctx.createLinearGradient(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  background.addColorStop(0, "#1b1030");
  background.addColorStop(0.55, "#120b22");
  background.addColorStop(1, "#08060f");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#f4f1ff";
  ctx.font = "800 68px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(model.title, 72, 84);

  ctx.fillStyle = "#a99fd0";
  ctx.font = "500 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(model.subtitle, 74, 170);

  // Les quatre cartes de la vitrine, en deux colonnes.
  const cardWidth = 452;
  const cardHeight = 244;
  const gap = 32;
  model.cards.slice(0, 4).forEach((card, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 72 + column * (cardWidth + gap);
    const y = 250 + row * (cardHeight + gap);

    roundedRect(ctx, x, y, cardWidth, cardHeight, 26);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = card.color;
    ctx.stroke();

    const portrait = images.get(card.slug);
    const portraitSize = 150;
    const portraitX = x + 26;
    const portraitY = y + 47;
    ctx.save();
    roundedRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 20);
    ctx.clip();
    if (portrait) {
      ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
    } else {
      ctx.fillStyle = card.color;
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
    }
    ctx.restore();
    roundedRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 20);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();

    ctx.fillStyle = "#f4f1ff";
    ctx.font = "700 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(card.displayName.slice(0, 18), portraitX + portraitSize + 22, portraitY + 30);
    ctx.fillStyle = card.color;
    ctx.font = "700 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(card.rarityLabel.toUpperCase(), portraitX + portraitSize + 22, portraitY + 76);
  });

  // Les chiffres, en grille de deux colonnes.
  const statsTop = model.cards.length ? 250 + 2 * (cardHeight + gap) + 24 : 250;
  ctx.font = "600 24px system-ui, -apple-system, 'Segoe UI', sans-serif";
  model.stats.forEach((stat, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 72 + column * (cardWidth + gap);
    const y = statsTop + row * 84;
    ctx.fillStyle = "#a99fd0";
    ctx.fillText(stat.label, x, y);
    ctx.fillStyle = "#f4f1ff";
    ctx.font = "800 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(stat.value, x, y + 30);
    ctx.font = "600 24px system-ui, -apple-system, 'Segoe UI', sans-serif";
  });

  // Les barres de rareté : la partie « collection » de l'affiche.
  const barsTop = statsTop + 3 * 84 + 16;
  model.rarity.forEach((row, index) => {
    const y = barsTop + index * 52;
    ctx.fillStyle = "#a99fd0";
    ctx.font = "600 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(`${row.label}  ${row.value}`, 72, y);
    roundedRect(ctx, 400, y + 4, 608, 18, 9);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    if (row.ratio > 0) {
      roundedRect(ctx, 400, y + 4, Math.max(18, Math.round(608 * row.ratio)), 18, 9);
      ctx.fillStyle = row.color;
      ctx.fill();
    }
  });

  ctx.fillStyle = "#6f66a0";
  ctx.font = "700 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(model.footer, 72, POSTER_HEIGHT - 96);
}
