/** Mise en scène purement visuelle : déduite de la progression existante, jamais sauvegardée. */
export type StoryCareerStage = "debut" | "equipe" | "studio";

/** Le décor de LIVE monte en gamme seulement si la carrière peut le financer. */
export function storyCareerStage(step: number, argent: number): StoryCareerStage {
  if (step >= 28 && argent >= 45) return "studio";
  if (step >= 12 && argent >= 30) return "equipe";
  return "debut";
}
