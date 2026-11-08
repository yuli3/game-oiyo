#!/usr/bin/env node
/**
 * Programmatic Native App Icon & Splash Screen Asset Generator
 * Builds high-fidelity 1024x1024 App Store master icons and 2732x2732 splash screens
 * using in-game 3D sprites and cybernetic SVG composition layers.
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (...p) => resolve(root, "public", ...p);
const res = (...p) => resolve(root, "resources", ...p);

async function buildNeonSurvivorAssets() {
  const iconPath = res("neon-survivor/icon.png");
  const splashPath = res("neon-survivor/splash.png");
  mkdirSync(dirname(iconPath), { recursive: true });

  // 1. 1024x1024 Master App Icon
  const iconSvg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#161938" />
          <stop offset="60%" stop-color="#0a0c16" />
          <stop offset="100%" stop-color="#040508" />
        </radialGradient>
        <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f5ff" />
          <stop offset="100%" stop-color="#7000ff" />
        </linearGradient>
        <linearGradient id="neonPink" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff007f" />
          <stop offset="100%" stop-color="#ff00ea" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="1024" height="1024" fill="url(#bgGlow)" />
      
      <!-- Tech Grid Lines -->
      <path d="M 0,256 L 1024,256 M 0,512 L 1024,512 M 0,768 L 1024,768" stroke="#1f2445" stroke-width="2" opacity="0.4" />
      <path d="M 256,0 L 256,1024 M 512,0 L 512,1024 M 768,0 L 768,1024" stroke="#1f2445" stroke-width="2" opacity="0.4" />
      
      <!-- Hexagon Cyber Ring -->
      <polygon points="512,120 870,326 870,740 512,946 154,740 154,326" fill="none" stroke="url(#neonCyan)" stroke-width="8" filter="url(#glow)" opacity="0.8" />
      <polygon points="512,160 830,344 830,712 512,896 194,712 194,344" fill="none" stroke="#2a1b4e" stroke-width="4" opacity="0.6" />
      
      <!-- Cyberpunk Corner Accents -->
      <path d="M 64,160 L 64,64 L 160,64" stroke="url(#neonPink)" stroke-width="12" fill="none" />
      <path d="M 960,160 L 960,64 L 864,64" stroke="url(#neonCyan)" stroke-width="12" fill="none" />
      <path d="M 64,864 L 64,960 L 160,960" stroke="url(#neonCyan)" stroke-width="12" fill="none" />
      <path d="M 960,864 L 960,960 L 864,960" stroke="url(#neonPink)" stroke-width="12" fill="none" />
      
      <!-- Target Reticle & Flare -->
      <circle cx="512" cy="460" r="280" fill="none" stroke="url(#neonCyan)" stroke-width="3" stroke-dasharray="16 12" opacity="0.5" />
      <circle cx="512" cy="460" r="340" fill="none" stroke="url(#neonPink)" stroke-width="2" stroke-dasharray="8 20" opacity="0.4" />
    </svg>
  `;

  const shipSprite = pub("assets/sprites/neon-survivor/player-ship-256.png");
  const shipBuf = await sharp(shipSprite)
    .resize(540, 540, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(Buffer.from(iconSvg))
    .composite([
      { input: shipBuf, left: Math.round((1024 - 540) / 2), top: 190 },
    ])
    .png()
    .toFile(iconPath);

  // 2. 2732x2732 Native Splash Screen
  const splashSvg = `
    <svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="splashGlow" cx="50%" cy="48%" r="65%">
          <stop offset="0%" stop-color="#141838" />
          <stop offset="50%" stop-color="#090a16" />
          <stop offset="100%" stop-color="#030408" />
        </radialGradient>
        <linearGradient id="textCyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00f5ff" />
          <stop offset="100%" stop-color="#00a8ff" />
        </linearGradient>
      </defs>
      <rect width="2732" height="2732" fill="url(#splashGlow)" />
      
      <!-- Ambient Grid -->
      <circle cx="1366" cy="1200" r="700" fill="none" stroke="#1d2247" stroke-width="4" stroke-dasharray="24 16" opacity="0.6" />
      <circle cx="1366" cy="1200" r="850" fill="none" stroke="#251b4a" stroke-width="3" opacity="0.4" />
      
      <!-- Subtitle & Loading Branding -->
      <text x="1366" y="1720" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="72" font-weight="900" letter-spacing="16" fill="url(#textCyan)" text-anchor="middle">NEON SURVIVOR</text>
      <text x="1366" y="1800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="32" font-weight="600" letter-spacing="10" fill="#a0aec0" text-anchor="middle">CYBERPUNK ROGUELIKE</text>
      
      <!-- Tactical Hex Indicators -->
      <polygon points="1366,450 1972,800 1972,1500 1366,1850 760,1500 760,800" fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.3" />
    </svg>
  `;

  const splashShipBuf = await sharp(shipSprite)
    .resize(760, 760, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(Buffer.from(splashSvg))
    .composite([
      { input: splashShipBuf, left: Math.round((2732 - 760) / 2), top: 820 },
    ])
    .png()
    .toFile(splashPath);

  // Copy to root resources/ as the default active app bundle
  copyFileSync(iconPath, res("icon.png"));
  copyFileSync(splashPath, res("splash.png"));

  console.log("Built Neon Survivor Assets:", iconPath, splashPath);
}

async function buildIsometricCityAssets() {
  const iconPath = res("isometric-city/icon.png");
  const splashPath = res("isometric-city/splash.png");
  mkdirSync(dirname(iconPath), { recursive: true });

  const iconSvg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cityGlow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0b0f19" />
        </radialGradient>
        <linearGradient id="emeraldGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#cityGlow)" />
      <!-- Isometric Ground Tile Grid -->
      <polygon points="512,180 880,390 512,600 144,390" fill="#1e3a5f" stroke="#3b82f6" stroke-width="4" opacity="0.5" />
      <polygon points="512,600 880,390 880,480 512,690" fill="#0f172a" opacity="0.7" />
      <polygon points="512,600 144,390 144,480 512,690" fill="#1e293b" opacity="0.7" />
      <!-- Rounded Frame -->
      <rect x="48" y="48" width="928" height="928" rx="200" fill="none" stroke="url(#emeraldGold)" stroke-width="12" opacity="0.8" />
    </svg>
  `;

  const skySprite = pub("assets/sprites/isometric-city/city-skyscraper-3d-128.png");
  const skyBuf = await sharp(skySprite)
    .resize(460, 460, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(Buffer.from(iconSvg))
    .composite([
      { input: skyBuf, left: Math.round((1024 - 460) / 2), top: 220 },
    ])
    .png()
    .toFile(iconPath);

  const splashSvg = `
    <svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="citySplashGlow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#090d16" />
        </radialGradient>
      </defs>
      <rect width="2732" height="2732" fill="url(#citySplashGlow)" />
      <text x="1366" y="1720" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="76" font-weight="900" letter-spacing="14" fill="#38bdf8" text-anchor="middle">ISOMETRIC CITY</text>
      <text x="1366" y="1800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="600" letter-spacing="8" fill="#94a3b8" text-anchor="middle">URBAN TYCOON SIMULATOR</text>
    </svg>
  `;

  const splashSkyBuf = await sharp(skySprite)
    .resize(720, 720, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(Buffer.from(splashSvg))
    .composite([
      { input: splashSkyBuf, left: Math.round((2732 - 720) / 2), top: 880 },
    ])
    .png()
    .toFile(splashPath);

  console.log("Built Isometric City Assets:", iconPath, splashPath);
}

async function main() {
  await buildNeonSurvivorAssets();
  await buildIsometricCityAssets();
  console.log("All native master icons & splash assets successfully generated.");
}

main().catch((err) => {
  console.error("Failed to build native assets:", err);
  process.exit(1);
});
