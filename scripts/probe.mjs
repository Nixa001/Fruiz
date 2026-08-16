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
// reproduit les drops du smoke
await page.mouse.move(160, 300);
await page.mouse.down();
await page.mouse.move(240, 300, { steps: 6 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 1400));
await page.mouse.move(170, 300);
await page.mouse.down();
await page.mouse.move(170, 300, { steps: 2 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 1800));
console.log(
  'MATTER:',
  await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    return {
      matter: !!gs.matter,
      world: !!gs.matter?.world,
      fruits: gs.fruits.length,
    };
  }),
);
const cols = await page.evaluate(async () => {
  const game = window.__game;
  const snap = await new Promise((res) => game.renderer.snapshot((img) => res(img)));
  const off = document.createElement('canvas');
  off.width = snap.width;
  off.height = snap.height;
  const ctx = off.getContext('2d');
  ctx.drawImage(snap, 0, 0);
  const s = (x, y) => {
    const d = ctx.getImageData(Math.round((x / 390) * snap.width), Math.round((y / 844) * snap.height), 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  // colonne verticale au centre + une colonne à gauche
  const out = { center: [], left: [] };
  for (let y = 300; y <= 840; y += 40) {
    out.center.push(`${y}: ${s(195, y).join(',')}`);
    out.left.push(`${y}: ${s(60, y).join(',')}`);
  }
  const gs = game.scene.getScene('Game');
  out.layout = { top: Math.round(gs.containerTop), bottom: Math.round(gs.containerBottom), left: Math.round(gs.containerLeft), right: Math.round(gs.containerRight) };
  return out;
});
console.log('LAYOUT:', JSON.stringify(cols.layout));
console.log('CENTER COL:', cols.center.join(' | '));
console.log('LEFT COL:  ', cols.left.join(' | '));
await browser.close();
