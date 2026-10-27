import type { StoryRun } from "./story-mode";
export interface StoryEcho { id: string; family: string; title: string; text: string }
const RULES = [
  { since:12, flag:"refus_sponsor", family:"mona", title:"Le message de Mona", text:"Ton refus est encore dans ses messages. Elle connaît désormais ta ligne." },
  { since:12, flag:"flo_protegee", family:"flo", title:"La place de Flo", text:"Flo a pu poser ses limites. L'équipe s'en souvient." },
  { since:12, flag:"flo_epuisee", family:"flo", title:"Le siège vide", text:"Flo répond moins souvent. Le chat remarque son absence." },
  { since:12, flag:"respect_nox", family:"nox", title:"Le mot de Nox", text:"Nox n'a pas oublié que tu avais respecté son travail." },
  { since:12, flag:"debut_modeste", family:"debut", title:"Le téléphone des débuts", text:"Les images imparfaites du premier direct restent dans tes archives." },
  { since:12, flag:"micro_cher", family:"debut", title:"Le micro à crédit", text:"Tu conserves la facture de ton premier pari sur cette chaîne." },
  { since:20, flag:"recours_contrat", family:"mona", title:"La clause huit", text:"Tu as demandé un recours. Une annotation reste dans la marge du contrat." },
  { since:20, flag:"formation_modo", family:"flo", title:"Le règlement", text:"L'équipe dispose de règles écrites, même quand Flo n'est pas connectée." },
  { since:20, flag:"nox_telephone", family:"nox", title:"Le téléphone prêté", text:"Nox filme encore avec un souvenir de ton premier direct." },
  { since:28, flag:"consentement_archives", family:"archives", title:"Les autorisations", text:"Les personnes filmées ont été consultées avant la diffusion." },
  { since:28, flag:"audit_dons", family:"dons", title:"Les comptes publics", text:"Les chiffres de la collecte restent accessibles après le direct." },
  { since:28, flag:"partage_nox", family:"nox", title:"Les deux signatures", text:"La part de Nox est inscrite dans le générique." },
  { since:36, flag:"source_protegee", family:"lina", title:"La source de Lina", text:"L'identité de la source reste protégée." },
  { since:36, flag:"vote_trahi", family:"flo", title:"Le vote ignoré", text:"Le procès-verbal du collectif garde la trace de ta décision." },
  { since:36, flag:"dette_nox_reglee", family:"nox", title:"Le reçu de Nox", text:"Le travail de Nox a été payé, pas simplement promis." },
  { since:20, flag:"collecte_verifiee", family:"dons", title:"Des comptes à rendre", text:"L'association a tenu les comptes de la collecte. Les dons n'ont pas disparu dans le compteur des vues." },
  { since:20, flag:"archives_exposees", family:"archives", title:"Les images publiées trop vite", text:"Des visages ont été diffusés avant que chacun ait donné son accord. Le montage continue de circuler." },
  { since:20, flag:"charte_collectif", family:"collectif", title:"Les règles sur la table", text:"La charte écrite avec l'équipe reste une référence quand une décision divise le collectif." },
  { since:28, flag:"studio_loue", family:"studio", title:"Une régie pour une soirée", text:"Le studio loué a tenu le temps d'un direct. La facture, elle, est restée dans les comptes." },
  { since:36, flag:"source_menacee", family:"lina", title:"L'enquête a laissé une trace", text:"Le nom demandé en direct a mis la source de Lina en difficulté. Le public ne voit pas tout." },
  { since:36, flag:"filtre_agence", family:"mona", title:"Qui tient le montage ?", text:"L'agence a obtenu le dernier mot sur une publication. Cette concession pèse encore sur ta liberté." },
] as const;
// Les règles sont triées une fois, pas à chaque glissement de carte.
const RECENT_FIRST = [...RULES].sort((a, b) => b.since - a.since);

export function storyActEchoes(run: StoryRun): StoryEcho[] {
  if (run.ending || ![12,20,28,36].includes(run.step)) return [];
  const flags=new Set(run.flags), seen=new Set<string>(), echoes: StoryEcho[]=[];
  for (const r of RECENT_FIRST) {
    if (r.since > run.step || !flags.has(r.flag) || seen.has(r.family)) continue;
    echoes.push({ id:r.flag,family:r.family,title:r.title,text:r.text });
    seen.add(r.family);
    if (echoes.length===2) break;
  }
  return echoes;
}
