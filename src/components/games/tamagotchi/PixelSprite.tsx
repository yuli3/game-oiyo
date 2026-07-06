// Pixel-art sprite renderer — ported from ahoxy-legacy pixel-sprites.tsx.
// Sprites are pixel-coordinate lists in sprites.json, drawn to an offscreen
// canvas and returned as data URLs (crisp at any scale via image-rendering).
import spriteData from './sprites';
import type { Pet } from '../../../lib/games/tamagotchi';

type PixelList = number[][]; // [x, y] pairs

const common = spriteData.common as Record<string, PixelList>;
const speciesData = spriteData.species as Record<string, Record<string, PixelList | string>>;
const actionsData = spriteData.actions as Record<string, Record<string, PixelList>>;
const backgrounds = spriteData.backgrounds as Record<string, PixelList>;

const SIZE = (spriteData.dimensions as { size: number }).size;

function drawPixels(ctx: CanvasRenderingContext2D, pixels: PixelList | undefined, scale: number, color: string) {
    if (!pixels) return;
    ctx.fillStyle = color;
    for (const [x, y] of pixels) ctx.fillRect(x * scale, y * scale, scale, scale);
}

const urlCache = new Map<string, string>();

export function createPixelArt(spriteKey: string, scale = 3): string {
    const cacheKey = `${spriteKey}@${scale}`;
    const cached = urlCache.get(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = SIZE * scale;
    canvas.height = SIZE * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = false;

    if (spriteKey.startsWith('egg')) drawEgg(ctx, scale, spriteKey);
    else if (spriteKey.startsWith('walkingBg')) drawPixels(ctx, backgrounds[spriteKey], scale, '#CCCCCC');
    else if (actionsData[spriteKey]) drawAction(ctx, scale, spriteKey);
    else drawPet(ctx, scale, spriteKey);

    const url = canvas.toDataURL();
    urlCache.set(cacheKey, url);
    return url;
}

function drawEgg(ctx: CanvasRenderingContext2D, scale: number, spriteKey: string) {
    drawPixels(ctx, common.egg, scale, '#FFFFFF');
    if (spriteKey === 'eggCrack1') drawPixels(ctx, common.eggCrack1, scale, '#888888');
    else if (spriteKey === 'eggCrack2') drawPixels(ctx, common.eggCrack2, scale, '#888888');
}

function drawPet(ctx: CanvasRenderingContext2D, scale: number, spriteKey: string) {
    const species = (['dog', 'cat', 'bird', 'dragon'] as const).find((s) => spriteKey.startsWith(s));
    if (!species) return;
    const data = speciesData[species];
    const color = data.color as string;

    if (spriteKey.includes('Sick')) {
        drawPixels(ctx, common.sickBody, scale, color);
        drawPixels(ctx, common.sickHead, scale, color);
        drawPixels(ctx, common.sickEyes, scale, '#000000');
        drawPixels(ctx, common.thermometer, scale, '#FF5555');
        if (species === 'cat') drawPixels(ctx, data.sickEars as PixelList, scale, color);
        if (species === 'bird') drawPixels(ctx, data.sickBeak as PixelList, scale, '#FF8800');
        return;
    }

    if (spriteKey.includes('Hungry')) {
        drawPixels(ctx, common.baseBody, scale, color);
        drawPixels(ctx, common.eyesSad, scale, '#000000');
        drawPixels(ctx, common.mouthSad, scale, '#000000');
        drawPixels(ctx, common.tears, scale, '#00AAFF');
        drawPixels(ctx, common.bowl, scale, '#AAAAAA');
        if (species === 'bird') drawPixels(ctx, data.wings as PixelList, scale, '#66AADD');
        return;
    }

    if (spriteKey.includes('Hopping')) {
        drawPixels(ctx, common.hoppingBody, scale, color);
        drawPixels(ctx, common.eyesHappy, scale, '#000000');
        drawPixels(ctx, common.mouthHopping, scale, '#000000');
        drawPixels(ctx, common.motionHopping, scale, '#CCCCCC');
        if (species === 'cat') drawPixels(ctx, data.hoppingEars as PixelList, scale, color);
        if (species === 'bird') {
            drawPixels(ctx, data.beakHopping as PixelList, scale, '#FF8800');
            drawPixels(ctx, data.wingsHopping as PixelList, scale, '#66AADD');
        }
        if (species === 'dragon') drawPixels(ctx, data.hoppingHorns as PixelList, scale, color);
        return;
    }

    // normal / happy / sad / dirty
    drawPixels(ctx, common.baseBody, scale, color);
    const mood = spriteKey.includes('Happy') ? 'Happy' : spriteKey.includes('Sad') ? 'Sad' : 'Normal';
    drawPixels(ctx, common[`eyes${mood}`], scale, '#000000');
    drawPixels(ctx, common[`mouth${mood === 'Normal' ? 'Neutral' : mood}`], scale, '#000000');

    if (spriteKey.includes('Dirty')) drawPixels(ctx, common.dirt, scale, '#8B4513');

    if (data.ears) drawPixels(ctx, data.ears as PixelList, scale, color);
    if (data.whiskers && (spriteKey.includes('Child') || spriteKey.includes('Adult'))) {
        drawPixels(ctx, data.whiskers as PixelList, scale, '#666666');
    }
    if (data.tail && spriteKey.includes('Adult')) drawPixels(ctx, data.tail as PixelList, scale, color);
    if (data.beak) drawPixels(ctx, (mood === 'Sad' ? data.beakOpen : data.beak) as PixelList, scale, '#FF8800');
    if (data.wings) drawPixels(ctx, data.wings as PixelList, scale, '#66AADD');
    if (data.crest && (spriteKey.includes('Child') || spriteKey.includes('Adult'))) {
        drawPixels(ctx, data.crest as PixelList, scale, data.crestColor as string);
    }
    if (data.horns) drawPixels(ctx, data.horns as PixelList, scale, color);
    if (data.belly) drawPixels(ctx, data.belly as PixelList, scale, data.bellyColor as string);
    if (data.spikes) drawPixels(ctx, data.spikes as PixelList, scale, data.spikesColor as string);
}

function drawAction(ctx: CanvasRenderingContext2D, scale: number, spriteKey: string) {
    const action = actionsData[spriteKey];
    if (!action) return;
    for (const [key, pixels] of Object.entries(action)) {
        let color = '#000000';
        if (key === 'water') color = '#00AAFF';
        if (key === 'sparkle') color = '#FFFF00';
        if (key === 'path') color = '#CCCCCC';
        if (key === 'food') color = '#885522';
        if (key === 'glass' || key === 'bowl') color = '#AAAAAA';
        drawPixels(ctx, pixels, scale, color);
    }
}

/** Choose the sprite for the pet's current stage/state/stats. */
export function getPetSpriteKey(pet: Pet): string {
    if (pet.stage === 'egg') return 'egg';
    if (pet.state === 'dead') return `${pet.type}Sad`;

    // in-progress action sprites
    if (pet.state === 'feeding') return 'eating';
    if (pet.state === 'drinking') return 'drinking';
    if (pet.state === 'playing') return 'playing';
    if (pet.state === 'cleaning') return 'cleaning';
    if (pet.state === 'walking') return 'walking';
    if (pet.state === 'sleeping') return 'sleeping';

    const stageStr = pet.stage === 'baby' ? 'Baby' : pet.stage === 'child' ? 'Child' : 'Adult';
    if (pet.isSick || pet.health < 30) return `${pet.type}Sick`;
    if (pet.state === 'hopping') return `${pet.type}Hopping`;
    if (pet.hunger < 30) return `${pet.type}Hungry`;
    if (pet.cleanliness < 30) return `${pet.type}Dirty`;
    if (pet.happiness > 70) return `${pet.type}Happy`;
    if (pet.happiness < 30) return `${pet.type}Sad`;
    return `${pet.type}${stageStr}`;
}
