import { memo } from "react";
import type { StoryChannel } from "../lib/story-mode";

/** Objets de régie dessinés pour chaque canal, sans image distante. */
export const StorySetPieces = memo(function StorySetPieces({ channel }: { channel: StoryChannel }) {
  return (
    <div className="story-set-pieces" data-channel={channel} aria-hidden="true">
      <svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" focusable="false">
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
