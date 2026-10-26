import { describe, expect, it } from 'vitest';
import { PotionCraftEngine } from './potion-craft';

describe('PotionCraftEngine', () => {
  it('initializes ingredients, potion bottle at (0,0), and customer', () => {
    const engine = new PotionCraftEngine();
    expect(engine.state.bottleX).toBe(0);
    expect(engine.state.bottleY).toBe(0);
    expect(engine.state.gold).toBe(50);
    expect(engine.state.currentCustomer).not.toBeNull();
    expect(engine.state.ingredients.terraria.count).toBe(6);
  });

  it('selects ingredient, grinds in mortar, and adds to cauldron', () => {
    const engine = new PotionCraftEngine();
    const selected = engine.selectIngredientForMortar('terraria');
    expect(selected).toBe(true);
    expect(engine.state.activeIngredient).toBe('terraria');
    expect(engine.state.ingredients.terraria.count).toBe(5);

    // Grind to 100%
    engine.grind(0.5);
    engine.grind(0.5);
    expect(engine.state.grindProgress).toBe(1.0);

    // Add to cauldron
    const added = engine.addToCauldron();
    expect(added).toBe(true);
    expect(engine.state.activeIngredient).toBeNull();
    expect(engine.state.currentPath.length).toBeGreaterThan(1);
  });

  it('stirs cauldron to advance bottle along curve path', () => {
    const engine = new PotionCraftEngine();
    engine.selectIngredientForMortar('waterbloom');
    engine.grind(1.0);
    engine.addToCauldron();

    const startX = engine.state.bottleX;
    const startY = engine.state.bottleY;

    // Stirring advances bottle
    engine.stir(0.5);
    expect(engine.state.bottleX !== startX || engine.state.bottleY !== startY).toBe(true);
  });

  it('dilutes with water to pull bottle toward center (0, 0)', () => {
    const engine = new PotionCraftEngine();
    engine.state.bottleX = 4.0;
    engine.state.bottleY = 3.0;

    const diluted = engine.addWater(1.0);
    expect(diluted).toBe(true);
    // Distance to center should have decreased
    const newDist = Math.hypot(engine.state.bottleX, engine.state.bottleY);
    expect(newDist).toBeLessThan(5.0);
  });

  it('fails potion when stirring into danger zone', () => {
    const engine = new PotionCraftEngine();
    // Force bottle directly into danger zone (1.5, -1.2)
    engine.state.currentPath = [
      { x: 0, y: 0 },
      { x: 1.5, y: -1.2 },
    ];

    engine.stir(0.5);
    expect(engine.state.isFailed).toBe(true);
    const brew = engine.brewPotion();
    expect(brew.success).toBe(false);
  });

  it('brews potion and serves matching customer order', () => {
    const engine = new PotionCraftEngine();
    // Simulate reaching healing node
    engine.state.bottleX = 3.5;
    engine.state.bottleY = 1.5;
    engine.state.activeEffects = ['healing'];

    const brew = engine.brewPotion();
    expect(brew.success).toBe(true);
    expect(brew.brewedEffect).toBe('healing');

    // Customer match check
    engine.state.currentCustomer = {
      id: 'test',
      customerName: 'Test Hunter',
      requestText: 'Need healing!',
      desiredEffect: 'healing',
      rewardGold: 35,
    };

    const serve = engine.serveCustomer('healing');
    expect(serve.success).toBe(true);
    expect(engine.state.gold).toBe(85);
    expect(engine.state.customersServed).toBe(1);
    expect(engine.state.bottleX).toBe(0); // reset to origin
  });
});
