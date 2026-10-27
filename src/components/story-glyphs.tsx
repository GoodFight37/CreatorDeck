import { memo } from "react";
import type { StoryStat } from "../lib/story-mode";

/**
 * Pictogrammes dessinés pour CreatorDeck Histoire, sans police d'icônes.
 * Le médaillon carré aux coins coupés fait écho à la tranche des cartes du Binder.
 */
export const StoryGaugeIcon = memo(function StoryGaugeIcon({ stat }: { stat: StoryStat }) {
  return (
    <svg className="story-gauge-glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
      <path className="story-glyph-frame" d="M11 3H37L45 11V37L37 45H11L3 37V11Z" strokeWidth="1.4" opacity=".52" />
      {stat === "public" && (
        <>
          <circle cx="24" cy="27" r="5.5" fill="currentColor" stroke="none" />
          <path d="M13 35C14 29 19 27 24 27M35 35C34 29 29 27 24 27" strokeWidth="3.4" />
          <path d="M17 13Q24 7 31 13M12 10Q24 -1 36 10" strokeWidth="2.7" />
          <path d="M10 29Q7 26 10 21M38 29Q41 26 38 21" strokeWidth="1.7" opacity=".7" />
        </>
      )}
      {stat === "energie" && (
        <>
          <path d="M27 8L13 27H23L20 40L36 20H26L27 8Z" fill="currentColor" stroke="none" />
          <path d="M11 12L9 16M37 33L39 37" strokeWidth="2.5" opacity=".7" />
        </>
      )}
      {stat === "argent" && (
        <>
          <path d="M16 10H32L38 16V32L32 38H16L10 32V16Z" strokeWidth="2.5" />
          <path d="M30 17Q25 13 20 18Q16 24 21 29Q25 34 31 29" strokeWidth="3.4" />
          <path d="M17 24H28M17 28H28" strokeWidth="2.1" />
          <path d="M14 14L11 17M34 34L37 31" strokeWidth="1.5" opacity=".65" />
        </>
      )}
      {stat === "confiance" && (
        <>
          <path d="M10 18Q10 11 17 11H24V25Q24 31 17 31H15L11 36V29Q10 25 10 18Z" strokeWidth="2.6" />
          <path d="M38 24Q38 14 31 14H26V27Q26 33 33 33H35L39 38V32Q38 28 38 24Z" strokeWidth="2.6" />
          <path d="M19 20L23 24L30 18" strokeWidth="3.3" />
        </>
      )}
    </svg>
  );
});

/** Petite estampille de diffusion, pas un catalogue d'icônes génériques. */
export const StoryChannelGlyph = memo(function StoryChannelGlyph({ channel }: { channel: string }) {
  return (
    <svg className="story-channel-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {channel === "LIVE" ? (
        <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M5 5Q-1 12 5 19M19 5Q25 12 19 19"/></>
      ) : channel === "CHAT" || channel === "DM" ? (
        <><path d="M4 5H20V16H11L6 21V16H4Z"/><path d="M8 10H16"/></>
      ) : channel === "CLIP" ? (
        <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9L16 12L10 15Z" fill="currentColor" stroke="none"/></>
      ) : channel === "CONTRAT" ? (
        <><path d="M6 3H15L20 8V21H6Z"/><path d="M15 3V8H20M9 13H16M9 17H14"/></>
      ) : channel === "ARCHIVE" ? (
        <><path d="M4 6H20V10H4ZM6 10V21H18V10M10 15H14"/></>
      ) : (
        <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M4 8L12 14L20 8"/></>
      )}
    </svg>
   );
});
