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
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(label,ok)=>{assert.ok(ok,label);console.log(`PASS ${label}`);};
const state=()=>page.evaluate(()=>{const g=window.__game.scene.getScene('Game');return{count:g.fruits.filter(f=>!f.isRemoved).length,queued:g.queuedDropX,aim:g.aimPointerId,paused:g.paused};});
const start=async()=>{
 await page.evaluate(()=>{const m=window.__game.scene;for(const s of m.getScenes(true))m.stop(s.scene.key);m.start('Game',{resume:false});});
 await page.waitForFunction(()=>window.__game.scene.isActive('Game'));await wait(100);
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');g.currentTier=1;g.nextTier=3;g.refreshPreview();});
};
const lock=async(kind)=>page.evaluate(kind=>{
 const g=window.__game.scene.getScene('Game');
 if(kind==='fusion'){g.mergeManager.pendingBirth=true;g.time.delayedCall(450,()=>{g.mergeManager.pendingBirth=false;});}
 else{g.dropLocked=true;g.time.delayedCall(450,()=>{g.dropLocked=false;});}
},kind);
try {
 await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await page.goto(process.env.URL ?? 'http://127.0.0.1:5177');
 await page.waitForFunction(()=>window.__game?.scene.isActive('Menu'));
 check('mascotte du menu : original HD au lieu du fruit miniature',await page.evaluate(()=>{
  const menu=window.__game.scene.getScene('Menu');const group=menu.children.list.find(o=>o.list?.some(c=>c.name==='menu-mascot-image'));
  const img=group.getByName('menu-mascot-image');return img.texture.key==='menu_fruit_4' && img.frame.width===438 && img.frame.height===569 && img.scaleX<1;
 }));
 await page.screenshot({path:`${output}/menu-hd-dpr3.png`});
 await start();
 for(const kind of ['cooldown','fusion']) {
  await start();await lock(kind);await page.touchscreen.tap(245,300);
  check(`relâchement mémorisé pendant ${kind}`, (await state()).queued!==null);
  await wait(700);const after=await state();
  check(`un seul lancer automatique après ${kind}`,after.count===1 && after.queued===null);
  await wait(500);check('pas de deuxième lancer involontaire',(await state()).count===1);
 }
 await start();await page.touchscreen.tap(145,300);await page.touchscreen.tap(245,300);
 await wait(1000);check('relâchement pendant mi-chute conservé pour le fruit suivant',(await state()).count===2);
 await start();await lock('fusion');await page.touchscreen.tap(195,300);
 const bonus=await page.evaluate(()=>{const b=window.__game.scene.getScene('Game').jokerButton.button;return{x:b.x/window.devicePixelRatio,y:b.y/window.devicePixelRatio};});
 await page.touchscreen.tap(bonus.x,bonus.y);await wait(650);
 check('bonus annule un lancer en attente, aucun lancer parasite',(await state()).count===0 && (await state()).queued===null);
 await start();await lock('cooldown');await page.touchscreen.tap(195,300);
 await page.evaluate(()=>window.__game.scene.getScene('Game').togglePause());await wait(550);
 check('pause annule un lancer en attente',(await state()).count===0 && (await state()).queued===null);
 await page.evaluate(()=>window.__game.scene.getScene('Game').togglePause());await wait(700);
 check('reprendre ne relance pas le geste annulé',(await state()).count===0);
 await start();await lock('fusion');await page.touchscreen.tap(195,300);
 const cdp=await page.createCDPSession();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:240,y:300,id:1}]});
 await wait(600);check('reprendre la visée empêche le lancement différé',(await state()).count===0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(120);
 check('le nouveau relâchement lance exactement une fois',(await state()).count===1);
 await start();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:300,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await wait(250);
 check('touchcancel Android ne déclenche pas de lancer',(await state()).count===0 && (await state()).aim===null);
 await page.touchscreen.tap(195,300);await wait(150);
 check('un geste annulé ne bloque pas le geste suivant',(await state()).count===1);
 await start();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:300,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bonus.x,y:bonus.y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(450);
 check('relâcher sur le joker annule la visée',(await state()).count===0);
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
