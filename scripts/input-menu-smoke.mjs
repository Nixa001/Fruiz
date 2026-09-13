/** Vite + Chrome : relâchement tactile pendant les verrous et mascottes originales HD.
 * URL=http://127.0.0.1:5177 node scripts/input-menu-smoke.mjs
 */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdir} from 'node:fs/promises';
const output='/tmp/fruiz-input-menu';await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(label,ok)=>{assert.ok(ok,label);console.log(`PASS ${label}`);};
try {
 await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await page.goto(process.env.URL ?? 'http://127.0.0.1:5177');
 await page.waitForFunction(()=>window.__game?.scene.isActive('Menu'));
 check('mascotte du menu : original HD au lieu du fruit miniature',await page.evaluate(()=>{
  const menu=window.__game.scene.getScene('Menu');const group=menu.children.list.find(o=>o.list?.some(c=>c.name==='menu-mascot-image'));
  const img=group.getByName('menu-mascot-image');return img.texture.key==='menu_fruit_4' && img.frame.width===438 && img.frame.height===569 && img.scaleX<1;
 }));
 await page.screenshot({path:`${output}/menu-hd-dpr3.png`});
 // Changement de mascotte après progression : aucune preview d'un fruit non débloqué.
 for(const tier of [5,6,7,8,9,10,11,12]) {
  await page.evaluate(tier=>{localStorage.setItem('merge_fruits_unlocked',String(tier));const m=window.__game.scene;for(const s of m.getScenes(true))m.stop(s.scene.key);m.start('Menu');},tier);
  await page.waitForFunction(tier=>{const s=window.__game.scene.getScene('Menu');return s.scene.isActive() && s.children.list.some(o=>o.list?.some(c=>c.name==='menu-mascot-image' && c.texture.key===`menu_fruit_${tier}`));},{},tier);
  check(`mascotte HD tier ${tier} chargée après déblocage`,await page.evaluate(tier=>{
   const tex=window.__game.textures.get(`menu_fruit_${tier}`),lo=window.__game.textures.get(`fruit_${tier}`);
   return tex.get('visible').width>lo.get().width;
  },tier));
 }
 await page.screenshot({path:`${output}/menu-watermelon-hd-dpr3.png`});
 check('aucune erreur JavaScript',errors.length===0);
} catch(e) {console.error('FAIL',e.message,errors);await page.screenshot({path:`${output}/failure.png`});process.exitCode=1;}
finally{await browser.close();}
