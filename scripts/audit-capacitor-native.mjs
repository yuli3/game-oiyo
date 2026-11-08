#!/usr/bin/env node
/**
 * Capacitor Native App Store Packaging Preflight Auditor
 * Validates configuration, App IDs, master icons (1024x1024), splash screens (2732x2732),
 * safe-area viewport coverage, and CoreHaptics bridge readiness.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function check(label, condition, details = "") {
  if (condition) {
    console.log(`  [PASS] ${label} ${details ? `(${details})` : ""}`);
  } else {
    console.error(`  [FAIL] ${label} ${details ? `(${details})` : ""}`);
    failures++;
  }
}

async function verifyImage(path, expectedW, expectedH, desc) {
  if (!existsSync(path)) {
    check(desc, false, `File missing: ${path}`);
    return;
  }
  const meta = await sharp(path).metadata();
  const valid = meta.width === expectedW && meta.height === expectedH && meta.format === "png";
  check(desc, valid, `${meta.width}x${meta.height} PNG (target: ${expectedW}x${expectedH})`);
}

async function auditCapacitor() {
  console.log("=== Capacitor Native App Store Packaging Preflight ===");

  // 1. Config Check
  console.log("\n1. Capacitor Configuration (capacitor.config.ts):");
  const configPath = resolve(root, "capacitor.config.ts");
  check("Config exists", existsSync(configPath));
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, "utf-8");
    check("Reverse Domain App ID", /appId:\s*['"]net\.oiyo\.game\.[a-z0-9_-]+['"]/.test(configContent));
    check("Flagship App Name", /appName:\s*['"]Neon Survivor: Cyberpunk Roguelike['"]/.test(configContent));
    check("Web Distribution Directory", /webDir:\s*['"]dist['"]/.test(configContent));
    check("Dark Background Color", /backgroundColor:\s*['"]#0a0a0c['"]/.test(configContent));
    check("iOS Always Insets", /contentInset:\s*['"]always['"]/.test(configContent));
    check("iOS AppBoundDomains Security", /limitsNavigationsToAppBoundDomains:\s*true/.test(configContent));
    check("CoreHaptics Plugin Configured", /Haptics:\s*\{/.test(configContent));
    check("StatusBar Dark Overlay Configured", /StatusBar:\s*\{[^}]*style:\s*['"]DARK['"]/.test(configContent));
  }

  // 2. Asset Check
  console.log("\n2. Native Store Master Assets (1024x1024 Icon & 2732x2732 Splash):");
  await verifyImage(resolve(root, "resources/icon.png"), 1024, 1024, "Default Master App Icon");
  await verifyImage(resolve(root, "resources/splash.png"), 2732, 2732, "Default Master Splash Screen");
  await verifyImage(resolve(root, "resources/neon-survivor/icon.png"), 1024, 1024, "Neon Survivor 1024px Icon");
  await verifyImage(resolve(root, "resources/neon-survivor/splash.png"), 2732, 2732, "Neon Survivor 2732px Splash");
  await verifyImage(resolve(root, "resources/isometric-city/icon.png"), 1024, 1024, "Isometric City 1024px Icon");
  await verifyImage(resolve(root, "resources/isometric-city/splash.png"), 2732, 2732, "Isometric City 2732px Splash");

  // 3. Viewport & Safe Area Check
  console.log("\n3. Mobile Safe Area & Viewport Insets:");
  const seoPath = resolve(root, "src/components/SEO.astro");
  if (existsSync(seoPath)) {
    const seoContent = readFileSync(seoPath, "utf-8");
    check("SEO Viewport Cover", /name="viewport"[^>]*viewport-fit=cover/.test(seoContent));
  }
  const cssPath = resolve(root, "src/styles/global.css");
  if (existsSync(cssPath)) {
    const cssContent = readFileSync(cssPath, "utf-8");
    check("Arcade Shell Safe Area Insets", /\.arcade-shell\s*\{[^}]*safe-area-inset-top/.test(cssContent));
  }

  // 4. Native Bridge Check
  console.log("\n4. Native CoreHaptics Bridge:");
  const bridgePath = resolve(root, "src/lib/haptics/native-bridge.ts");
  check("Bridge File Exists", existsSync(bridgePath));
  if (existsSync(bridgePath)) {
    const bridgeContent = readFileSync(bridgePath, "utf-8");
    check("Capacitor Runtime Detection", /checkCapacitor/.test(bridgeContent));
    check("CoreHaptics Impact / Notification / Vibrate", /haptics\.impact/.test(bridgeContent) && /haptics\.notification/.test(bridgeContent));
    check("Web Vibration Fallback", /navigator\.vibrate/.test(bridgeContent));
  }

  console.log("\n=======================================================");
  if (failures > 0) {
    console.error(`PREFLIGHT AUDIT FAILED with ${failures} error(s).`);
    process.exit(1);
  } else {
    console.log("PREFLIGHT AUDIT PASSED: All Capacitor native store packaging requirements verified (0 errors).");
  }
}

auditCapacitor().catch((err) => {
  console.error(err);
  process.exit(1);
});
