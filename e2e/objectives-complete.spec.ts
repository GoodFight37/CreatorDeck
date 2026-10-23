import { expect, test, gotoDeck } from "./fixtures";
import { SEASONS } from "../src/lib/seasons";
import creatorData from "../src/data/creators.json";
import { getGameView, type PlayerState } from "../src/lib/game-engine";
import { gameDay, MISSION_REWARD } from "../src/lib/progression";

test("Objectifs : quotidien, collection, saisons et filtres sur téléphone",async({page})=>{
 await gotoDeck(page);
 await page.getByRole('button',{name:'Objectifs',exact:true}).click({force:true});
 await expect(page.getByRole('heading',{name:'Objectifs et saisons',exact:true})).toBeVisible();
 // D-148 : deux missions au jour 1, Recyclage et Tribunal arrivent à partir du jour 2.
 await expect(page.locator('.day-missions .mission-row')).toHaveCount(2);
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
 await page.getByRole('link',{name:'Saisons',exact:true}).click();
 await page.getByRole('button',{name:'À réclamer',exact:true}).click();
 await expect(page.locator('.objectives-season-empty')).toBeVisible();
 await page.getByRole('button',{name:'Voir toutes les saisons',exact:true}).click();
 await expect(page.locator('.season-row')).toHaveCount(8);
 await page.locator('.season-tier-details summary').first().click();
 await expect(page.locator('.season-tier-details').first()).toContainText('points');
 await page.screenshot({path:'test-results/objectives-seasons-390.png'});
 await page.screenshot({path:'test-results/objectives-day-390.png'});
});

test("Objectifs : tout réclamer crédite missions, jalons et saisons une seule fois",async({page})=>{
 await gotoDeck(page);
 const season=[...SEASONS].filter((entry)=>entry.slugs.length>=12).sort((a,b)=>a.slugs.length-b.slugs.length)[0];
 const cards=creatorData.filter((entry)=>season.slugs.includes(entry.slug));
 await page.evaluate(({cards,day})=>{
  const key=Object.keys(localStorage).find((key)=>/^creatordeck.save.v\d+$/.test(key))!;
  const state=JSON.parse(localStorage.getItem(key)!);
  state.cards=cards.map((creator,index)=>({id:`objective-${index}`,creatorSlug:creator.slug,rarity:creator.rarity,variant:'standard',obtainedAt:Date.now()+index,rareDrop:false}));
  state.openings=1;state.missionDay=day;state.missions={pack:1};
  localStorage.setItem(key,JSON.stringify(state));
 },{cards,day:gameDay(Date.now())});
 await page.reload();
 const read=()=>page.evaluate(()=>{
  const key=Object.keys(localStorage).find((key)=>/^creatordeck.save.v\d+$/.test(key))!;
  return JSON.parse(localStorage.getItem(key)!) as PlayerState;
 });
 const before=await read(), view=getGameView(before,Date.now());
 const pending=view.milestones.filter((item)=>item.progress>=item.target&&!item.claimed);
 const points=pending.reduce((sum,item)=>sum+item.reward.points,0)+view.seasons.reduce((sum,item)=>sum+item.claimablePoints,0);
 const hourglasses=view.missions.filter((item)=>item.done&&!item.claimed).length*MISSION_REWARD.hourglasses+pending.reduce((sum,item)=>sum+item.reward.hourglasses,0)+view.seasons.reduce((sum,item)=>sum+item.claimableHourglasses,0);
 expect(view.seasons.some((season)=>season.claimable>0)).toBe(true);
 await page.getByRole('button',{name:'Objectifs',exact:true}).click({force:true});
 const button=page.getByRole('button',{name:'Tout réclamer',exact:true});
 await button.evaluate((node)=>{(node as HTMLButtonElement).click();(node as HTMLButtonElement).click();});
 await expect(page.locator('.objectives-feedback')).toContainText('Réclamation terminée');
 await expect(page.locator('.objectives-feedback')).toBeFocused();
 await expect(page.locator('.reward-summary-banner')).toHaveCount(0);
 const after=await read(); expect(after.points).toBe(before.points+points);expect(after.hourglasses).toBe(before.hourglasses+hourglasses);
 await page.screenshot({path:'test-results/objectives-result-390.png'});
 await page.reload();
 const final=await read();expect(final.points).toBe(after.points);expect(final.hourglasses).toBe(after.hourglasses);
});
