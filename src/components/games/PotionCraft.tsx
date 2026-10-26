import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PotionCraftEngine,
  type IngredientId,
  type PotionEffect,
  type CustomerOrder,
  type Ingredient,
} from '../../lib/games/potion-craft';

interface BoilingBubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  life: number;
}

export default function PotionCraft() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PotionCraftEngine>(new PotionCraftEngine());

  // Reactive UI State
  const [gold, setGold] = useState<number>(50);
  const [activeIngredient, setActiveIngredient] = useState<IngredientId | null>(null);
  const [grindProgress, setGrindProgress] = useState<number>(0);
  const [activeEffects, setActiveEffects] = useState<PotionEffect[]>([]);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerOrder | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [inventory, setInventory] = useState<Record<IngredientId, Ingredient>>(
    engineRef.current.state.ingredients
  );

  // Audio Context for Procedural Alchemy ASMR
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playASMR = useCallback(
    (type: 'grind' | 'stir' | 'water' | 'bellows' | 'coin' | 'fail' | 'cork') => {
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'grind') {
          // Crunchy granular noise burst
          const bufferSize = ctx.sampleRate * 0.12;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(600 + Math.random() * 400, now);
          filter.Q.setValueAtTime(3.0, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
        } else if (type === 'stir') {
          // Gentle liquid slosh
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
          osc.frequency.linearRampToValueAtTime(190, now + 0.15);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'water') {
          // Pouring water trickle
          [350, 480, 620].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.12, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.1);
          });
        } else if (type === 'bellows') {
          // Roaring fire puff
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(90, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'coin') {
          // High pitch silver jingle
          [987.77, 1318.51].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.3);
          });
        } else if (type === 'fail') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(50, now + 0.4);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
        } else if (type === 'cork') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
        }
      } catch {
        // safe audio
      }
    },
    [initAudio]
  );

  const syncState = useCallback(() => {
    const s = engineRef.current.state;
    setGold(s.gold);
    setActiveIngredient(s.activeIngredient);
    setGrindProgress(s.grindProgress);
    setActiveEffects([...s.activeEffects]);
    setIsFailed(s.isFailed);
    setCurrentCustomer(s.currentCustomer);
    setInventory({ ...s.ingredients });
  }, []);

  // Ingredient select for Mortar
  const handleSelectIngredient = (id: IngredientId) => {
    initAudio();
    const success = engineRef.current.selectIngredientForMortar(id);
    if (success) {
      playASMR('cork');
      setFeedbackMsg(`${engineRef.current.state.ingredients[id].name}을 절구에 넣었습니다. 빻아주세요!`);
      syncState();
    }
  };

  // Grind Action
  const handleGrind = () => {
    initAudio();
    playASMR('grind');
    engineRef.current.grind(0.25);
    syncState();
  };

  // Add to Cauldron
  const handleAddToCauldron = () => {
    initAudio();
    playASMR('stir');
    const success = engineRef.current.addToCauldron();
    if (success) {
      setFeedbackMsg('가마솥에 재료를 넣었습니다. 국자로 저어주세요!');
      syncState();
    }
  };

  // Stir Cauldron
  const handleStir = () => {
    initAudio();
    playASMR('stir');
    const success = engineRef.current.stir(0.25);
    if (engineRef.current.state.isFailed) {
      playASMR('fail');
      setFeedbackMsg('해골 지대에 닿아 물약이 끓어 넘치며 파괴되었습니다! 가마솥을 비우세요.');
    } else if (success) {
      setFeedbackMsg('국자를 저어 물약 병을 궤적을 따라 이동시켰습니다.');
    }
    syncState();
  };

  // Add Water (Dilute)
  const handleAddWater = () => {
    initAudio();
    playASMR('water');
    engineRef.current.addWater(0.3);
    setFeedbackMsg('물을 부어 중심 방향으로 물약 병을 희석·이동시켰습니다.');
    syncState();
  };

  // Brew & Serve Customer
  const handleBrewAndServe = () => {
    initAudio();
    const engine = engineRef.current;
    const brew = engine.brewPotion();

    if (!brew.success || !brew.brewedEffect) {
      playASMR('fail');
      setFeedbackMsg(brew.message);
      syncState();
      return;
    }

    playASMR('bellows');
    setTimeout(() => {
      const serve = engine.serveCustomer(brew.brewedEffect!);
      if (serve.success) {
        playASMR('coin');
        setFeedbackMsg(serve.feedback);
      } else {
        playASMR('fail');
        setFeedbackMsg(serve.feedback);
      }
      syncState();
    }, 300);
  };

  // Reset Cauldron
  const handleResetCauldron = () => {
    initAudio();
    playASMR('water');
    engineRef.current.resetCauldron();
    setFeedbackMsg('가마솥을 깨끗하게 비우고 새로 시작합니다.');
    syncState();
  };

  // 60fps Parchment Alchemy Map Canvas Loop
  useEffect(() => {
    syncState();
    let animId: number;
    let bubbles: BoilingBubble[] = [];

    // Init bubbles
    for (let i = 0; i < 15; i++) {
      bubbles.push({
        x: Math.random() * 640,
        y: Math.random() * 380,
        r: 2 + Math.random() * 4,
        vy: 0.5 + Math.random() * 1.5,
        life: Math.random(),
      });
    }

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const engine = engineRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const originX = w / 2;
      const originY = h / 2;
      const SCALE = 36; // pixels per map unit

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // 1. Medieval Parchment Background
      ctx.fillStyle = '#fef3c7'; // warm parchment
      ctx.fillRect(0, 0, w, h);

      // Vignette & Aging border
      const grad = ctx.createRadialGradient(originX, originY, w * 0.2, originX, originY, w * 0.55);
      grad.addColorStop(0, 'rgba(254, 243, 199, 0)');
      grad.addColorStop(1, 'rgba(180, 83, 9, 0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Alchemy Grid Lines & Concentric Compass Rings
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.15)';
      ctx.lineWidth = 1;
      [1, 2, 3, 4, 5].forEach((radius) => {
        ctx.beginPath();
        ctx.arc(originX, originY, radius * SCALE, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis lines
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, h);
      ctx.moveTo(0, originY);
      ctx.lineTo(w, originY);
      ctx.stroke();

      // 2. Danger Skull Zones (Deadly Bones)
      for (const dz of engine.state.dangerZones) {
        const dx = originX + dz.x * SCALE;
        const dy = originY - dz.y * SCALE; // inverted y
        const dr = dz.radius * SCALE;

        ctx.fillStyle = 'rgba(127, 29, 29, 0.25)';
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Skull icon in center
        ctx.fillStyle = '#7f1d1d';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💀', dx, dy + 6);
      }

      // 3. Effect Nodes on Map
      for (const node of engine.state.effectNodes) {
        const nx = originX + node.x * SCALE;
        const ny = originY - node.y * SCALE;
        const nr = node.radius * SCALE;

        const isCurrent = engine.state.activeEffects.includes(node.effect);
        ctx.fillStyle = isCurrent ? 'rgba(59, 130, 246, 0.35)' : 'rgba(217, 119, 6, 0.18)';
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isCurrent ? '#2563eb' : '#b45309';
        ctx.lineWidth = isCurrent ? 2.5 : 1.5;
        ctx.stroke();

        // Icon based on effect
        const icons: Record<PotionEffect, string> = {
          healing: '❤️',
          poison: '☠️',
          fire: '🔥',
          frost: '❄️',
          mana: '🔮',
          lightning: '⚡',
          invisibility: '👁️',
        };

        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(icons[node.effect] || '🧪', nx, ny + 6);

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(node.name, nx, ny + nr + 13);
      }

      // 4. Draw Current Trajectory Path (Dotted Path)
      const path = engine.state.currentPath;
      if (path.length > 1) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        path.forEach((pt, idx) => {
          const px = originX + pt.x * SCALE;
          const py = originY - pt.y * SCALE;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint marker
        const lastPt = path[path.length - 1];
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(originX + lastPt.x * SCALE, originY - lastPt.y * SCALE, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw Potion Bottle
      const bx = originX + engine.state.bottleX * SCALE;
      const by = originY - engine.state.bottleY * SCALE;

      // Bottle Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 12, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass Bottle Body
      ctx.fillStyle = engine.state.isFailed
        ? '#7f1d1d'
        : engine.state.activeEffects.length > 0
        ? '#3b82f6'
        : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(bx, by, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottle Neck & Cork
      ctx.fillStyle = '#92400e'; // Cork
      ctx.fillRect(bx - 3.5, by - 18, 7, 5);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 3.5, by - 18, 7, 5);

      // Glass Reflection highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(bx - 3, by - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // 6. Boiling Bubbles in Cauldron Atmosphere
      ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
      for (const b of bubbles) {
        b.y -= b.vy;
        if (b.y < 0) {
          b.y = h;
          b.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-foreground max-w-4xl mx-auto select-none">
      {/* Top Header: Shop Gold, Customer Order, Day Status */}
      <div className="w-full bg-card/90 border border-border rounded-xl p-3 mb-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground tracking-wider">연금술사 작업실</span>
            <div className="text-xl font-black text-warning font-mono flex items-center gap-1">
              <span>💰 {gold} Gold</span>
            </div>
          </div>
        </div>

        {/* Customer Request Dialogue Card */}
        {currentCustomer && (
          <div className="flex-1 mx-4 bg-muted/60 border border-border/80 rounded-lg p-2 text-xs flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-primary mr-1.5">👤 {currentCustomer.customerName}:</span>
              <span className="text-foreground">"{currentCustomer.requestText}"</span>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded bg-warning/20 text-warning font-bold font-mono">
                보수: +{currentCustomer.rewardGold}G
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleResetCauldron}
          className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold rounded-lg transition-all"
        >
          가마솥 비우기 ↺
        </button>
      </div>

      {/* Main Parchment Alchemy Map Canvas */}
      <div className="relative border-2 border-border rounded-xl overflow-hidden shadow-2xl bg-card w-full max-w-2xl">
        <canvas ref={canvasRef} width={640} height={380} className="w-full h-auto block" />

        {/* Feedback Alert Pill */}
        {feedbackMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/90 border border-border px-3.5 py-1.5 rounded-full shadow-lg text-xs font-semibold text-foreground pointer-events-none">
            {feedbackMsg}
          </div>
        )}

        {/* Active Effect Floating Badge */}
        {activeEffects.length > 0 && (
          <div className="absolute bottom-3 left-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 pointer-events-none">
            <span>✨ 효능 접촉:</span>
            <span>{activeEffects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Laboratory Workbench Controls */}
      <div className="w-full max-w-2xl mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* 1. Mortar & Pestle (약초 빻기) */}
        <div className="bg-card/90 border border-border rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-foreground">1. 절구통 (Mortar)</span>
              <span className="text-xs font-mono text-muted-foreground">
                {Math.round(grindProgress * 100)}% 분쇄
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {activeIngredient ? `${inventory[activeIngredient].name}` : '약초를 선택하세요'}
            </p>
            {/* Grind Progress Bar */}
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-3">
              <div
                className="bg-primary h-full transition-all duration-150 rounded-full w-(--grind-w)"
                style={{ '--grind-w': `${grindProgress * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handleGrind}
              disabled={!activeIngredient || grindProgress >= 1}
              className="flex-1 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded border border-border disabled:opacity-40"
            >
              🔨 빻기 (Grind)
            </button>
            <button
              onClick={handleAddToCauldron}
              disabled={!activeIngredient}
              className="flex-1 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded disabled:opacity-40"
            >
              투입 ➔
            </button>
          </div>
        </div>

        {/* 2. Cauldron & Ladle (가마솥 젓기 및 희석) */}
        <div className="bg-card/90 border border-border rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-foreground">2. 가마솥 (Cauldron)</span>
              <span className={`text-xs font-bold ${isFailed ? 'text-destructive' : 'text-primary'}`}>
                {isFailed ? '⚠️ 파괴됨' : '정상 가동'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              국자를 저어 궤적을 전진시키고, 물을 부어 중심 원점으로 미세 조정하세요.
            </p>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handleStir}
              disabled={isFailed}
              className="flex-1 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded border border-border disabled:opacity-40"
            >
              🥄 젓기 (Stir)
            </button>
            <button
              onClick={handleAddWater}
              disabled={isFailed}
              className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs rounded disabled:opacity-40"
            >
              💧 물 붓기
            </button>
          </div>
        </div>

        {/* 3. Bellows & Complete Potion (불 지피기 & 서빙) */}
        <div className="bg-card/90 border border-border rounded-xl p-3 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-foreground">3. 조제 & 서빙</span>
              <span className="text-xs text-warning font-bold">
                {activeEffects.length > 0 ? '완성 가능!' : '효능 미달'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              원하는 효능 노드에 닿았을 때 불을 지펴 손님에게 물약을 판매하세요.
            </p>
          </div>

          <button
            onClick={handleBrewAndServe}
            disabled={isFailed || activeEffects.length === 0}
            className="w-full py-2 bg-warning hover:bg-warning/90 text-warning-foreground font-black text-xs rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span>🔥 불 지피기 & 서빙 (Serve)</span>
          </button>
        </div>
      </div>

      {/* Herb Garden Inventory Shelf */}
      <div className="w-full max-w-2xl mt-2 bg-card/60 border border-border rounded-xl p-3">
        <span className="text-xs font-bold text-muted-foreground tracking-wider mb-2 block">
          🌿 약초 선반 (HERB GARDEN) — 클릭하여 절구에 투입
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(inventory) as IngredientId[]).map((id) => {
            const ing = inventory[id];
            return (
              <button
                key={id}
                onClick={() => handleSelectIngredient(id)}
                disabled={ing.count <= 0 || activeIngredient !== null}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted/60 transition-all text-left flex flex-col justify-between disabled:opacity-40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{ing.name.split(' ')[0]}</span>
                  <span className="text-xs font-mono font-bold text-primary">x{ing.count}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {id === 'terraria'
                    ? '동남쪽 궤적'
                    : id === 'waterbloom'
                    ? '북동쪽 궤적'
                    : id === 'firebell'
                    ? '남서쪽 궤적'
                    : '북서쪽 궤적'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
