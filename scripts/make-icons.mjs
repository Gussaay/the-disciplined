// Draws the app icon (five arcs, one per goal, around a tick) and writes the
// PWA icons and the sources that @capacitor/assets turns into Android icons:
//   node scripts/make-icons.mjs && npx @capacitor/assets generate --android
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

// Playwright is a tool of the machine that draws the icons, not a dependency
// of the app: npm i -g playwright (or run where it is already installed).
const { chromium } = createRequire(import.meta.url)('playwright');

const arcs = (r, width, color, filled) => {
  const c = 2 * Math.PI * r;
  const gap = c * 0.035;
  const arc = c / 5 - gap;
  return Array.from({ length: 5 }, (_, i) =>
    `<circle cx="256" cy="256" r="${r}" fill="none" stroke="${i < filled ? color : 'rgba(255,255,255,0.22)'}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${arc} ${c - arc}" stroke-dashoffset="${-(i * (arc + gap) + gap / 2)}" transform="rotate(-90 256 256)"/>`).join('');
};

const mark = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    ${arcs(150, 34, '#EBCB73', 4)}
    <path d="M196 262 l42 42 l82 -92" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const svg = (body, bg = '#0F3D3E') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ''}${body}</svg>`;

const files = [
  ['public/icon-512.png', 512, svg(mark(0.86))],
  ['public/icon-192.png', 192, svg(mark(0.86))],
  ['assets/icon-only.png', 1024, svg(mark(0.9))],
  ['assets/icon-foreground.png', 1024, svg(mark(0.56), null)],
  ['assets/icon-background.png', 1024, svg('')],
  ['assets/splash.png', 2732, svg(mark(0.3))],
  ['assets/splash-dark.png', 2732, svg(mark(0.3), '#0A2B2C')],
];

mkdirSync('assets', { recursive: true });
const browser = await chromium.launch();
for (const [path, size, source] of files) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
  await page.screenshot({ path, omitBackground: true });
  await page.close();
  console.log(path);
}
await browser.close();
