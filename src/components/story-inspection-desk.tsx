"use client";

import { useState } from "react";
import type { StoryScene } from "../lib/story-mode";
import { compareStoryEvidence, storyInspectionFor } from "../lib/story-inspection";

function allStoryInspectionNumber(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum * 31 + id.charCodeAt(i)) % 97;
  return sum + 1;
}

/** Enquête facultative : l'inspection ne modifie jamais le choix ni la sauvegarde. */
export function StoryInspectionDesk({ scene }: { scene: StoryScene }) {
  const spec = storyInspectionFor(scene);
  const [selected, setSelected] = useState<string[]>([]);
  if (!spec) return null;

  const finding = compareStoryEvidence(spec, selected);
  const select = (id: string) => {
    setSelected(previous => previous.includes(id)
      ? previous.filter(existing => existing !== id)
      : previous.length === 2 ? [id] : [...previous, id]);
  };

  return (
    <details className="story-inspection" data-scene={scene.id} data-verified={finding?.spotted ?? false}>
      <summary><span className="story-inspection-icon" aria-hidden="true">⌕</span>
        <span className="story-inspection-title"><small>DOSSIER À VÉRIFIER · FACULTATIF</small><strong>{spec.caseName}</strong></span>
        <span className="story-inspection-mark" aria-hidden="true">+</span>
      </summary>
      <div className="story-inspection-inner">
        <p className="story-inspection-instruction">{spec.instruction} Choisis deux pièces. Tu peux ensuite décider avec le swipe ou les boutons habituels.</p>
        <div className="story-inspection-progress" aria-live="polite">
          <span>REGISTRE · {String(allStoryInspectionNumber(scene.id)).padStart(2, "0")}</span>
          <span>{selected.length} / 2 PIÈCES RETENUES</span>
        </div>
        <div className="story-inspection-evidence" role="group" aria-label="Pièces à comparer">
          {spec.evidence.map((item, index) => (
            <button key={item.id} type="button" className="story-inspection-piece" data-evidence-id={item.id}
              aria-pressed={selected.includes(item.id)} onClick={() => select(item.id)}>
              <span className="story-inspection-piece-head"><span>{String(index + 1).padStart(2, "0")} / {item.kind}</span><span className="story-inspection-check" aria-hidden="true">{selected.includes(item.id) ? "✓" : "□"}</span></span>
              <strong>{item.label}</strong>
              <span className="story-inspection-piece-value">{item.value}</span>
              <span className="story-inspection-piece-footer" aria-hidden="true">CREATORDECK · DOSSIER</span>
            </button>
          ))}
        </div>
        <div className="story-inspection-finding" role="status" aria-live="polite" data-found={finding?.spotted ?? false}>
          {finding ? (
            <><strong>{finding.spotted ? "✓ " : "◌ "}{finding.heading}</strong><p>{finding.detail}</p></>
          ) : <p>Sélectionne deux pièces pour les confronter. Rien n&apos;est enregistré tant que tu n&apos;as pas choisi une réponse.</p>}
        </div>
        {selected.length > 0 && <button type="button" className="story-inspection-reset" onClick={() => setSelected([])}>Recommencer la comparaison</button>}
      </div>
    </details>
  );
}
