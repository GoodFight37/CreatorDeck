import type { StoryRun } from "./story-mode";
import { STORY_PROLOGUE } from "../data/story-prologue";

export interface StoryBond {
  id: "flo" | "nox" | "mona" | "lina";
  name: string;
  initials: string;
  status: string;
  detail: string;
}

/** Les relations ne sont que des lectures de décisions validées, sans score secret. */
const speakerByScene = new Map(STORY_PROLOGUE.scenes.map(scene => [scene.id, scene.speaker] as const));

export function storyBonds(run: StoryRun): StoryBond[] {
  const f = new Set(run.flags);
  const encountered = (prefix: string) => run.history.some(entry => speakerByScene.get(entry.sceneId)?.startsWith(prefix));
  const bonds: StoryBond[] = [];
  if ((["flo_protegee","flo_epuisee","rupture_flo","reconciliation_flo","vote_respecte","vote_trahi","saison_collective"].some(k => f.has(k)) || encountered("FLO"))) {
    const watchingFreely = f.has("flo_spectatrice_libre");
    const broken = f.has("rupture_flo") && !f.has("reconciliation_flo") && !watchingFreely;
    const repaired = f.has("reconciliation_flo");
    bonds.push({ id:"flo", name:"Flo", initials:"FL",
      status: watchingFreely ? "Lien retrouvé, sans obligation" : repaired ? "Dialogue retrouvé" : broken ? "Lien rompu" : f.has("vote_trahi") ? "Confiance fragilisée" : f.has("flo_epuisee") ? "À bout de souffle" : f.has("flo_protegee") ? "Limites respectées" : f.has("flo_modo") ? "Modération en place" : "Premiers échanges",
      detail: watchingFreely ? "Flo peut regarder tes directs sans reprendre la modération. Vous avez renoué le contact, chacun à sa place." : repaired ? "Des excuses ont rouvert la discussion, sans effacer le passé." : broken ? "La rupture reste une décision qui pèse." : f.has("vote_trahi") ? "Le vote du collectif a été contourné." : f.has("flo_epuisee") ? "La charge de modération reste lourde." : f.has("flo_protegee") ? "Son travail et son temps comptent dans tes choix." : f.has("flo_modo") ? "Flo a accepté de modérer tes premiers directs." : "Vous avez commencé à discuter dans le chat." });
  }
  if ((["respect_nox","guerre_nox","duo_nox","pacte_brise","paix_durable_nox","paix_nox","dette_nox_refusee","dette_nox_reglee"].some(k => f.has(k)) || encountered("NOX"))) {
    bonds.push({ id:"nox", name:"Nox", initials:"NX",
      status: f.has("paix_durable_nox") ? "Paix durable" : f.has("paix_nox") ? "Conflit apaisé" : f.has("pacte_brise") || f.has("dette_nox_refusee") ? "Promesse abîmée" : f.has("guerre_nox") ? "Rivalité ouverte" : f.has("duo_nox") ? "Projet commun" : f.has("humiliation_nox") ? "Départ conflictuel" : f.has("respect_nox") ? "Respect mutuel" : "Premiers échanges",
      detail: f.has("paix_durable_nox") ? "La rivalité n'est plus le centre de votre histoire." : f.has("paix_nox") ? "Vous avez choisi de ne plus nourrir l'escalade." : f.has("pacte_brise") || f.has("dette_nox_refusee") ? "Nox a de bonnes raisons de garder ses distances." : f.has("guerre_nox") ? "Vos publics voient vos désaccords." : f.has("duo_nox") ? "Un projet oblige à partager le mérite." : f.has("humiliation_nox") ? "Le clip sur Nox a laissé des traces." : f.has("respect_nox") ? "Une bonne relation peut exister entre concurrents." : "Vos chaînes se croisent pour la première fois." });
  }
  if (["agence","sponsor_cache","sponsor_clair","refus_sponsor","recours_contrat","filtre_agence"].some(k => f.has(k))) {
    bonds.push({ id:"mona", name:"Mona", initials:"MO",
      status: f.has("filtre_agence") ? "Contrôle éditorial cédé" : f.has("recours_contrat") ? "Contrat contesté" : f.has("sponsor_cache") ? "Accord opaque" : f.has("agence") ? "Exclusivité signée" : f.has("refus_sponsor") ? "Proposition refusée" : "Accord déclaré",
      detail: f.has("filtre_agence") ? "L'agence peut décider ce qui paraît." : f.has("recours_contrat") ? "Tu as demandé des garde-fous écrits." : f.has("sponsor_cache") ? "La transparence reste un enjeu." : f.has("agence") ? "Ton autonomie dépend de clauses." : f.has("refus_sponsor") ? "Tu as donné la priorité à tes limites." : "Les conditions ont été dites au public." });
  }
  if ((["lina_preuves","source_protegee","source_menacee"].some(k => f.has(k)) || encountered("LINA"))) {
    bonds.push({ id:"lina", name:"Lina", initials:"LI",
      status: f.has("source_menacee") ? "Source menacée" : f.has("source_protegee") ? "Source protégée" : f.has("lina_preuves") ? "Enquête documentée" : "Enquête en cours",
      detail: f.has("source_menacee") ? "La recherche d'un nom a mis quelqu'un en difficulté." : f.has("source_protegee") ? "L'enquête avance sans exposer son informateur." : f.has("lina_preuves") ? "La journaliste dispose de pièces concrètes." : "Lina recoupe encore les faits." });
  }
  return bonds;
}
