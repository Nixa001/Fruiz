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
  if (m.type() === 'error') console.log('CONSOLE ERR:', m.text());
});
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
await page.touchscreen.tap(195, 980 * (844 / 1280));
await new Promise((r) => setTimeout(r, 1500));

const dump = async (tag) => {
  const d = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    return {
      tag: 'x',
      active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
      fruits: gs.fruits.map((f) => ({
        tier: f.def.id,
        x: Math.round(f.x),
        y: Math.round(f.y),
        removed: f.isRemoved,
        speed: Math.round((f.body?.speed ?? -1) * 10) / 10,
      })),
      danger: {
        over: Math.round(gs.dangerManager.overLineSince),
        triggered: gs.dangerManager.triggered,
        lineY: Math.round(gs.dangerLine.y),
      },
    };
  });
  console.log(tag, JSON.stringify(d));
};

// drop 1 à x=240 (comme le smoke, tier aléatoire)
await page.mouse.move(160, 300);
await page.mouse.down();
await page.mouse.move(240, 300, { steps: 6 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));
await dump('après drop1 (0.8s)');
// drop 2 à x=170
await page.mouse.move(170, 300);
await page.mouse.down();
await page.mouse.move(170, 300, { steps: 2 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));
await dump('après drop2 (0.8s)');
await new Promise((r) => setTimeout(r, 2000));
await dump('après drop2 (2.8s)');
await browser.close();
