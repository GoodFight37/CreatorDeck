"use client";

/**
 * Le sachet du Drop — un seul, celui des créateurs.
 *
 * L'accueil ne montre plus un carrousel d'univers : il montre **le** sachet. Les
 * univers Mèmes et Imgflip existent toujours, mais ils ne se glissent plus sous
 * le pouce au-dessus du sachet : un glissé horizontal sur le sachet n'a plus de
 * sens quand il n'y a qu'un objet, et c'était justement la source du défaut
 * (« le glissé troue et croise les sachets »).
 *
 * Ce qui reste ici, c'est l'objet : un bouton plein cadre, son nom lu par le
 * lecteur d'écran, le penchement au capteur ou à la souris (008) et le reflet
 * holographique. Le nom visible de l'univers est écrit une seule fois, par
 * `drop-view`, dans la ligne de statut.
 */
import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cardEffectsAllowed } from "@/lib/tilt";
import Image from "next/image";
import "./booster-carousel.css";

export type BoosterUniverse = "live" | "memes" | "imgflip";

/**
 * Ce que le Drop affiche aujourd'hui. Les trois restent connus du reste du code.
 *
 * WebP et non SVG : Android re-rastérisait les ~280 tracés du sachet à chaque
 * repeinture et figeait la scène en tuiles vides. Générés par
 * `scripts/build-pack-webp.mjs`.
 */
export const DROP_ARTWORK = "/packs/live-opening.webp";

export function PackArtwork({ onClick, disabled, artwork = DROP_ARTWORK,
  label = "Ouvrir le booster Live Drop", active = true,
}: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean;
  artwork?: string; label?: string; active?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const pack = useRef<HTMLButtonElement>(null);
  const object3d = useRef<HTMLSpanElement>(null);
  const holo = useRef<HTMLSpanElement>(null);

  // Le sachet penche sous le capteur (téléphone) ou la souris (ordinateur), et le
  // reflet holographique glisse avec l'angle. Écriture directe une image sur deux
  // ou trois, lissée : aucune variable CSS sur un parent.
  useEffect(() => {
    const node = object3d.current;
    const film = holo.current;
    const bouton = pack.current;
    if (!active || !node || !film || !bouton || !cardEffectsAllowed()) return;

    let cibleX = 0;
    let cibleY = 0;
    let courantX = 0;
    let courantY = 0;
    let frame = 0;
    let betaZero: number | null = null;
    const borne = (value: number, max: number) => Math.max(-max, Math.min(max, value));
    const distrait = () => document.visibilityState !== "visible" || Boolean(node.closest(".is-dragging, .is-switching"));
    // Le JS lisse déjà l'angle : la transition CSS de 180 ms, relancée à chaque écriture,
    // ajoutait du retard et des à-coups.
    node.style.transition = "none";
    const remettre = () => {
      node.style.transform = "";
      film.style.transform = "";
    };
    const ecrire = () => {
      frame = 0;
      if (document.documentElement.dataset.cardFx === "off") { remettre(); return; }
      courantX += (cibleX - courantX) * 0.18;
      courantY += (cibleY - courantY) * 0.18;
      // Même pose de base que .pack-3d-object au repos, plus l'inclinaison.
      node.style.transform = `perspective(1050px) rotateX(${(2 + courantX).toFixed(2)}deg) rotateY(${(courantY - 5).toFixed(2)}deg) rotateZ(1deg)`;
      // Le film arc-en-ciel glisse par transform (composition seule) : l'ancien
      // background-position repeignait tout le calque masqué à chaque image.
      film.style.transform = `translate(${(courantY * -4).toFixed(2)}%, ${(courantX * -4).toFixed(2)}%)`;
      if (Math.abs(cibleX - courantX) > 0.05 || Math.abs(cibleY - courantY) > 0.05) {
        frame = requestAnimationFrame(ecrire);
      }
    };
    const lancer = () => { if (!frame) frame = requestAnimationFrame(ecrire); };

    const auPointeur = (event: PointerEvent) => {
      // Seule la souris incline : au doigt, l'appui sert à ouvrir.
      if (event.pointerType !== "mouse") return;
      if (distrait()) { cibleX = 0; cibleY = 0; lancer(); return; }
      const rect = bouton.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      cibleY = borne((((event.clientX - rect.left) / rect.width) - 0.5) * 2, 1) * 10;
      cibleX = borne((((event.clientY - rect.top) / rect.height) - 0.5) * 2, 1) * -8;
      lancer();
    };
    const auSortie = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cibleX = 0; cibleY = 0; lancer();
    };
    const auCapteur = (event: DeviceOrientationEvent) => {
      if (event.gamma === null && event.beta === null) return;
      if (betaZero === null && event.beta !== null) betaZero = event.beta;
      if (distrait()) { cibleX = 0; cibleY = 0; lancer(); return; }
      const deltaBeta = event.beta !== null && betaZero !== null ? event.beta - betaZero : 0;
      cibleY = borne((event.gamma ?? 0) / 3, 10);
      cibleX = borne(deltaBeta * -0.4, 8);
      lancer();
    };

    // Les deux sources restent branchées : la souris ne se manifeste que sur
    // ordinateur (`pointerType`), le capteur ne parle que sur téléphone.
    bouton.addEventListener("pointermove", auPointeur);
    bouton.addEventListener("pointerleave", auSortie);
    window.addEventListener("deviceorientation", auCapteur);
    return () => {
      cancelAnimationFrame(frame);
      bouton.removeEventListener("pointermove", auPointeur);
      bouton.removeEventListener("pointerleave", auSortie);
      window.removeEventListener("deviceorientation", auCapteur);
      node.style.transition = "";
      remettre();
    };
  }, [active]);

  return <button ref={pack} type="button" className={active ? "pack-artwork pack-live" : "booster-neighbor"}
    inert={!active} aria-hidden={active ? undefined : "true"} tabIndex={active ? undefined : -1}
    onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => { start.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
    onPointerMove={(event: ReactPointerEvent<HTMLButtonElement>) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) dragged.current = true;
    }}
    onPointerUp={() => { start.current = null; }}
    onPointerCancel={() => { start.current = null; dragged.current = true; }}
    onClick={(event) => { if (event.detail > 0 && dragged.current) return; onClick(event); }}
    disabled={active ? disabled : true}>
    {/* Le sachet EST le bouton : son nom est l'action, lue mais pas affichée. */}
    {active ? <span className="sr-only">{label}</span> : null}
    {/* Sachet plat, façon TCG de poche : l'épaisseur n'est plus modélisée (les tranches
        3D donnaient le liseré), le volume vient de l'impression et du reflet. */}
    <span className="pack-idle" aria-hidden="true"><span ref={object3d} className="pack-3d-object">
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-bulge" />
        <span className="pack-glint" style={{ "--pack-art": `url(${artwork})` } as CSSProperties} />
        <span className="pack-holo" style={{ "--pack-art": `url(${artwork})` } as CSSProperties}><span ref={holo} className="pack-holo-film" /></span></span>
    </span></span>
  </button>;
}

/**
 * La scène du Drop : **un** sachet, un bouton, aucune navigation interne.
 *
 * Pas de glissé, pas de voisin, pas de sélecteur d'univers : le sachet ne peut
 * donc ni se trouer ni croiser un autre sachet. `touch-action: pan-y` laisse la
 * page défiler au doigt sur le sachet.
 */
export function BoosterCarousel({ onPrepare, disabled, canPrepare, label }: {
  onPrepare: () => void;
  disabled: boolean;
  canPrepare: boolean;
  /** Ce que fait un appui sur le sachet (« Ouvrir le booster »…). */
  label?: string;
}) {
  return <div className="booster-selector" aria-label="Booster des créateurs">
    <section className="pack-stage stage-live booster-carousel" data-universe="live" aria-label="Booster sélectionné">
      <div className="pack-shadow" />
      <div className="booster-pack-slot" data-booster="live" data-active="true">
        <PackArtwork active disabled={disabled || !canPrepare}
          label={label ?? "Ouvrir le booster Live Drop"}
          onClick={(event) => { event.currentTarget.focus(); onPrepare(); }} />
      </div>
    </section>
  </div>;
}
