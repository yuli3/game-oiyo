import { describe, it, expect } from 'vitest';
import config from '../../../capacitor.config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

describe('Capacitor Native Config & Preflight Verification', () => {
  it('should have production-ready Capacitor configuration', () => {
    expect(config.appId).toBe('net.oiyo.game.neonsurvivor');
    expect(config.appName).toBe('Neon Survivor: Cyberpunk Roguelike');
    expect(config.webDir).toBe('dist');
    expect(config.backgroundColor).toBe('#0a0a0c');
    expect(config.bundledWebRuntime).toBe(false);

    // iOS security & UX constraints
    expect(config.ios?.contentInset).toBe('always');
    expect(config.ios?.preferredContentMode).toBe('mobile');
    expect(config.ios?.limitsNavigationsToAppBoundDomains).toBe(true);

    // Android constraints
    expect(config.android?.allowMixedContent).toBe(false);
    expect(config.android?.captureInput).toBe(true);
    expect(config.android?.backgroundColor).toBe('#0a0a0c');

    // Plugins
    expect(config.plugins?.Haptics).toBeDefined();
    expect(config.plugins?.StatusBar).toBeDefined();
    expect(config.plugins?.SplashScreen).toBeDefined();
  });

  it('should provide valid 1024x1024 master app icons', async () => {
    const root = resolve(__dirname, '../../..');
    const masterIcon = resolve(root, 'resources/icon.png');
    const neonIcon = resolve(root, 'resources/neon-survivor/icon.png');
    const cityIcon = resolve(root, 'resources/isometric-city/icon.png');

    expect(existsSync(masterIcon)).toBe(true);
    expect(existsSync(neonIcon)).toBe(true);
    expect(existsSync(cityIcon)).toBe(true);

    const masterMeta = await sharp(masterIcon).metadata();
    expect(masterMeta.width).toBe(1024);
    expect(masterMeta.height).toBe(1024);
    expect(masterMeta.format).toBe('png');

    const neonMeta = await sharp(neonIcon).metadata();
    expect(neonMeta.width).toBe(1024);
    expect(neonMeta.height).toBe(1024);

    const cityMeta = await sharp(cityIcon).metadata();
    expect(cityMeta.width).toBe(1024);
    expect(cityMeta.height).toBe(1024);
  });

  it('should provide valid 2732x2732 master splash screens', async () => {
    const root = resolve(__dirname, '../../..');
    const masterSplash = resolve(root, 'resources/splash.png');
    const neonSplash = resolve(root, 'resources/neon-survivor/splash.png');
    const citySplash = resolve(root, 'resources/isometric-city/splash.png');

    expect(existsSync(masterSplash)).toBe(true);
    expect(existsSync(neonSplash)).toBe(true);
    expect(existsSync(citySplash)).toBe(true);

    const masterMeta = await sharp(masterSplash).metadata();
    expect(masterMeta.width).toBe(2732);
    expect(masterMeta.height).toBe(2732);
    expect(masterMeta.format).toBe('png');

    const neonMeta = await sharp(neonSplash).metadata();
    expect(neonMeta.width).toBe(2732);
    expect(neonMeta.height).toBe(2732);

    const cityMeta = await sharp(citySplash).metadata();
    expect(cityMeta.width).toBe(2732);
    expect(cityMeta.height).toBe(2732);
  });
});
