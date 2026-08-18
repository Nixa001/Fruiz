/**
 * Test de fumée : lance le jeu dans Chrome headless (mobile 390x844),
 * vérifie démarrage, navigation Menu → Game, drop de fruits, physique
 * et couleurs rendues. Exit 1 si un test échoue.
 * Usage : node scripts/smoke.mjs   (serveur dev requis sur :5175)
 */
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL ?? 'http://localhost:5175/';

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--window-size=390,844', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message} :: ${String(e.stack).split('\n').slice(1, 3).join(' | ')}`));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

// --- Menu ---
let state = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return null;
  return { active: game.scene.getScenes(true).map((s) => s.scene.key) };
});
check('jeu démarré (objet Phaser global)', state !== null);
check('Menu actif après boot', state?.active.includes('Menu') === true, state?.active.join(','));

// Couleurs : fond cahier crème en haut, bol crème au centre
// (snapshot via le renderer Phaser : le canvas WebGL n'est pas lisible directement)
const px = await page.evaluate(async () => {
  const game = window.__game;
  const snap = await new Promise((res) => game.renderer.snapshot((img) => res(img)));
  const off = document.createElement('canvas');
  off.width = snap.width;
  off.height = snap.height;
  const ctx = off.getContext('2d');
  ctx.drawImage(snap, 0, 0);
  const s = (x, y) => {
    const d = ctx.getImageData(Math.round((x / snap.width) * snap.width), Math.round((y / snap.height) * snap.height), 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  return { bg: s(10, 60), bowl: s(195, 500) };
});
check('fond cahier rendu', px && px.bg[0] > 240 && px.bg[1] > 228, px?.bg.join(','));

// --- Navigation vers le jeu ---
const k = 844 / 1280;
await page.touchscreen.tap(195, 636);
await new Promise((r) => setTimeout(r, 1800));
state = await page.evaluate(() => {
  const game = window.__game;
  const gs = game.scene.getScene('Game');
  return {
    active: game.scene.getScenes(true).map((s) => s.scene.key),
    fruits: gs.fruits.length,
    dynamicBodies: gs.matter.world.engine.world.bodies.filter((b) => !b.isStatic).length,
  };
});
check('scène Game active après tap JOUER', state?.active.includes('Game') === true, state?.active.join(','));
check('pas de fruit avant premier drop', state?.fruits === 0, `fruits=${state?.fruits}`);
check('0 corps dynamique avant drop', state?.dynamicBodies === 0, `bodies=${state?.dynamicBodies}`);

// Bol rendu au centre (échantillon après navigation, avant tout drop)
const pxGame = await page.evaluate(async () => {
  const game = window.__game;
  const snap = await new Promise((res) => game.renderer.snapshot((img) => res(img)));
  const off = document.createElement('canvas');
  off.width = snap.width;
  off.height = snap.height;
  const ctx = off.getContext('2d');
  ctx.drawImage(snap, 0, 0);
  const d = ctx.getImageData(Math.round((195 / 390) * snap.width), Math.round((640 / 844) * snap.height), 1, 1).data;
  return [d[0], d[1], d[2]];
});
check(
  'intérieur calebasse rendu au centre',
  pxGame[0] > 210 && pxGame[1] > 185 && pxGame[2] > 140 && pxGame[2] < 215,
  pxGame.join(','),
);

// --- Drop 1 : le fruit doit tomber (position y qui augmente) ---
// Tiers forcés différents (1 puis 3) : pas de fusion possible, test déterministe
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.currentTier = 1;
  gs.nextTier = 3;
});
await page.mouse.move(160, 300);
await page.mouse.down();
await page.mouse.move(240, 300, { steps: 6 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 300));
const pos1 = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  // fruits triés par y : on suit le fruit lâché (tier 1)
  const f = gs.fruits.find((x) => x.def.id === 1);
  return f ? { y: f.body.position.y, x: f.body.position.x } : null;
});
await new Promise((r) => setTimeout(r, 1200));
const pos2 = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  const f = gs.fruits.find((x) => x.def.id === 1);
  return f ? { y: f.body.position.y, x: f.body.position.x } : null;
});
check('fruit spawné après drop', pos1 !== null, `fruits position=${pos1?.y}`);
check('fruit tombe (physique active)', pos1 && pos2 && pos2.y > pos1.y + 100, `y ${pos1?.y.toFixed(0)} -> ${pos2?.y.toFixed(0)}`);
check('fruit suit le doigt (x proche du relâché)', pos1 && Math.abs(pos1.x - 240) < 8, `x=${pos1?.x.toFixed(0)}`);

// --- Drop 2 ---
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.currentTier = 3;
  gs.nextTier = 1;
});
await page.mouse.move(170, 300);
await page.mouse.down();
await page.mouse.move(170, 300, { steps: 2 });
await page.mouse.up();
// attendre largement : si les 2 fruits fusionnent (même tier aléatoire),
// l'animation de fusion prend ~110 ms avant l'apparition du nouveau fruit
await new Promise((r) => setTimeout(r, 2600));
state = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return {
    fruits: gs.fruits.length,
    bodies: gs.matter.world.engine.world.bodies.filter((b) => !b.isStatic).length,
    previewX: gs.previewX,
  };
});
check('2 fruits après 2 drops', state?.fruits === 2, `fruits=${state?.fruits}`);
check('corps physiques = fruits', state?.bodies === state?.fruits, `bodies=${state?.bodies}`);

// --- Fusion + chaîne + combo (setup déterministe) ---
// Setup : tier5 + tier6 épinglés près du fond (statiques : pas de roulage sur le V),
// on lâche un tier5 dessus : tier5+tier5 → tier6, qui touche le tier6 épinglé → tier7.
const restartRes = await page.evaluate(() => {
  try {
    window.__game.scene.getScene('Game').scene.restart();
    return 'ok';
  } catch (e) {
    return `ERR: ${e.message}`;
  }
});
check('scene restart OK', restartRes === 'ok', restartRes);
await new Promise((r) => setTimeout(r, 1200));
const setupRes = await page.evaluate(() => {
  try {
    const gs = window.__game.scene.getScene('Game');
    gs.spawnFruit(5, 175, 630);
    gs.spawnFruit(6, 215, 630);
    // Épinglage : statiques ET éveillés (un statique endormi ne génère
    // aucune paire de collision avec les fruits qui tombent)
    for (const f of gs.fruits) {
      f.body.isStatic = true;
      f.body.isSleeping = false;
    }
    return 'ok';
  } catch (e) {
    return `ERR: ${e.message}`;
  }
});
check('setup fruits OK', setupRes === 'ok', setupRes);
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.currentTier = 5;
  gs.nextTier = 5;
});
await page.mouse.move(195, 300);
await page.mouse.down();
await page.mouse.move(195, 300, { steps: 2 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 4000));
const mergeState = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return {
    fruits: gs.fruits.length,
    tiers: gs.fruits.map((f) => f.def.id),
    score: gs.scoreManager.score,
    combo: gs.comboManager.getCombo(),
    bestTier: gs.mergeManager.bestTier,
  };
});
check('chaîne de fusions → 1 fruit', mergeState.fruits === 1, `fruits=${mergeState.fruits} tiers=${mergeState.tiers}`);
check('fruit final = niveau 7 (5+5→6, 6+6→7)', mergeState.tiers[0] === 7, mergeState.tiers.join(','));
check('score chaîne = 280 (80 + 200)', mergeState.score === 280, `score=${mergeState.score}`);
check('combo ×2 enregistré', mergeState.combo === 2, `combo=${mergeState.combo}`);
check('bestTier = 7', mergeState.bestTier === 7, `bestTier=${mergeState.bestTier}`);

await page.screenshot({ path: '/tmp/smoke_game.png' });

// --- Filet de sécurité : fusion par proximité (sans événement de collision) ---
await page.evaluate(() => window.__game.scene.getScene('Game').scene.restart());
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  const a = gs.spawnFruit(2, 195, 700);
  const b = gs.spawnFruit(2, 202, 700);
  // statiques + superposés : aucun événement de collision ne peut se produire,
  // seul le scan de proximité peut détecter la fusion
  a.body.isStatic = true;
  b.body.isStatic = true;
});
await new Promise((r) => setTimeout(r, 800));
const proxState = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return { fruits: gs.fruits.length, tiers: gs.fruits.map((f) => f.def.id), score: gs.scoreManager.score };
});
check('fusion par proximité (2 statiques superposés)', proxState.fruits === 1 && proxState.tiers[0] === 3, JSON.stringify(proxState));
check('score fusion par proximité = 30', proxState.score === 30, `score=${proxState.score}`);

// --- Règle Ball Guys : fruit qui s'échappe = game over ---
// Repart propre + un fruit tier 7 qu'on téléporte À L'EXTÉRIEUR du bol,
// sous le rebord : doit déclencher le game over immédiatement.
await page.evaluate(() => window.__game.scene.getScene('Game').scene.restart());
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  // score de référence pour vérifier la persistance du best au game over
  gs.scoreManager.score = 220;
  gs.scoreManager.best = 220;
  const f = gs.spawnFruit(7, 195, 700);
  f.body.position.x = gs.cx + (gs.containerRight - gs.containerLeft) / 2 + 70;
  f.body.position.y = gs.containerTop + 30;
  // Verlet : positionPrev doit suivre, sinon la vélocité explose
  f.body.positionPrev.x = f.body.position.x;
  f.body.positionPrev.y = f.body.position.y;
  f.body.velocity.x = 0;
  f.body.velocity.y = 0;
});
await new Promise((r) => setTimeout(r, 2500));
const goState = await page.evaluate(() => ({
  active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
  best: window.__game.scene.getScene('GameOver')?.bestDisplayed ?? null,
}));
check('fruit échappé → game over (règle Ball Guys)', goState.active.includes('GameOver') === true, goState.active.join(','));
const bestSaved = await page.evaluate(() => window.localStorage.getItem('merge_fruits_best'));
check('best score persisté (localStorage)', bestSaved !== null && parseInt(bestSaved, 10) === 220, `best=${bestSaved}`);

// --- Interface : REJOUER → Game, MENU → panneaux ---
// REJOUER (gros bouton sous le panneau GameOver, 390x844)
await page.touchscreen.tap(195, 447);
await new Promise((r) => setTimeout(r, 1500));
const replayState = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return {
    active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
    nextShown: gs.nextFruitUI.lastTier === gs.nextTier,
  };
});
check('REJOUER relance la partie', replayState.active.includes('Game') === true, replayState.active.join(','));
check('carte NEXT synchronisée', replayState.nextShown === true);

// MENU
await page.evaluate(() => window.__game.scene.getScene('Game').scene.start('Menu'));
await new Promise((r) => setTimeout(r, 1200));

// FRUITS panel (bouton FRUITS à (124, 710) sur 390x844)
await page.touchscreen.tap(124, 710);
await new Promise((r) => setTimeout(r, 800));
const fruitsPanel = await page.evaluate(() => window.__game.scene.getScene('Menu').panel !== undefined);
check('panneau FRUITS ouvert', fruitsPanel === true);
await page.touchscreen.tap(195, 797);
await new Promise((r) => setTimeout(r, 600));
const fruitsClosed = await page.evaluate(() => window.__game.scene.getScene('Menu').panel === undefined);
check('panneau FRUITS fermé', fruitsClosed === true);

// PARAMÈTRES (bouton à (266, 710) sur 390x844) : toggle SON
await page.touchscreen.tap(266, 710);
await new Promise((r) => setTimeout(r, 600));
await page.touchscreen.tap(195, 323);
await new Promise((r) => setTimeout(r, 300));
const soundOff = await page.evaluate(() => window.localStorage.getItem('merge_fruits_sound'));
check('toggle SON persisté (off)', soundOff === '0', `sound=${soundOff}`);
await page.touchscreen.tap(195, 323);
await new Promise((r) => setTimeout(r, 300));
const soundOn = await page.evaluate(() => window.localStorage.getItem('merge_fruits_sound'));
check('toggle SON persisté (on)', soundOn === '1', `sound=${soundOn}`);
await page.touchscreen.tap(195, 679);
await new Promise((r) => setTimeout(r, 600));

// JOUER depuis le menu (bouton à 636 sur 390x844)
await page.touchscreen.tap(195, 636);
await new Promise((r) => setTimeout(r, 1200));
const backInGame = await page.evaluate(() => ({
  active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
  menuPanel: window.__game.scene.getScene('Menu').panel !== undefined,
  menuActive: window.__game.scene.getScene('Menu').scene.isActive(),
  gameStatus: window.__game.scene.getScene('Game').sys.status,
}));
check('JOUER depuis le menu → Game', backInGame.active.includes('Game') === true, JSON.stringify(backInGame));

// --- Responsive : 360x800 puis 720x1280 ---
await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
await new Promise((r) => setTimeout(r, 800));
const small = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return {
    w: gs.scale.width,
    h: gs.scale.height,
    left: gs.containerLeft,
    right: gs.containerRight,
    bottom: gs.containerBottom,
  };
});
check(
  'layout 360x800 valide',
  small.w === 360 && small.h === 800 && small.left >= 0 && small.right <= 360 && small.bottom < 800,
  JSON.stringify(small),
);
await page.setViewport({ width: 720, height: 1280, isMobile: true, hasTouch: true });
await new Promise((r) => setTimeout(r, 800));
const big = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return { w: gs.scale.width, h: gs.scale.height, left: gs.containerLeft, right: gs.containerRight };
});
check(
  'layout 720x1280 valide',
  big.w === 720 && big.h === 1280 && big.left >= 0 && big.right <= 720,
  JSON.stringify(big),
);
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await new Promise((r) => setTimeout(r, 800));

await page.screenshot({ path: '/tmp/smoke_gameover.png' });

check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(failures.length ? `\n${failures.length} ÉCHEC(S)` : '\nTOUS LES TESTS PASSENT');
await browser.close();
process.exit(failures.length ? 1 : 0);

process.on('uncaughtException', async (e) => {
  console.log('ERREURS COLLECTÉES:', errors.join('\n') || 'aucune');
  console.log('UNCAUGHT:', e.message);
  await browser.close();
  process.exit(1);
});
