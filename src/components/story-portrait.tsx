import { memo } from "react";

/** Portraits fictifs vectoriels : style CreatorDeck, sans illustration copiée ni image réseau. */
export const StoryPortrait = memo(function StoryPortrait({ character, emoji, mood = "calm" }: { character: string; emoji: string; mood?: "calm" | "on-air" | "tense" }) {
  const isPlatform = character === "platform";
  const isFlo = character === "flo";
  const isNox = character === "nox";
  const isMona = character === "mona";
  const isLina = character === "lina";
  const isCommunity = character === "community";
  // Deux personnages face à face : la crise Nox/Mona ne doit pas réutiliser l’avatar du joueur.
  if (character === "duo") {
    return (
      <div className="story-portrait story-portrait-duo" data-mood={mood} aria-hidden="true">
        <div className="story-portrait-duo-panel" data-side="nox"><StoryPortrait character="nox" emoji="" mood={mood} /></div>
        <div className="story-portrait-duo-panel" data-side="mona"><StoryPortrait character="mona" emoji="" mood={mood} /></div>
      </div>
    );
  }
  return (
    <div className="story-portrait" data-mood={mood} aria-hidden="true">
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
            {/* Papier découpé : léger modelé des joues, sans dégradé photoréaliste. */}
            <path d="M76 94Q78 130 104 145Q88 141 81 128Q76 113 76 94Z" fill="var(--portrait-hair)" opacity=".09" />
            <path d="M158 77Q168 98 158 121Q166 107 168 92Z" fill="var(--portrait-line)" opacity=".14" />
            <path d="M118 103l-3 10 6 1" fill="none" stroke="var(--portrait-eye)" strokeWidth="1.8" strokeLinecap="round" opacity=".22" />
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
            {/* Silhouettes reconnaissables même lorsque la carte est petite. */}
            {isFlo && <path d="M85 59Q100 41 126 45L116 52Q101 52 91 65Z" fill="var(--portrait-line)" opacity=".36" />}
            {isNox && <path d="M89 51l9-12 11 15 16-14 12 17" fill="none" stroke="var(--portrait-line)" strokeWidth="2.5" opacity=".56" strokeLinecap="round" />}
            {isMona && <path d="M73 70Q82 49 114 43M146 40Q162 46 166 59" fill="none" stroke="var(--portrait-line)" strokeWidth="2.8" opacity=".33" strokeLinecap="round" />}
            {isLina && <path d="M88 53Q123 35 149 53M157 60Q167 74 165 87" fill="none" stroke="var(--portrait-line)" strokeWidth="2.4" opacity=".36" strokeLinecap="round" />}
            {mood === "tense" && (
              <path d="M90 87L108 92M132 92L150 87" stroke="var(--portrait-eye)" strokeWidth="3.5" strokeLinecap="round" />
            )}
            <path d="M93 99 h14 M133 99 h14" stroke="var(--portrait-eye)" strokeWidth="5" strokeLinecap="round" />
            {mood === "tense"
              ? <path d="M109 128Q120 118 131 128" stroke="var(--portrait-eye)" strokeWidth="3" strokeLinecap="round" fill="none" />
              : mood === "on-air"
                ? <ellipse cx="120" cy="124" rx="7" ry="5.5" fill="var(--portrait-eye)" />
                : <path d="M107 123Q120 130 133 122" stroke="var(--portrait-eye)" strokeWidth="2.8" strokeLinecap="round" fill="none" />}

            {isMona && (
              <g fill="none" stroke="var(--portrait-eye)" strokeWidth="3">
                <rect x="82" y="86" width="34" height="26" rx="8" />
                <rect x="124" y="86" width="34" height="26" rx="8" />
                <path d="M116 96 h8" />
              </g>
            )}
            {isNox && <path d="M100 131 Q120 139 141 130" stroke="var(--portrait-hair)" strokeWidth="5" strokeLinecap="round" fill="none" />}
            {!isFlo && !isNox && !isMona && !isLina && !isCommunity && (
              <g fill="none" stroke="var(--portrait-line)" strokeLinecap="round" strokeLinejoin="round">
                <path d="M68 101Q58 28 119 27Q179 28 172 101" strokeWidth="5" />
                <rect x="60" y="93" width="13" height="28" rx="5" fill="var(--portrait-coat)" strokeWidth="3" />
                <rect x="167" y="93" width="13" height="28" rx="5" fill="var(--portrait-coat)" strokeWidth="3" />
                <path d="M65 116Q68 139 99 139" strokeWidth="3.5" />
                <rect x="95" y="134" width="16" height="7" rx="3.5" fill="var(--portrait-line)" stroke="none" />
              </g>
            )}
            {isFlo && (
              <g fill="none" stroke="var(--portrait-line)" strokeLinecap="round">
                <path d="M71 98Q56 34 120 29Q172 35 168 91" strokeWidth="3.5" />
                <rect x="62" y="91" width="13" height="25" rx="5" fill="var(--portrait-coat)" strokeWidth="2.5" />
                <path d="M65 114Q69 136 98 136" strokeWidth="2.5" />
                <circle cx="101" cy="136" r="4" fill="var(--portrait-line)" stroke="none" />
                <circle cx="97" cy="114" r="2.2" fill="var(--portrait-hair)" stroke="none" />
                <circle cx="149" cy="114" r="2.2" fill="var(--portrait-hair)" stroke="none" />
              </g>
            )}
            {isNox && (
              <g fill="none" stroke="var(--portrait-line)" strokeWidth="3">
                <path d="M172 111Q183 119 171 130Q162 124 171 116" />
                <path d="M85 89L106 84M132 84L153 89" stroke="var(--portrait-eye)" strokeLinecap="round" />
                <path d="M99 154L121 170L143 154" strokeWidth="3.5" />
              </g>
            )}
            {isMona && (
              <g stroke="var(--portrait-line)" fill="none" strokeLinecap="round">
                <path d="M92 160Q120 180 148 160" strokeWidth="2.3" />
                <path d="M119 169L125 175L119 181L113 175Z" fill="var(--portrait-line)" strokeWidth="1.5" />
                <circle cx="174" cy="119" r="5" strokeWidth="2.5" />
              </g>
            )}
            {isLina && (
              <g>
                <path d="M103 157L121 183L137 157" stroke="var(--portrait-line)" fill="none" strokeWidth="3.2" />
                <rect x="135" y="175" width="28" height="16" rx="3" fill="var(--portrait-line)" />
                <path d="M140 180H158M140 185H152" stroke="var(--portrait-coat)" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {isCommunity && <path d="M68 152 L120 185 L173 151" stroke="var(--portrait-line)" strokeWidth="4" opacity=".5" fill="none" />}
          </>
        )}
        {/* Signatures lisibles à la taille d'une carte : accessoires personnels. */}
        {isFlo && (
          <g>
            <circle cx="96" cy="116" r="1.7" fill="var(--portrait-hair)" opacity=".7"/>
            <circle cx="102" cy="118" r="1.5" fill="var(--portrait-hair)" opacity=".7"/>
            <circle cx="145" cy="116" r="1.7" fill="var(--portrait-hair)" opacity=".7"/>
            <path d="M30 187l32-19 13 32M210 187l-32-19-13 32" stroke="var(--portrait-line)" fill="none" strokeWidth="2" opacity=".7"/>
            <rect x="149" y="176" width="25" height="17" rx="3" fill="var(--portrait-line)" opacity=".9"/>
            <path d="M155 182h13m-13 5h8" stroke="var(--portrait-coat)" strokeWidth="2"/>
          </g>
        )}
        {isNox && (
          <g fill="none" stroke="var(--portrait-line)" strokeLinecap="round">
            <path d="M25 188Q47 152 73 156M215 188Q193 152 167 156" strokeWidth="3" opacity=".7"/>
            <path d="M85 166l-5 25m80-25 5 25" strokeWidth="3"/>
            <path d="M140 84l5-4" stroke="var(--portrait-skin)" strokeWidth="3"/>
            <path d="M102 161l18 21 18-21" strokeWidth="2" opacity=".5"/>
          </g>
        )}
        {isMona && (
          <g>
            <path d="M51 163l32-12 37 50-20 9zM189 163l-32-12-37 50 20 9z" fill="var(--portrait-coat)" stroke="var(--portrait-line)" strokeWidth="2"/>
            <path d="M83 153l37 48 37-48" fill="none" stroke="var(--portrait-line)" strokeWidth="2.8" opacity=".8"/>
            <path d="M117 187h6" stroke="var(--portrait-line)" strokeWidth="3" strokeLinecap="round"/>
          </g>
        )}
        {isLina && (
          <g fill="none" stroke="var(--portrait-line)">
            <path d="M68 160l47 50m39-50-27 49" strokeWidth="4" opacity=".58"/>
            <rect x="157" y="151" width="35" height="23" rx="4" fill="var(--portrait-coat)" strokeWidth="2"/>
            <circle cx="175" cy="162" r="7" strokeWidth="2.5"/>
            <path d="M163 151l4-5h13l5 5" strokeWidth="2"/>
          </g>
        )}
        {isCommunity && (
          <g fill="none" stroke="var(--portrait-line)" strokeWidth="2.4">
            <path d="M26 191h40l9-11h20M214 191h-40l-9-11h-20"/>
            <circle cx="47" cy="178" r="5"/><circle cx="193" cy="178" r="5"/>
          </g>
        )}
        {/* Matières de veste et badges de métier, propres aux personnages. */}
        <g stroke="var(--portrait-line)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 201Q50 182 70 174M215 201Q188 182 170 174" strokeWidth="1.7" opacity=".45"/>
          {character === "toi" && (
            <><rect x="156" y="174" width="22" height="18" rx="3" strokeWidth="2" opacity=".8"/>
              <path d="M167 177v10m-5-6a5 5 0 0 0 10 0m-5 6v3m-5 0h10" strokeWidth="1.4" opacity=".86"/></>
          )}
          {isFlo && <path d="M38 176h24m-20 7h16" strokeWidth="2.5" opacity=".65"/>}
          {isNox && <path d="M34 186l18-15 18 14m102 0 18-14 18 15" strokeWidth="2" opacity=".8"/>}
          {isMona && <path d="M38 188h22m-18 6h12" strokeWidth="2.2" opacity=".74"/>}
          {isLina && <path d="M49 174h21m-17 7h12" strokeWidth="2" opacity=".7"/>}
        </g>
        <path d="M15 208 H225" stroke="var(--portrait-line)" strokeWidth="2" opacity=".45" />
      </svg>
      <span className="story-portrait-stamp">{emoji}</span>
    </div>
  );
});
