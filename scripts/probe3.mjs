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
page.on('console', (m) => {
  if (m.type() === 'log' && m.text().startsWith('[')) console.log('  ' + m.text());
});
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
await page.touchscreen.tap(195, 980 * (844 / 1280));
await new Promise((r) => setTimeout(r, 1500));

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    return gs.fruits.map((f) => ({
      tier: f.def.id,
      x: Math.round(f.x),
      y: Math.round(f.y),
      static: f.body.isStatic,
      sleeping: f.body.isSleeping,
      removed: f.isRemoved,
    }));
  });
  console.log(tag, JSON.stringify(d));
};

await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.spawnFruit(5, 175, 690);
  gs.spawnFruit(6, 215, 690);
  for (const f of gs.fruits) f.body.isStatic = true;
});
await new Promise((r) => setTimeout(r, 500));
await dump('pins');
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.currentTier = 5;
  gs.nextTier = 5;
});
await page.mouse.move(195, 300);
await page.mouse.down();
await page.mouse.up();
for (const t of [400, 800, 1200, 2000, 3000]) {
  await new Promise((r) => setTimeout(r, t - (globalThis._last ?? 0)));
  globalThis._last = t;
  await dump(`t=${t}`);
}
await browser.close();
