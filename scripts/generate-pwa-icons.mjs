// Generate PWA icons in all required sizes from the SVG logo
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const OUT = join(PUBLIC, 'icons');

mkdirSync(OUT, { recursive: true });

// Read the source SVG
const svgBuffer = readFileSync(join(PUBLIC, 'favicon.svg'));

// Background color from the brand (purple/pink gradient feel)
const BG = { r: 134, g: 59, b: 255 }; // #863bff
const BG_DARK = { r: 30, g: 20, b: 50 };

// PWA icon sizes
const ICONS = [
  { size: 16, name: 'favicon-16x16.png', purpose: 'favicon' },
  { size: 32, name: 'favicon-32x32.png', purpose: 'favicon' },
  { size: 48, name: 'favicon-48x48.png', purpose: 'favicon' },
  { size: 72, name: 'icon-72x72.png', purpose: 'any' },
  { size: 96, name: 'icon-96x96.png', purpose: 'any' },
  { size: 128, name: 'icon-128x128.png', purpose: 'any' },
  { size: 144, name: 'icon-144x144.png', purpose: 'any' },
  { size: 152, name: 'icon-152x152.png', purpose: 'any' },
  { size: 180, name: 'apple-touch-icon.png', purpose: 'apple' },
  { size: 192, name: 'icon-192x192.png', purpose: 'any' },
  { size: 192, name: 'icon-192x192-maskable.png', purpose: 'maskable' },
  { size: 256, name: 'icon-256x256.png', purpose: 'any' },
  { size: 384, name: 'icon-384x384.png', purpose: 'any' },
  { size: 512, name: 'icon-512x512.png', purpose: 'any' },
  { size: 512, name: 'icon-512x512-maskable.png', purpose: 'maskable' },
];

async function makeSquare(size, padding = 0) {
  // Renders the SVG on a solid colored background square
  const inner = size - padding * 2;
  const svgResized = await sharp(svgBuffer)
    .resize(inner, inner, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: svgResized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function makeMaskable(size) {
  // Maskable icons need safe zone: the visible content must fit in
  // a centered circle of diameter 80% of the icon (40% padding radius).
  const safeZone = Math.floor(size * 0.4);
  const inner = size - safeZone * 2;
  const svgResized = await sharp(svgBuffer)
    .resize(inner, inner, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: svgResized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function makeAppleTouch(size) {
  // Apple touch icons: rounded corners applied by iOS, solid background
  const svgResized = await sharp(svgBuffer)
    .resize(size * 0.6, size * 0.6, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: svgResized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function run() {
  console.log('Generating PWA icons in', OUT);
  for (const icon of ICONS) {
    let buf;
    if (icon.purpose === 'maskable') buf = await makeMaskable(icon.size);
    else if (icon.purpose === 'apple') buf = await makeAppleTouch(icon.size);
    else buf = await makeSquare(icon.size);

    const out = join(OUT, icon.name);
    writeFileSync(out, buf);
    console.log('  ✔', icon.name, `(${icon.size}x${icon.size})`);
  }

  // Also write favicon.ico (use the 32x32 PNG — modern browsers accept PNG-in-ICO)
  // and an SVG favicon pointer
  const favicon32 = await makeSquare(32);
  writeFileSync(join(PUBLIC, 'favicon.ico'), favicon32);
  console.log('  ✔ favicon.ico');

  // Splash screen icons (iOS)
  const SPLASH = [
    { w: 640, h: 1136, name: 'apple-splash-640x1136.png' },
    { w: 750, h: 1334, name: 'apple-splash-750x1334.png' },
    { w: 1242, h: 2208, name: 'apple-splash-1242x2208.png' },
    { w: 1125, h: 2436, name: 'apple-splash-1125x2436.png' },
    { w: 1536, h: 2048, name: 'apple-splash-1536x2048.png' },
    { w: 1668, h: 2388, name: 'apple-splash-1668x2388.png' },
    { w: 2048, h: 2732, name: 'apple-splash-2048x2732.png' },
  ];
  for (const s of SPLASH) {
    const logo = await sharp(svgBuffer)
      .resize(Math.floor(s.w * 0.3), Math.floor(s.w * 0.3), { fit: 'contain', background: { ...BG, alpha: 0 } })
      .png()
      .toBuffer();
    const buf = await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: BG_DARK,
      },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer();
    writeFileSync(join(OUT, s.name), buf);
    console.log('  ✔', s.name, `(${s.w}x${s.h})`);
  }

  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
