import { memo } from "react";

/** Portraits fictifs vectoriels : style CreatorDeck, sans illustration copiée ni image réseau. */
export const StoryPortrait = memo(function StoryPortrait({ character, emoji }: { character: string; emoji: string }) {
  const isPlatform = character === "platform";
  const isFlo = character === "flo";
  const isNox = character === "nox";
  const isMona = character === "mona";
  const isLina = character === "lina";
  const isCommunity = character === "community";
  return (
    <div className="story-portrait" aria-hidden="true">
      <svg className="story-portrait-illustration" viewBox="0 0 240 210" focusable="false" aria-hidden="true">
        <circle cx="120" cy="106" r="94" fill="var(--portrait-halo)" opacity=".25" />
        <circle cx="120" cy="106" r="76" fill="none" stroke="var(--portrait-line)" strokeWidth="1.5" strokeDasharray="3 9" opacity=".55" />
        <path d="M16 210 C19 159 53 150 90 148 L150 148 C190 150 219 164 224 210 Z" fill="var(--portrait-coat)" />
        <path d="M81 154 L120 201 L159 154" fill="var(--portrait-shirt)" />
        <path d="M107 130 L107 158 Q120 170 133 158 L133 130" fill="var(--portrait-skin)" />
        {isPlatform ? (
          <>
            <rect x="70" y="49" width="100" height="98" rx="13" fill="var(--portrait-hair)" stroke="var(--portrait-line)" strokeWidth="3" />
            <rect x="79" y="58" width="82" height="80" rx="8" fill="var(--portrait-screen)" />
            <path d="M95 91 h14 M131 91 h14 M106 113 Q120 124 134 113" stroke="var(--portrait-line)" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M120 37 v12 M111 37 h18" stroke="var(--portrait-line)" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            {(isFlo || isLina) && <path d="M65 72 C54 104 58 156 82 165 L159 165 C187 150 180 92 170 69 Z" fill="var(--portrait-hair)" />}
            {isMona && <circle cx="170" cy="57" r="26" fill="var(--portrait-hair)" />}
            <ellipse cx="120" cy="93" rx="51" ry="60" fill="var(--portrait-skin)" />
            <ellipse cx="68" cy="98" rx="8" ry="14" fill="var(--portrait-skin)" />
            <ellipse cx="172" cy="98" rx="8" ry="14" fill="var(--portrait-skin)" />
            {isFlo ? (
              <path d="M68 84 Q61 36 111 32 Q168 31 174 77 L158 69 Q126 74 108 57 Q93 83 68 84 Z" fill="var(--portrait-hair)" />
            ) : isNox ? (
              <path d="M65 91 L60 45 L79 58 L89 25 L109 49 L129 25 L142 48 L164 29 L174 80 Q159 71 144 59 Q109 92 65 91 Z" fill="var(--portrait-hair)" />
            ) : isMona ? (
              <path d="M66 84 Q61 31 124 33 Q163 30 174 82 Q150 75 139 55 Q101 79 66 84 Z" fill="var(--portrait-hair)" />
            ) : isLina ? (
              <path d="M63 103 Q57 36 121 31 Q184 31 179 102 L166 90 Q159 51 124 54 Q92 48 77 90 Z" fill="var(--portrait-hair)" />
            ) : isCommunity ? (
              <path d="M57 95 Q53 17 119 21 Q186 20 185 95 L168 75 Q120 40 72 77 Z" fill="var(--portrait-hair)" />
            ) : (
              <path d="M64 88 Q64 35 120 35 Q177 34 176 88 Q150 80 140 65 Q99 86 64 88 Z" fill="var(--portrait-hair)" />
            )}
            <path d="M93 99 h14 M133 99 h14" stroke="var(--portrait-eye)" strokeWidth="5" strokeLinecap="round" />
            <path d="M107 123 Q120 130 133 122" stroke="var(--portrait-eye)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            {isMona && (
              <g fill="none" stroke="var(--portrait-eye)" strokeWidth="3">
                <rect x="82" y="86" width="34" height="26" rx="8" />
                <rect x="124" y="86" width="34" height="26" rx="8" />
                <path d="M116 96 h8" />
              </g>
            )}
            {isNox && <path d="M100 131 Q120 139 141 130" stroke="var(--portrait-hair)" strokeWidth="5" strokeLinecap="round" fill="none" />}
            {isCommunity && <path d="M68 152 L120 185 L173 151" stroke="var(--portrait-line)" strokeWidth="4" opacity=".5" fill="none" />}
          </>
        )}
        <path d="M15 208 H225" stroke="var(--portrait-line)" strokeWidth="2" opacity=".45" />
      </svg>
      <span className="story-portrait-stamp">{emoji}</span>
    </div>
  );
});
