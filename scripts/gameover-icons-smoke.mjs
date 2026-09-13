/** Vérifie les icônes Game Over dans Chrome avec le vrai rendu Phaser.
 * Vite requis : URL=http://127.0.0.1:5177 node scripts/gameover-icons-smoke.mjs
 */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
const output = '/tmp/fruiz-gameover-icons';
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (label, ok) => { assert.ok(ok, label); console.log(`PASS ${label}`); };
try {
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.goto(process.env.URL ?? 'http://127.0.0.1:5177');
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
  if (process.argv.includes('--baseline')) {
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('GameOver', {score:100,best:100,bestTier:4}));
    await wait(1700);
    console.log('BEFORE', await page.evaluate(() => {
      const found=[];
      const visit=list=>list.forEach(c=>{if(c.texture?.key==='icon_trophy')found.push({width:c.getBounds().width,height:c.getBounds().height,scale:c.scaleX});if(c.list)visit(c.list);});
      visit(window.__game.scene.getScene('GameOver').children.list);return found;
    }));
    await page.screenshot({path:`${output}/before.png`});
  } else {
    for (const [width,height,dpr] of [[390,844,1],[320,640,1],[320,1000,1],[360,800,2],[720,1280,1]]) {
      await page.setViewport({width,height,deviceScaleFactor:dpr});
      await page.reload();
      await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
      await page.evaluate(()=>window.__game.scene.getScene('Menu').scene.start('GameOver',{score:100,best:100,bestTier:4}));
      await wait(1600);
      // Deux cycles complets : limites du panneau, réserve du trophée et espacement texte/icône.
      const record = await page.evaluate(async () => {
        const scene=window.__game.scene.getScene('GameOver');
        const row=scene.children.getChildren().flatMap(o=>o.list ?? []).find(o=>o.name==='game-over-new-record');
        const content=row.getByName('record-content');
        const trophy=content.getByName('record-trophy');
        const text=content.getByName('record-label');
        const k=scene.scale.height/1280;
        const pw=Math.min(scene.scale.width*.9,650*k),w=Math.min(pw*.78,470*k),h=95*k;
        const matrix=row.getWorldTransformMatrix();
        const a=matrix.transformPoint(-w/2,-h/2),b=matrix.transformPoint(w/2,h/2);
        let fits=true, separated=true;
        const initial=trophy.getBounds().width;let min=initial,max=initial;
        for(let i=0;i<90;i++) {
          const ib=trophy.getBounds(),tb=text.getBounds();
          min=Math.min(min,ib.width);max=Math.max(max,ib.width);
          fits &&= [ib,tb].every(r=>r.left>=a.x+2*k && r.right<=b.x-2*k && r.top>=a.y+2*k && r.bottom<=b.y-2*k);
          separated &&= ib.right+2*k<=tb.left;
          await new Promise(r=>setTimeout(r,20));
        }
        return {fits,separated,animated:max-min>k};
      });
      check(`record contenu et lisible ${width}×${height} DPR${dpr}`,record.fits && record.separated && record.animated);
      check('deux boutons équilibrés, aucun Accueil en double',await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameOver');
        const panel=scene.children.list.find(c=>c.list?.some(child=>child.name==='game-over-CLASSEMENT'));
        const buttons=panel.list.filter(c=>c.name.startsWith('game-over-') && c.name!=='game-over-new-record');
        const [left,right]=buttons;
        return buttons.length===2 && !panel.getByName('game-over-ACCUEIL') && left.width===right.width && Math.abs(left.x+right.x)<.001 && left.y===right.y && left.x+left.width*1.05/2 < right.x-right.width*1.05/2;
      }));
      for(const label of ['CLASSEMENT','PARTAGER']) {
        const bounds=await page.evaluate(label=>{
          const scene=window.__game.scene.getScene('GameOver');
          const panel=scene.children.list.find(c=>c.list?.some(child=>child.name===`game-over-${label}`));
          const visual=panel.getByName(`game-over-${label}`);
          const b=visual.getBounds();return {x:b.centerX/window.devicePixelRatio,y:b.centerY/window.devicePixelRatio,baseWidth:b.width,baseHeight:b.height};
        },label);
        // Répétition rapide entrée/sortie : les tweens ne doivent pas s'accumuler.
        for(let i=0;i<3;i++) {
          await page.mouse.move(bounds.x,bounds.y);await wait(35);
          await page.mouse.move(1,1);await wait(35);
        }
        await page.mouse.move(bounds.x,bounds.y);await wait(180);
        const hovered=await page.evaluate(label=>{
          const scene=window.__game.scene.getScene('GameOver');
          const panel=scene.children.list.find(c=>c.list?.some(child=>child.name===`game-over-${label}`));
          const visual=panel.getByName(`game-over-${label}`);
          const icon=visual.list.find(c=>c.texture || c.name==='button-icon');
          const text=visual.list.find(c=>c.type==='Text');
          const b=icon.getBounds(),tb=text.getBounds(),v=visual.getBounds();
          const maxW=visual.width*visual.scaleX*panel.scaleX;
          const maxH=visual.height*visual.scaleY*panel.scaleY;
          const center=visual.getWorldTransformMatrix().transformPoint(0,0);
          const fits=b.left>=center.x-maxW/2 && b.right<=center.x+maxW/2 && b.top>=center.y-maxH/2 && b.bottom<=center.y+maxH/2;
          return {fits,separated:b.bottom<tb.top,scale:visual.scaleX,width:v.width,height:v.height};
        },label);
        check(`${label} hover reste centré et contenu`,hovered.fits && hovered.separated && Math.abs(hovered.scale-1.05)<.01 && hovered.width<bounds.baseWidth*1.1 && hovered.height<bounds.baseHeight*1.1);
        await page.mouse.move(1,1);await wait(180);
        check(`${label} revient à son échelle`,await page.evaluate(label=>{
          const p=window.__game.scene.getScene('GameOver').children.list.find(c=>c.list?.some(child=>child.name===`game-over-${label}`));
          return Math.abs(p.getByName(`game-over-${label}`).scaleX-1)<.001;
        },label));
      }
      await page.screenshot({path:`${output}/after-${width}-${height}-dpr${dpr}.png`});
      const home=await page.evaluate(()=>{
        const panel=window.__game.scene.getScene('GameOver').children.list.find(c=>c.list?.some(child=>child.name==='game-over-CLASSEMENT'));
        const label=panel.list.find(c=>c.text==='MENU PRINCIPAL');
        const b=label.getBounds();return{x:b.centerX/window.devicePixelRatio,y:b.centerY/window.devicePixelRatio};
      });
      await page.mouse.click(home.x,home.y);
      await page.waitForFunction(()=>window.__game.scene.isActive('Menu'));
      check('MENU PRINCIPAL retourne au menu',true);
    }
    check('aucune erreur JavaScript',errors.length===0);
  }
} catch(e) {
  console.error('FAIL',e.message,errors);await page.screenshot({path:`${output}/failure.png`});process.exitCode=1;
} finally { await browser.close(); }
