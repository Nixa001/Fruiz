/** Régressions avec le vrai Phaser/Matter dans Chrome. Pas de code debug livré au joueur.
 * Serveur Vite requis. URL=http://127.0.0.1:5177 node scripts/gameplay-smoke.mjs
 * CHROME et ARTIFACT_DIR sont optionnels. Les fixtures figent les corps pour isoler les contacts.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const url = process.env.URL ?? 'http://127.0.0.1:5177';
const artifacts = process.env.ARTIFACT_DIR ?? '/tmp/fruiz-gameplay-checks';
await mkdir(artifacts, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (label, result) => { assert.ok(result, label); console.log(`PASS ${label}`); };
const game = async fn => page.evaluate(fn);
const ready = async key => page.waitForFunction(key => window.__game?.scene.isActive(key), {}, key);
const start = async (resume = false) => {
  await page.evaluate(resume => {
    const manager = window.__game.scene;
    for (const scene of manager.getScenes(true)) manager.stop(scene.scene.key);
    manager.start('Game', { resume });
  }, resume);
  await ready('Game'); await wait(120);
};
const buttonTap = async (key, label) => {
  const pos = await page.evaluate(({ key, label }) => {
    const visit = list => {
      for (const child of list) {
        if (child.text === label && child.visible) { const b = child.getBounds(); return { x: b.centerX, y: b.centerY }; }
        const found = child.list && visit(child.list); if (found) return found;
      }
    };
    return visit(window.__game.scene.getScene(key).children.list);
  }, { key, label });
  assert.ok(pos, `bouton ${label}`); await page.touchscreen.tap(pos.x, pos.y);
};
const fixture = async () => game(() => {
  const g = window.__game.scene.getScene('Game');
  for (const f of g.fruits) { f.removeBody(); f.destroy(); }
  g.fruits = [];
  g.matter.world.pause();
  const k = g.scale.height / 1280;
  const a = g.spawnFruit(1, g.cx - 7 * k, g.containerBottom - 55 * k);
  const b = g.spawnFruit(1, g.cx + 7 * k, g.containerBottom - 55 * k);
  window.fixtureParents = [a, b];
  a.body.isStatic = b.body.isStatic = true;
});
try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(url);
  await ready('Menu');
  check('chargement et menu', errors.length === 0);
  const leaked = await game(() => {
    const result = [];
    const visit = list => list.forEach(c => {
      if (!c.visible) return;
      if (c.texture && (c.texture.key === 'pasteque' || Number(c.texture.key.match(/^fruit_(\d+)$/)?.[1]) > 4)) result.push(c.texture.key);
      if (c.list) visit(c.list);
    });
    visit(window.__game.scene.getScene('Menu').children.list); return result;
  });
  check('aucun fruit verrouillé dans le menu neuf', leaked.length === 0);
  check('règles du joker : plafond, fruit identique, restauration', await page.evaluate(async () => {
    const { JokerManager } = await import('/src/systems/JokerManager.ts');
    const j = new JokerManager();
    if (j.use(1, 1) || !j.ready) return false;
    for (let i=0;i<20;i++) j.registerMerge();
    if (j.progress !== 0 || !j.use(1, 2) || j.use(1, 2)) return false;
    for (let i=0;i<3;i++) j.registerMerge();
    const restored = new JokerManager(j.snapshot());
    return !restored.ready && restored.progress===3 && new JokerManager({charges:0,merges:NaN}).progress===0;
  }));
  for (const tier of [1, 2]) {
    await start();
    await page.evaluate(tier=> { const g=window.__game.scene.getScene('Game'); g.currentTier=tier;g.nextTier=tier;g.refreshPreview(); },tier);
    await page.touchscreen.tap(195,300);await wait(950);
    await page.touchscreen.tap(195,300);
    await page.waitForFunction(()=>window.__game.scene.getScene('Game').scoreManager.score>0);
    check(`deux lancers réels du tier ${tier} fusionnent`,await page.evaluate(tier=> {
      const g=window.__game.scene.getScene('Game'); return g.fruits.some(f=>!f.isRemoved && f.def.id===tier+1);
    },tier));
  }
  await start();
  await game(() => { const g=window.__game.scene.getScene('Game'); g.currentTier=1;g.nextTier=2; });
  const multiPos = await game(()=>{const b=window.__game.scene.getScene('Game').jokerButton.button;return{x:b.x,y:b.y,id:2};});
  const cdp=await page.createCDPSession();
  const finger={x:150,y:300,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,multiPos]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('deux doigts : activer le bonus annule la visée en cours',await game(()=>window.__game.scene.getScene('Game').fruits.length===0));
  await start();
  await game(() => { const g = window.__game.scene.getScene('Game'); g.currentTier = 1; g.nextTier = 3; g.refreshPreview(); g.nextFruitUI.setTier(3); });
  const jokerPos = await game(() => { const b = window.__game.scene.getScene('Game').jokerButton.button; return { x: b.x, y: b.y }; });
  await page.touchscreen.tap(jokerPos.x, jokerPos.y);
  await wait(300);
  check('joker échange 1↔3 sans lancer ni points', await game(() => { const g = window.__game.scene.getScene('Game'); return g.currentTier === 3 && g.nextTier === 1 && !g.jokerManager.ready && g.fruits.length === 0 && g.scoreManager.score === 0; }));
  await page.touchscreen.tap(jokerPos.x, jokerPos.y);
  check('double activation ne donne pas de charge ni lancer', await game(() => window.__game.scene.getScene('Game').fruits.length === 0));
  await page.mouse.move(150, 300); await page.mouse.down(); await page.mouse.move(jokerPos.x, jokerPos.y); await page.mouse.up();
  check('relâcher une visée sur le bonus annule le lancer', await game(() => window.__game.scene.getScene('Game').fruits.length === 0));
  await page.touchscreen.tap(195, 300);
  await page.waitForFunction(() => window.__game.scene.getScene('Game').fruits.length === 1);
  const dropping = await game(() => { const g = window.__game.scene.getScene('Game'); g.saveGameState(); return { tier: g.currentTier, saved: JSON.parse(localStorage.merge_fruits_game), y: g.fruits[0].y }; });
  check('file sauvegardée avancée dès le lancer', dropping.saved.currentTier === 1 && dropping.saved.fruits[0].tier === 3);
  await start(true);
  check('reprise pendant chute : un seul fruit, bon suivant, joker dépensé', await game(() => { const g = window.__game.scene.getScene('Game'); return g.fruits.length === 1 && g.currentTier === 1 && !g.jokerManager.ready; }));
  const y1 = await game(() => window.__game.scene.getScene('Game').fruits[0].y);
  await wait(700);
  check('la physique reprend et le fruit tombe', await game(() => window.__game.scene.getScene('Game').fruits[0].y) > y1 + 30);
  await start();
  await fixture();
  await page.waitForFunction(() => window.__game.scene.getScene('Game').mergeManager.pendingBirth);
  await game(() => window.__game.scene.getScene('Game').togglePause());
  await wait(700);
  check('pause pendant fusion : score gelé, squash conservé', await game(() => { const g = window.__game.scene.getScene('Game'); return g.mergeManager.pendingBirth && g.scoreManager.score === 0 && window.fixtureParents.every(f => f.active); }));
  check('snapshot avant fusion conserve les deux parents', await game(() => JSON.parse(localStorage.merge_fruits_game).fruits.length === 2));
  await buttonTap('Game', 'MENU'); await ready('Menu'); await start(true);
  await page.waitForFunction(() => window.__game.scene.getScene('Game').scoreManager.score > 0);
  check('reprise d’une fusion : résultat et score une seule fois', await game(() => { const g = window.__game.scene.getScene('Game'); return g.scoreManager.score === 20 && g.fruits.filter(f => !f.isRemoved).length === 1; }));
  // Vérifie la non-fusion : le cercle enveloppant se croise mais pas les silhouettes.
  await start();
  const gap = await game(() => {
    const g = window.__game.scene.getScene('Game'), M = Phaser.Physics.Matter.Matter;
    g.matter.world.pause(); const k = g.scale.height / 1280;
    const a = g.spawnFruit(2, g.cx - 27.5*k, g.containerBottom-90*k);
    const b = g.spawnFruit(2, g.cx + 27.5*k, g.containerBottom-90*k);
    a.body.isStatic = b.body.isStatic = true;
    const contact = a.body.parts.slice(a.body.parts.length > 1 ? 1 : 0).some(p => M.Query.collides(p,[b.body]).length);
    return { contact, near: Math.hypot(a.x-b.x,a.y-b.y) < (a.mergeReach+b.mergeReach)*1.02 };
  });
  check('fixture silhouettes séparées dans les anciens cercles de proximité', gap.near && !gap.contact);
  await wait(850);
  check('aucune fusion à distance', await game(() => { const g = window.__game.scene.getScene('Game'); return g.scoreManager.score === 0 && g.fruits.length === 2; }));
  // Une paire en attente qui s'écarte ne doit plus fusionner.
  await game(() => { const g = window.__game.scene.getScene('Game'); g.mergeManager.pending.push({ a: g.fruits[0], b: g.fruits[1] }); });
  await wait(200);
  check('contact revérifié avant consommation de la file', await game(() => window.__game.scene.getScene('Game').scoreManager.score === 0));
  // Recharge via huit fusions réelles, compteurs et tableaux remis au propre entre fixtures.
  await start();
  await game(() => { const g = window.__game.scene.getScene('Game'); g.currentTier = 1; g.nextTier = 2; g.useJoker(); });
  for (let i = 0; i < 8; i++) {
    await page.waitForFunction(() => !window.__game.scene.getScene('Game').mergeManager.busy);
    const before = await game(() => window.__game.scene.getScene('Game').scoreManager.score);
    await fixture();
    await page.waitForFunction(before => window.__game.scene.getScene('Game').scoreManager.score > before, {}, before);
    if (i === 6) check('sept fusions : recharge encore incomplète', await game(() => { const j = window.__game.scene.getScene('Game').jokerManager; return !j.ready && j.progress === 7; }));
  }
  check('huit fusions : exactement une charge', await game(() => window.__game.scene.getScene('Game').jokerManager.ready));
  check('combos successifs malgré le ralentissement', await game(() => window.__game.scene.getScene('Game').comboManager.getCombo() >= 3));
  await page.waitForFunction(() => !window.__game.scene.getScene('Game').mergeManager.busy);
  await game(() => window.__game.scene.getScene('Game').togglePause()); await wait(1300);
  await buttonTap('Game', 'REPRENDRE');
  const comboBefore = await game(() => window.__game.scene.getScene('Game').comboManager.getCombo());
  await fixture();
  await page.waitForFunction(() => window.__game.scene.getScene('Game').mergeManager.pendingBirth);
  await page.waitForFunction(() => !window.__game.scene.getScene('Game').mergeManager.pendingBirth);
  check('pause exclue de la fenêtre de combo', await game(() => window.__game.scene.getScene('Game').comboManager.getCombo()) >= comboBefore);
  // Renouvellement du popup : l'ancien délai ne détruit pas le nouveau.
  await game(() => window.__game.scene.getScene('Game').comboPopup.show(2)); await wait(1100);
  await game(() => window.__game.scene.getScene('Game').comboPopup.show(8)); await wait(1800);
  check('dernier popup combo toujours visible', await game(() => window.__game.scene.getScene('Game').comboPopup.container?.active));
  await page.screenshot({ path: `${artifacts}/game-390.png` });
  // Ancien format : champs bonus / angle / vitesse absents.
  await game(() => { localStorage.merge_fruits_game = JSON.stringify({ score: 10, bestTier: 4, currentTier: 1, nextTier: 2, fruits: [{tier: 1, nx: 0, ny: 0.7}] }); });
  await start(true);
  check('ancienne sauvegarde compatible', await game(() => { const g = window.__game.scene.getScene('Game'); return g.jokerManager.ready && g.scoreManager.score === 10 && g.fruits.length === 1; }));
  await game(() => {
    const g=window.__game.scene.getScene('Game'),M=Phaser.Physics.Matter.Matter;
    g.matter.world.pause();M.Body.setAngle(g.fruits[0].body,0.71);g.saveGameState();
    const original=g.restoreSavedGame;
    g.restoreSavedGame=function(saved) { original.call(this,saved);window.restoredAngle=this.fruits[0].body.angle;this.restoreSavedGame=original; };
  });
  await start(true);
  check('rotation effectivement restaurée avant simulation',await game(()=>Math.abs(window.restoredAngle-.71)<.0001));
  // Orientation conservée dans un empilement serré (physique figée pour comparer).
  await game(() => {
    const g = window.__game.scene.getScene('Game'), M = Phaser.Physics.Matter.Matter;
    g.matter.world.pause();
    M.Body.setAngle(g.fruits[0].body, 0.71);
    for (let i=0;i<6;i++) g.spawnFruit(i%4+1,g.cx+(i%3-1)*35,g.containerTop+50+Math.floor(i/3)*45);
    g.currentTier=1;g.nextTier=3;g.useJoker();g.saveGameState();
    window.pileSaved=JSON.parse(localStorage.merge_fruits_game);
  });
  check('bonus près du bord : zéro corps ajouté', await game(() => window.pileSaved.fruits.length === 7));
  await start(true);
  check('reprise d’empilement avec joker consommé', await game(() => {
    const g=window.__game.scene.getScene('Game');
    return g.fruits.length > 0 && window.pileSaved.fruits.some(f=>Math.abs(f.angle-.71)<.01) && !g.jokerManager.ready;
  }));
  for (const [width,height] of [[320,640],[360,800],[720,1280]]) {
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true}); await wait(120);
    check(`bonus repositionné après redimensionnement ${width}×${height}`,await game(()=> {
      const g=window.__game.scene.getScene('Game'),b=g.jokerButton.button.getBounds();return b.left>=0 && b.right<=g.scale.width && b.bottom<g.scale.height;
    }));
    await start();
    check(`bouton et texte contenus sur ${width}×${height}`, await game(() => {
      const g=window.__game.scene.getScene('Game'), b=g.jokerButton.button.getBounds(), t=g.jokerButton.hint.getBounds();
      return b.left>=0 && b.right<=g.scale.width && b.bottom<g.scale.height && t.left>=0 && t.right<=g.scale.width && t.bottom<g.scale.height;
    }));
    await page.screenshot({path:`${artifacts}/game-${width}.png`});
  }
  await game(() => { const g=window.__game.scene.getScene('Game'); g.gameOver(); g.dropCurrent(); });
  check('aucun lancer pendant la fin de partie', await game(() => window.__game.scene.getScene('Game').fruits.length===0));
  await ready('GameOver'); await wait(1600); await buttonTap('GameOver','REJOUER'); await ready('Game');
  check('rejouer démarre une partie avec une seule charge',await game(()=>window.__game.scene.getScene('Game').jokerManager.ready));
  check('une seule piste musicale après les changements de scène',await game(()=>window.__game.sound.getAll('Baobab_Morning').length===1));
  await game(()=>window.dispatchEvent(new Event('pagehide')));await wait(100);
  check('sortie de l’app : partie en pause et sauvegardée',await game(()=>window.__game.scene.getScene('Game').paused && !!localStorage.merge_fruits_game));
  check('musique suspendue à la sortie',await game(()=>!window.__game.sound.getAll('Baobab_Morning').some(s=>s.isPlaying)));
  await game(()=>document.dispatchEvent(new Event('visibilitychange')));await wait(200);
  check('retour : une seule piste et reprise du jeu manuelle',await game(()=>window.__game.sound.getAll('Baobab_Morning').length===1 && window.__game.scene.getScene('Game').paused));
  await buttonTap('Game','PARAMÈTRES');await wait(250);await buttonTap('Game','FERMER');
  check('paramètres accessibles pendant la pause',await game(()=>window.__game.scene.getScene('Game').paused));
  await buttonTap('Game','MENU');await ready('Menu');await wait(450);
  await buttonTap('Menu','NOUVELLE PARTIE');await ready('Game');
  check('nouvelle partie depuis le menu malgré une sauvegarde',await game(()=>{const g=window.__game.scene.getScene('Game');return g.fruits.length===0 && g.scoreManager.score===0 && g.jokerManager.ready;}));
  check('aucune erreur JavaScript', errors.length===0);
  console.log(`Captures : ${artifacts}`);
} catch (e) {
  console.error('FAIL', e.message, errors); await page.screenshot({path:`${artifacts}/failure.png`}); process.exitCode=1;
} finally { await browser.close(); }
