import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { MissionsView } from "@/components/missions-view";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { gameStore } from "@/lib/game-store";
import type { PointsOutcome } from "@/hooks/use-points";
import { MISSION_REWARD } from "@/lib/progression";
const NOW = Date.UTC(2026,9,15,12);
describe("Objectifs : réclamations fiables et parcours complet", () => {
 let banc: Banc;
 beforeEach(() => { banc=creerBanc(); banc.preparer(); });
 afterEach(() => { banc.nettoyer(); vi.restoreAllMocks(); });
 function ready() {
  const game=getGameView(createInitialState(NOW),NOW);
  game.missions=game.missions.map((item,index)=>({...item,done:index===0,progress:index===0?item.target:0,claimed:false}));
  game.milestones=game.milestones.slice(0,1).map((item)=>({...item,progress:item.target,claimed:false}));
  game.seasons=game.seasons.slice(0,2).map((item)=>({...item,claimable:1,claimablePoints:25,claimableHourglasses:0}));
  return game;
 }
 async function mount(game=ready(), season=vi.fn(async ():Promise<PointsOutcome>=>({status:"done",message:"Saison reçue"})), milestone=vi.fn(async ():Promise<PointsOutcome>=>({status:"done",message:"Jalon reçu"}))) {
  const onNotice=vi.fn(),onError=vi.fn();
  await banc.monter(<MissionsView game={game} onClaimSeason={season} onClaimMilestone={milestone} onNotice={onNotice} onError={onError}/>);
  return {season,milestone,onNotice,onError};
 }
 it("compte missions, jalons et paliers avec les gains du moteur",async()=>{
  const game=ready(); await mount(game);
  const summary=document.querySelector('.reward-summary-banner')!;
  expect(summary.textContent).toContain('4 récompenses prêtes');
  expect(summary.textContent).toContain(`${50+game.milestones[0].reward.points} points`);
  expect(summary.textContent).toContain(`${MISSION_REWARD.hourglasses+game.milestones[0].reward.hourglasses} sablier`);
  expect(document.querySelectorAll('progress[aria-label]')).toHaveLength(game.missions.length+game.milestones.length+game.seasons.length);
 });
 it("exécute tout en série, avec jalons et verrou synchrone contre les doubles clics",async()=>{
  vi.spyOn(gameStore,'claimMissions').mockReturnValue(1);
  let finish!:(value:PointsOutcome)=>void;
  const milestone=vi.fn(()=>new Promise<PointsOutcome>((resolve)=>{finish=resolve;}));
  const {season}=await mount(ready(),undefined,milestone);
  const all=document.querySelector<HTMLButtonElement>('.objectives-claim-all')!;
  await act(async()=>{all.click();all.click();});
  expect(milestone).toHaveBeenCalledTimes(1); expect(season).not.toHaveBeenCalled();
  expect([...document.querySelectorAll<HTMLButtonElement>('.mission-claim,.season-claim')].every((button)=>button.disabled)).toBe(true);
  await act(async()=>finish({status:'done',message:'Jalon reçu'}));
  expect(season).toHaveBeenCalledTimes(2);
  expect(document.querySelector('.objectives-feedback')?.textContent).toContain('Réclamation terminée');
  expect(document.activeElement).toBe(document.querySelector('.objectives-feedback'));
 });
 it("s’arrête sur un refus et garde le bilan déjà reçu sans faux succès global",async()=>{
  vi.spyOn(gameStore,'claimMissions').mockReturnValue(1);
  const season=vi.fn(async ():Promise<PointsOutcome>=>({status:'refused',message:'Connecte-toi pour réclamer.'}));
  const {milestone,onNotice,onError}=await mount(ready(),season);
  await act(async()=>banc.appuyer('Tout réclamer'));
  expect(milestone).toHaveBeenCalledTimes(1); expect(season).toHaveBeenCalledTimes(1);
  const feedback=document.querySelector('[role="alert"]')!;
  expect(feedback.textContent).toContain('Réclamation interrompue'); expect(feedback.textContent).toContain('Missions du jour : +1 sablier');
  expect(feedback.textContent).toContain('Jalon reçu'); expect(feedback.textContent).toContain('Connecte-toi');
  expect(onNotice).not.toHaveBeenCalled(); expect(onError).toHaveBeenCalledOnce();
 });
 it("montre une exception réseau et déverrouille pour réessayer",async()=>{
  const game=ready(); game.missions=[];game.milestones=[];
  const season=vi.fn(async ():Promise<PointsOutcome>=>{throw new Error('Réseau indisponible');});
  await mount(game,season);
  await act(async()=>banc.appuyer('Tout réclamer'));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Réseau indisponible');
  expect(document.querySelector<HTMLButtonElement>('.objectives-claim-all')!.disabled).toBe(false);
 });
 it("conserve le message déjà payé sans annoncer de gain",async()=>{
  const game=ready();game.missions=[];game.seasons=[];
  await mount(game,undefined,vi.fn(async()=>({status:'done',delta:0,message:'Ce palier était déjà payé.'})));
  await act(async()=>banc.appuyer('Tout réclamer'));
  expect(document.querySelector('.objectives-feedback')?.textContent).toContain('déjà payé');
  expect(document.querySelector('.objectives-feedback')?.textContent).not.toContain('+');
 });
 it("montre le filtre vide puis retrouve les saisons et leurs paliers",async()=>{
  const game=getGameView(createInitialState(NOW),NOW); await mount(game);
  banc.appuyer('À réclamer'); expect(document.querySelector('.objectives-season-empty')?.textContent).toContain('Aucune saison');
  banc.appuyer('Voir toutes les saisons'); expect(document.querySelectorAll('.season-row').length).toBeLessThanOrEqual(8);
  expect(document.querySelector('.season-tier-details')?.textContent).toContain('points');
  expect(document.querySelector('.reward-summary-banner')).toBeNull();
 });
 it("réclame les missions ensemble selon le comportement existant",async()=>{
  const claim=vi.spyOn(gameStore,'claimMissions').mockReturnValue(2); await mount();
  await act(async()=>document.querySelector<HTMLButtonElement>('.day-missions .mission-claim')!.click());
  expect(claim).toHaveBeenCalledTimes(1); expect(document.querySelector('.objectives-feedback')?.textContent).toContain('+2 sabliers');
 });
 it("laisse le choix de série hors de Tout réclamer et gère aussi son erreur",async()=>{
  const game=ready();game.streak.jackpot=true;
  vi.spyOn(gameStore,'claimMissions').mockReturnValue(1);
  const jackpot=vi.spyOn(gameStore,'claimStreakJackpot').mockImplementation(()=>{throw new Error('Choix déjà utilisé');});
  await mount(game); await act(async()=>banc.appuyer('Tout réclamer'));
  expect(jackpot).not.toHaveBeenCalled();
  await act(async()=>banc.appuyer('Perfect'));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Choix déjà utilisé');
 });

});
