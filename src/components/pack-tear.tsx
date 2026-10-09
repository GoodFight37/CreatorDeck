"use client";

/**
 * La déchirure : l'instant entre le geste et la première carte.
 *
 * Sans lui, on passe du bouton « Ouvrir » à une carte en plein écran sans
 * transition — le paquet n'existe jamais, il n'y a rien à ouvrir. Ici, il
 * s'ouvre en deux : la couture laisse passer la lumière, le carton pivote et
 * part en flou, six grains montent. Sept cents millisecondes, puis la carte
 * arrive : elle devient une **conséquence** au lieu d'un résultat.
 *
 * Ce composant ne décide de rien et ne joue rien : il **affiche**. La durée
 * vient de `src/lib/reveal.ts` (`PACK_TEAR_MS`), le son et la vibration restent
 * à l'écran qui ouvre le paquet — c'est lui qui tient l'interrupteur Son.
 *
 * Rien ne tourne en boucle : trois animations bornées, et l'écran quitte le DOM
 * à la fin.
 */
const GRAINS = [
  { angle: -128, delay: 0 },
  { angle: -78, delay: 30 },
  { angle: -28, delay: 60 },
  { angle: 22, delay: 90 },
  { angle: 72, delay: 120 },
  { angle: 122, delay: 150 },
] as const;

export function PackTear({ kind = "live" }: { kind?: "live" | "scene" }) {
  return (
    <div className="pack-tear" role="status" aria-label="Le paquet s'ouvre">
      <div className="pack-tear-scene">
        <div className="pack-tear-pack" aria-hidden="true">
          <span className="pack-tear-half pack-tear-half-left" />
          <span className="pack-tear-half pack-tear-half-right" />
          <span className="pack-tear-pack-mark">CD</span>
        </div>
        <span className="pack-tear-seam" aria-hidden="true" />
        {GRAINS.map((grain) => (
          <span
            key={grain.angle}
            className="pack-tear-grain"
            aria-hidden="true"
            style={
              {
                "--angle": `${grain.angle}deg`,
                animationDelay: `${grain.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <p className="pack-tear-legende">{kind === "scene" ? "Paquet Scène" : "Live Drop"}</p>
    </div>
  );
}
