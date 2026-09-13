import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdir} from 'node:fs/promises';
const browser=await puppeteer.launch({executablePath:process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(s,b)=>{assert.ok(b,s);console.log('PASS '+s);};
const point=async(x,y)=>page.evaluate(({x,y})=>{const c=document.querySelector('canvas').getBoundingClientRect(),s=window.__game.scale;return{x:c.left+x*c.width/s.width,y:c.top+y*c.height/s.height};},{x,y});
const fit=()=>page.evaluate(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),h=document.getElementById('game').getBoundingClientRect();return c.left>=h.left-1&&c.top>=h.top-1&&c.right<=h.right+1&&c.bottom<=h.bottom+1&&c.width>0&&c.height>0;});
try {
 await mkdir('/tmp/fruiz-adaptive',{recursive:true});
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto(process.env.URL??'http://127.0.0.1:5177');await page.waitForFunction(()=>window.__game?.scene.isActive('Menu'));await wait(300);
 check('menu portrait contenu',await fit());
 await page.evaluate(()=>{const m=window.__game.scene;m.stop('Menu');m.start('Game',{resume:false});});await wait(200);
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');g.currentTier=1;g.nextTier=3;g.refreshPreview();g.matter.world.pause();g.spawnFruit(2,g.cx,g.containerBottom-80*g.scaleK);window.adaptiveBefore={x:g.fruits[0].x,y:g.fruits[0].y,w:g.scale.width,h:g.scale.height};});
 for(const [width,height] of [[844,390],[1024,1366],[1366,1024],[320,640]]){
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true});await wait(300);
  check(`canvas contenu ${width}x${height}`,await fit());
  check('plateau et fruit conservent leurs coordonnées',await page.evaluate(()=>{const g=window.__game.scene.getScene('Game'),b=window.adaptiveBefore;return g.scale.width===b.w&&g.scale.height===b.h&&g.fruits[0].x===b.x&&g.fruits[0].y===b.y;}));
 }
 await page.evaluate(()=>{const h=document.getElementById('game');h.style.top='32px';h.style.bottom='28px';h.style.left='12px';h.style.right='12px';});await wait(300);
 check('canvas contenu après changement des marges sûres',await fit());
 const b=await page.evaluate(()=>{const b=window.__game.scene.getScene('Game').jokerButton.button;return{x:b.x,y:b.y};});const pos=await point(b.x,b.y);await page.touchscreen.tap(pos.x,pos.y);
 check('joker correctement ciblé après redimensionnement sans lancer',await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');return g.currentTier===3&&g.fruits.length===1;}));
 const aim=await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');return{x:g.cx,y:400*g.scaleK};});const p=await point(aim.x,aim.y);await page.touchscreen.tap(p.x,p.y);
 check('lancer correctement ciblé dans le canvas centré',await page.evaluate(()=>window.__game.scene.getScene('Game').fruits.length===2));
 await page.evaluate(()=>window.__game.scene.getScene('Game').togglePause());
 await page.setViewport({width:1024,height:768,deviceScaleFactor:1,isMobile:true,hasTouch:true});await wait(300);
 check('pause conservée en paysage',await page.evaluate(()=>window.__game.scene.getScene('Game').paused)&&await fit());
 await page.screenshot({path:'/tmp/fruiz-adaptive/pause-tablet.png'});
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');g.togglePause();g.gameOver();});
 await page.waitForFunction(()=>window.__game.scene.isActive('GameOver'));await wait(1200);
 check('game over contenu en paysage',await fit());await page.screenshot({path:'/tmp/fruiz-adaptive/gameover-tablet.png'});
 await page.evaluate(()=>{const m=window.__game.scene;m.stop('GameOver');m.start('Menu');});await wait(500);
 check('retour menu contenu en paysage',await fit());
 check('aucune erreur JavaScript',errors.length===0);
} finally {await browser.close();}
