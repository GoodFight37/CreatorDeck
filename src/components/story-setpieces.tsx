import { memo } from "react";
import type { StoryChannel } from "../lib/story-mode";

/** Objets de régie dessinés pour chaque canal, sans image distante. */
export const StorySetPieces = memo(function StorySetPieces({ channel, sceneId }: { channel: StoryChannel; sceneId?: string }) {
  return (
    <div className="story-set-pieces" data-channel={channel} data-scene={sceneId} aria-hidden="true">
      <svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" focusable="false">
        {/* Scénographie originale par médium, derrière le portrait. */}
        <g className="story-world-shapes" fill="currentColor" stroke="none">
          {channel === "LIVE" ? (
            <><path d="M0 191V48L43 23H76V191ZM320 191V43L278 18H249V191Z" opacity=".22"/>
              <path d="M0 210L89 182H226L320 210V220H0Z" opacity=".35"/></>
          ) : channel === "CLIP" ? (
            <><path d="M0 182L51 117L91 145L138 96L185 151L232 113L320 179V220H0Z" opacity=".24"/>
              <path d="M0 198L65 169L110 191L160 146L211 186L275 150L320 184V220H0Z" opacity=".35"/></>
          ) : channel === "CHAT" ? (
            <><path d="M0 219V97l72 19v103ZM320 219V103l-70 12v104Z" opacity=".28"/>
              <rect x="17" y="41" width="61" height="29" rx="10" opacity=".24"/>
              <rect x="245" y="73" width="62" height="29" rx="10" opacity=".24"/></>
          ) : channel === "DM" ? (
            <><rect x="13" y="24" width="78" height="139" rx="9" opacity=".2"/>
              <rect x="229" y="48" width="77" height="124" rx="9" opacity=".2"/></>
          ) : channel === "MAIL" || channel === "CONTRAT" ? (
            <><path d="M0 30L74 15L87 188L0 206ZM320 28L247 10L237 190L320 207Z" opacity=".22"/>
              <path d="M0 200Q160 171 320 203V220H0Z" opacity=".3"/></>
          ) : (
            <><path d="M0 39L72 18V207L0 190ZM320 34L250 15V203L320 189Z" opacity=".25"/>
              <path d="M0 206L88 184H231L320 207V220H0Z" opacity=".33"/></>
          )}
        </g>
        {/* Chaque monde a une silhouette fonctionnelle : studio, lecteur vidéo,
            messagerie, dossiers ou cassette. Le centre reste libre pour le visage. */}
        <g className="story-world-details" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {channel === "LIVE" ? (
            <>
              <path d="M8 182V117L30 105L45 110M20 179V123M8 118L20 123L30 118" strokeWidth="2.1" opacity=".65"/>
              <rect x="6" y="139" width="45" height="26" rx="3" strokeWidth="1.5" opacity=".65"/>
              <path d="M12 150H43M12 155H29M30 158H42" strokeWidth="1.5" opacity=".6"/>
              <path d="M267 177v-28m0 0h35v28M277 155v15M284 158v12M291 151v19" strokeWidth="2" opacity=".55"/>
              <path d="M11 202H82M238 202H309" strokeWidth="4" opacity=".32"/>
            </>
          ) : channel === "CLIP" ? (
            <>
              <path d="M17 65H65V116H17Z M24 73H58V108H24Z" strokeWidth="1.7" opacity=".7"/>
              <path d="M35 82l15 9-15 9Z" fill="currentColor" strokeWidth="1" opacity=".6"/>
              <path d="M253 71h46v39h-46zM261 79h30M261 86h14M261 99h19" strokeWidth="1.7" opacity=".6"/>
              <path d="M17 192h286M25 183v18M62 188v10M259 188v10M288 183v18" strokeWidth="2" opacity=".46"/>
              <rect x="21" y="189" width="48" height="5" rx="2" fill="currentColor" opacity=".45"/>
              <path d="M8 132h28m-19-14v28M284 142h28m-14-14v28" strokeWidth="2.2" opacity=".4"/>
            </>
          ) : channel === "CHAT" ? (
            <>
              <path d="M15 64h50v26H41l-12 11V90H15zM251 122h53v29h-25l-10 10v-10h-18z" strokeWidth="2" opacity=".65"/>
              <path d="M22 75h35M22 82h22M258 133h37M258 141h24" strokeWidth="2" opacity=".62"/>
              <path d="M20 176h43m-35 8h25M258 186h40m-21-9h21" strokeWidth="2" opacity=".45"/>
            </>
          ) : channel === "DM" ? (
            <>
              <rect x="18" y="30" width="60" height="129" rx="9" strokeWidth="2" opacity=".75"/>
              <path d="M39 39h18M26 63h43M26 75h30M37 98h34M45 110h26" strokeWidth="3" opacity=".5"/>
              <rect x="242" y="48" width="59" height="117" rx="9" strokeWidth="2" opacity=".7"/>
              <path d="M249 74h43M249 86h27M261 110h31M268 122h24" strokeWidth="3" opacity=".52"/>
              <circle cx="48" cy="150" r="3" fill="currentColor" stroke="none" opacity=".66"/>
            </>
          ) : channel === "MAIL" || channel === "CONTRAT" ? (
            <>
              <path d="M12 57l58-10 13 95-58 10zM21 78l44-7M23 90l40-7M25 101l43-7" strokeWidth="2" opacity=".65"/>
              <path d="M249 61l54 7-13 94-55-7zM253 84l39 5M250 96l42 5M247 109l40 5" strokeWidth="2" opacity=".6"/>
              <circle cx="272" cy="135" r="15" strokeWidth="2" opacity=".65"/>
              <path d="M265 135l5 5 10-11" strokeWidth="2.6" opacity=".65"/>
            </>
          ) : (
            <>
              <rect x="16" y="61" width="63" height="101" rx="3" strokeWidth="2" opacity=".7"/>
              <path d="M24 76h47M24 147h47M29 84v55M65 84v55" strokeWidth="2" opacity=".65"/>
              <circle cx="47" cy="110" r="20" strokeWidth="2" opacity=".6"/>
              <rect x="247" y="69" width="56" height="95" rx="3" strokeWidth="2" opacity=".75"/>
              <path d="M255 82h40m-40 67h40M263 90v51m24-51v51" strokeWidth="2" opacity=".55"/>
              <circle cx="275" cy="116" r="17" strokeWidth="2" opacity=".6"/>
            </>
          )}
        </g>
        {/* Un objet narratif apparaît à certains moments-clés sans spoiler. */}
        {(sceneId === "studio" || sceneId === "clip_risque" || sceneId === "premier_sponsor" || sceneId === "double_crise") && (
          <g className="story-event-illustration" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            {sceneId === "studio" ? (
              <><path d="M24 188v-19m-12 19h24M24 168l-6-13h12l-6 13" opacity=".8"/>
                <circle cx="24" cy="153" r="5" fill="currentColor" opacity=".35"/>
                <path d="M287 189v-35m-7 0h14v21h-14zM287 189h-13m13 0h13" opacity=".8"/></>
            ) : sceneId === "clip_risque" ? (
              <><path d="M257 185h43m-21-15v30M271 177l8-7 8 7" opacity=".6"/>
                <path d="M31 175h36m-18-9v18" opacity=".6"/></>
            ) : sceneId === "premier_sponsor" ? (
              <><circle cx="42" cy="137" r="13" strokeWidth="3" opacity=".65"/>
                <path d="M37 136l5 5 8-10" strokeWidth="2.5"/></>
            ) : (
              <><path d="M160 22v22M150 33h20M153 51h14" opacity=".7"/>
                <circle cx="160" cy="33" r="24" strokeDasharray="3 6" opacity=".5"/></>
            )}
          </g>
        )}
        <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".5">
          <path d="M18 25h25M18 25v21M302 25h-25M302 25v21M18 194h25M18 194v-21M302 194h-25M302 194v-21"/>
          <circle cx="160" cy="103" r="92" strokeDasharray="2 8" opacity=".45"/>
        </g>
        {channel === "LIVE" ? (
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M24 170V80m-9 90h18M14 80h20l-4-17H18zM286 170V80m-9 90h18M276 80h20l-4-17h-12z"/>
            <rect x="243" y="34" width="54" height="27" rx="4"/>
            <path d="M251 45h14m-14 7h23" strokeLinecap="round"/>
            <circle cx="285" cy="47" r="4" fill="currentColor" stroke="none"/>
            <path d="M43 192h234" strokeWidth="4" opacity=".55"/>
          </g>
        ) : channel === "CHAT" || channel === "DM" ? (
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 66h53v32H37l-15 11V98h-6zM251 115h53v32h-21l-15 11v-11h-17z"/>
            <path d="M26 78h29m-29 8h21M261 127h31m-31 8h22" strokeLinecap="round"/>
            <circle cx="37" cy="46" r="5" fill="currentColor" stroke="none"/>
            <circle cx="281" cy="95" r="5" fill="currentColor" stroke="none"/>
          </g>
        ) : channel === "CONTRAT" || channel === "MAIL" ? (
          <g stroke="currentColor" fill="none" strokeWidth="2">
            <path d="M21 48h57l11 13v99H21zM78 48v14h11"/>
            <path d="M31 77h43M31 90h38M31 103h43M31 116h29" strokeLinecap="round"/>
            <path d="M252 60l34-6 16 98-34 6z"/>
            <path d="M262 77l23-4M265 89l22-4M268 101l18-4"/>
            {channel === "CONTRAT" ? <path d="M28 136q16-8 22 0t24-1" strokeWidth="3"/> : <path d="M29 136l17 10 27-22" strokeWidth="3"/>}
          </g>
        ) : channel === "ARCHIVE" ? (
          <g stroke="currentColor" fill="none" strokeWidth="2.5">
            <rect x="11" y="76" width="82" height="65" rx="5"/>
            <circle cx="34" cy="105" r="15"/><circle cx="69" cy="105" r="15"/>
            <circle cx="34" cy="105" r="5" fill="currentColor" stroke="none"/>
            <circle cx="69" cy="105" r="5" fill="currentColor" stroke="none"/>
            <path d="M34 105h35M24 128h55M227 145h83m-72-12h62m-58-12h57" opacity=".8"/>
          </g>
        ) : (
          <g stroke="currentColor" fill="none" strokeWidth="2.5">
            <rect x="17" y="66" width="74" height="87" rx="5"/>
            <path d="M43 90l27 18-27 18z" fill="currentColor" stroke="none" opacity=".7"/>
            <path d="M237 72h70v72h-70zM249 139v-9h46v9M249 82h46M232 166h78" opacity=".8"/>
          </g>
        )}
      </svg>
    </div>
  );
});
