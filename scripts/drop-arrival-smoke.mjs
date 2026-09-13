import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(s,b)=>{assert.ok(b,s);console.log('PASS '+s);};
const state=()=>page.evaluate(()=>{const g=window.__game.scene.getScene('Game');return{n:g.fruits.filter(f=>!f.isRemoved).length,locked:g.dropLocked,visible:g.previewSprite.visible};});
try {
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});await page.goto(process.env.URL??'http://127.0.0.1:5177');await page.waitForFunction(()=>window.__game?.scene.isActive('Menu'));
 await page.evaluate(()=>{const m=window.__game.scene;m.stop('Menu');m.start('Game',{resume:false});});await page.waitForFunction(()=>window.__game.scene.isActive('Game'));
 await page.evaluate(()=>window.__game.scene.getScene('Game').matter.world.pause());
 await page.touchscreen.tap(195,300);await wait(600);
 check('le délai seul ne débloque pas le fruit suivant',(await state()).locked && !(await state()).visible);
 await page.touchscreen.tap(240,300);check('second lancer refusé avant arrivée',(await state()).n===1);
 await page.evaluate(()=>window.__game.scene.getScene('Game').saveGameState());
 check('trajet enregistré dans la sauvegarde',await page.evaluate(()=>JSON.parse(localStorage.merge_fruits_game).fruits[0].awaitingArrival===true));
 await page.evaluate(()=>{const m=window.__game.scene;m.stop('Game');m.start('Game',{resume:true});});await page.waitForFunction(()=>window.__game.scene.isActive('Game'));await page.evaluate(()=>window.__game.scene.getScene('Game').matter.world.pause());
 check('reprise : attente conservée',(await state()).locked && !(await state()).visible);
 await page.touchscreen.tap(240,300);check('reprise : aucun deuxième fruit en vol',(await state()).n===1);
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game'),f=g.arrivingFruit,M=window.Phaser.Physics.Matter.Matter;M.Body.setPosition(f.body,{x:g.cx,y:f.body.position.y+g.containerTop-f.body.bounds.max.y+1});});
 await page.waitForFunction(()=>!window.__game.scene.getScene('Game').dropLocked);
 check('arrivée à la calebasse révèle le suivant',(await state()).visible);
 await wait(300);check('aucun lancer automatique du geste refusé',(await state()).n===1);
 await page.touchscreen.tap(240,300);check('nouveau geste accepté après arrivée',(await state()).n===2);
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');g.togglePause();});await wait(300);check('pause conserve le verrou',(await state()).locked);
 await page.evaluate(()=>{const g=window.__game.scene.getScene('Game');g.togglePause();g.matter.world.pause();g.arrivingFruit.isRemoved=true;});
 await page.waitForFunction(()=>!window.__game.scene.getScene('Game').dropLocked);
 check('fruit consommé par une fusion ne bloque pas la suite',(await state()).visible);
 check('aucune erreur JavaScript',errors.length===0);
}finally{await browser.close();}
