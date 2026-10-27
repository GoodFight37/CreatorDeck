import { memo } from "react";
import type { StoryEndingId } from "../lib/story-mode";

/** Gravures originales propres aux neuf dénouements, sans média distant. */
export const StoryEndingArtwork = memo(function StoryEndingArtwork({ ending }: { ending: StoryEndingId }) {
  return (
    <svg className="story-ending-artwork" data-ending-symbol={ending} viewBox="0 0 128 128"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      focusable="false" aria-hidden="true">
      <circle cx="64" cy="64" r="57" strokeWidth="1.2" strokeDasharray="2 8" opacity=".5" />
      {ending === "silence" ? (
        <>
          <rect x="25" y="31" width="78" height="57" rx="7" />
          <path d="M35 42H93V76H35ZM64 88v12M45 102h38" opacity=".75" />
          <path d="M47 47l34 26M81 47L47 73" strokeWidth="5" />
          <circle cx="103" cy="32" r="6" fill="currentColor" stroke="none" />
        </>
      ) : ending === "epuisement" ? (
        <>
          <rect x="26" y="39" width="73" height="49" rx="8" />
          <rect x="99" y="55" width="7" height="17" rx="2" fill="currentColor" stroke="none" />
          <path d="M36 51h17v25H36zM63 52l-9 15h13l-7 14" strokeWidth="4" opacity=".7" />
          <path d="M35 100h61" opacity=".5" />
        </>
      ) : ending === "faillite" ? (
        <>
          <path d="M36 24h56v76l-9-6-10 6-9-6-10 6-9-6-9 6z" />
          <path d="M47 41h34M47 52h34M47 63h17M48 79h28" opacity=".8" />
          <path d="M75 68l9 12M84 68L75 80" strokeWidth="4" />
          <path d="M28 109h72" opacity=".5" />
        </>
      ) : ending === "scandale" ? (
        <>
          <path d="M21 35h86v48H60L37 102V83H21z" />
          <path d="M44 49h40M44 60h40" strokeWidth="3" opacity=".5" />
          <path d="M48 40l32 32M80 40L48 72" strokeWidth="5" />
          <circle cx="93" cy="28" r="7" fill="currentColor" stroke="none" />
        </>
      ) : ending === "surexposition" ? (
        <>
          <rect x="22" y="36" width="84" height="55" rx="5" />
          <circle cx="64" cy="62" r="19" />
          <path d="M64 43v38M45 62h38M35 20l8 10M93 20l-8 10M16 61H8M120 61h-8M42 100l-8 9M86 100l8 9" />
          <path d="M39 110h50" opacity=".6" />
        </>
      ) : ending === "phenomene" ? (
        <>
          <path d="M64 18l13 27 30 4-22 21 5 30-26-14-26 14 5-30-22-21 30-4z" />
          <path d="M64 33v39M45 54h38" opacity=".75" />
          <circle cx="109" cy="23" r="5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="99" r="4" fill="currentColor" stroke="none" />
        </>
      ) : ending === "independant" ? (
        <>
          <path d="M64 111V58M64 79C39 85 27 73 27 45c27-1 39 8 37 34ZM64 64c0-26 11-39 39-40-1 27-13 42-39 40Z" />
          <path d="M40 111h48M45 102l-9 9M83 102l9 9" opacity=".75" />
          <circle cx="64" cy="47" r="8" fill="currentColor" stroke="none" opacity=".35" />
        </>
      ) : ending === "business" ? (
        <>
          <path d="M28 102V43h72v59M44 43V26h40v17M21 102h86" />
          <path d="M42 55h13v13H42zM73 55h13v13H73zM42 78h13v13H42zM73 78h13v13H73z" opacity=".8" />
          <path d="M59 102V82h10v20" />
          <circle cx="102" cy="27" r="7" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M30 94V36h68v58z" />
          <circle cx="64" cy="65" r="17" />
          <path d="M64 48v34M47 65h34" opacity=".65" />
          <path d="M36 106h56M44 22h40" opacity=".6" />
          <circle cx="92" cy="33" r="6" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
});
