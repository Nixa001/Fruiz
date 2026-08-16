import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--window-size=390,844', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
await page.touchscreen.tap(195, 980 * (844 / 1280));
await new Promise((r) => setTimeout(r, 1500));

// 10 drops rapides de tier 2, positions variées
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    gs.currentTier = 2;
    gs.nextTier = 2;
  });
  const x = 140 + (i % 5) * 28;
  await page.mouse.move(x, 300);
  await page.mouse.down();
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 900));
}
await new Promise((r) => setTimeout(r, 3000));
const res = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  const fs = gs.fruits;
  const bad = [];
  for (let i = 0; i < fs.length; i++) {
    for (let j = i + 1; j < fs.length; j++) {
      const a = fs[i], b = fs[j];
      if (a.def.id !== b.def.id) continue;
      const dist = Math.hypot(a.body.position.x - b.body.position.x, a.body.position.y - b.body.position.y);
      const sum = a.physicsRadius + b.physicsRadius;
      if (dist < sum * 1.15) bad.push(`t${a.def.id}@${Math.round(a.x)},${Math.round(a.y)} <-> t${b.def.id}@${Math.round(b.x)},${Math.round(b.y)} d=${Math.round(dist)}/${Math.round(sum)}`);
    }
  }
  return { fruits: fs.map(f => `t${f.def.id}@${Math.round(f.x)},${Math.round(f.y)}`), bad, score: gs.scoreManager.score };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
