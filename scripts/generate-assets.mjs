/**
 * Generates Android launcher icons and splash screens for YourTaxiMate.
 * Run with: node scripts/generate-assets.mjs
 */

import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const ANDROID_RES = "android/app/src/main/res";

// ── Icon SVG — blue hexagon with "T" matching the app's auth page logo ────────
const ICON_SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <rect width="1024" height="1024" rx="220" fill="#1e293b"/>
  <!-- Outer glow ring -->
  <circle cx="512" cy="512" r="430" fill="none" stroke="#2563eb" stroke-width="18" opacity="0.3"/>
  <!-- Blue hexagon -->
  <path d="M512 120 L860 310 L860 714 L512 904 L164 714 L164 310 Z"
        stroke="#2563eb" stroke-width="28" fill="#1e40af" fill-opacity="0.15"/>
  <!-- Inner hexagon fill -->
  <path d="M512 170 L820 342 L820 686 L512 858 L204 686 L204 342 Z"
        fill="#2563eb" fill-opacity="0.12"/>
  <!-- Bold "T" letter -->
  <text x="512" y="660"
        fill="#ffffff"
        font-size="440"
        font-weight="900"
        font-family="Arial Black, Arial, sans-serif"
        text-anchor="middle"
        dominant-baseline="auto">T</text>
  <!-- Small tagline dot -->
  <circle cx="512" cy="820" r="18" fill="#2563eb"/>
</svg>
`.trim();

// ── Adaptive icon foreground (just the icon, no background) ──────────────────
const FOREGROUND_SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path d="M512 80 L880 290 L880 734 L512 944 L144 734 L144 290 Z"
        stroke="#2563eb" stroke-width="24" fill="#1e40af" fill-opacity="0.2"/>
  <text x="512" y="660"
        fill="#ffffff"
        font-size="440"
        font-weight="900"
        font-family="Arial Black, Arial, sans-serif"
        text-anchor="middle">T</text>
</svg>
`.trim();

// ── Splash screen SVG — dark slate with centred logo ─────────────────────────
function makeSplashSvg(w, h) {
  return `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${w}" height="${h}" fill="#0f172a"/>
  <!-- Subtle radial glow -->
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
  </radialGradient>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <!-- Hexagon outline -->
  <g transform="translate(${w / 2}, ${h / 2 - 40}) scale(${Math.min(w, h) * 0.00026})">
    <path d="M0,-420 L364,-210 L364,210 L0,420 L-364,210 L-364,-210 Z"
          stroke="#2563eb" stroke-width="28" fill="#1e40af" fill-opacity="0.2"/>
    <text y="160"
          fill="#ffffff"
          font-size="520"
          font-weight="900"
          font-family="Arial Black, Arial, sans-serif"
          text-anchor="middle">T</text>
  </g>
  <!-- App name -->
  <text x="${w / 2}" y="${h / 2 + Math.min(w, h) * 0.18}"
        fill="#ffffff"
        font-size="${Math.min(w, h) * 0.055}"
        font-weight="800"
        font-family="Arial, sans-serif"
        text-anchor="middle">YourTaxiMate</text>
  <text x="${w / 2}" y="${h / 2 + Math.min(w, h) * 0.24}"
        fill="#64748b"
        font-size="${Math.min(w, h) * 0.028}"
        font-family="Arial, sans-serif"
        text-anchor="middle">UK PRIVATE HIRE PLATFORM</text>
</svg>`.trim();
}

// ── Icon sizes ────────────────────────────────────────────────────────────────
const ICON_SIZES = [
  { dir: "mipmap-mdpi",    size: 48  },
  { dir: "mipmap-hdpi",    size: 72  },
  { dir: "mipmap-xhdpi",   size: 96  },
  { dir: "mipmap-xxhdpi",  size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

const FOREGROUND_SIZES = [
  { dir: "mipmap-mdpi",    size: 108 },
  { dir: "mipmap-hdpi",    size: 162 },
  { dir: "mipmap-xhdpi",   size: 216 },
  { dir: "mipmap-xxhdpi",  size: 324 },
  { dir: "mipmap-xxxhdpi", size: 432 },
];

// ── Splash screen sizes ───────────────────────────────────────────────────────
const SPLASH_SIZES = [
  { dir: "drawable-port-mdpi",    w: 320,  h: 480  },
  { dir: "drawable-port-hdpi",    w: 480,  h: 800  },
  { dir: "drawable-port-xhdpi",   w: 720,  h: 1280 },
  { dir: "drawable-port-xxhdpi",  w: 960,  h: 1600 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { dir: "drawable-land-mdpi",    w: 480,  h: 320  },
  { dir: "drawable-land-hdpi",    w: 800,  h: 480  },
  { dir: "drawable-land-xhdpi",   w: 1280, h: 720  },
  { dir: "drawable-land-xxhdpi",  w: 1600, h: 960  },
  { dir: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
  { dir: "drawable",              w: 800,  h: 600  },
];

async function generate() {
  console.log("Generating YourTaxiMate Android assets...\n");

  const iconBuf = Buffer.from(ICON_SVG);
  const fgBuf   = Buffer.from(FOREGROUND_SVG);

  // Launcher icons
  for (const { dir, size } of ICON_SIZES) {
    const destDir = path.join(ANDROID_RES, dir);
    await fs.mkdir(destDir, { recursive: true });

    // ic_launcher.png
    await sharp(iconBuf).resize(size, size).png().toFile(
      path.join(destDir, "ic_launcher.png")
    );
    // ic_launcher_round.png (same image, Android clips it to circle)
    await sharp(iconBuf).resize(size, size).png().toFile(
      path.join(destDir, "ic_launcher_round.png")
    );
    console.log(`  ✓ ic_launcher ${size}x${size}  →  ${dir}`);
  }

  // Adaptive foreground layers
  for (const { dir, size } of FOREGROUND_SIZES) {
    const destDir = path.join(ANDROID_RES, dir);
    await fs.mkdir(destDir, { recursive: true });
    await sharp(fgBuf).resize(size, size).png().toFile(
      path.join(destDir, "ic_launcher_foreground.png")
    );
    console.log(`  ✓ ic_launcher_foreground ${size}x${size}  →  ${dir}`);
  }

  // Splash screens
  for (const { dir, w, h } of SPLASH_SIZES) {
    const destDir = path.join(ANDROID_RES, dir);
    await fs.mkdir(destDir, { recursive: true });
    const svgBuf = Buffer.from(makeSplashSvg(w, h));
    await sharp(svgBuf).resize(w, h).png().toFile(
      path.join(destDir, "splash.png")
    );
    console.log(`  ✓ splash ${w}x${h}  →  ${dir}`);
  }

  console.log("\nAll assets generated successfully!");
}

generate().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
