import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StanleyChoiceEngine,
  ENDINGS_CATALOG,
  type EndingId,
  type RoomDefinition,
} from '../../lib/games/stanley-choice';

const STORAGE_KEY = 'oiyo_stanley_choice_endings_v1';

export default function StanleyChoice() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<StanleyChoiceEngine>(new StanleyChoiceEngine());

  const [currentRoom, setCurrentRoom] = useState<RoomDefinition>(
    engineRef.current.getCurrentRoom()
  );
  const [currentEnding, setCurrentEnding] = useState<EndingId | null>(null);
  const [unlockedEndings, setUnlockedEndings] = useState<EndingId[]>([]);
  const [narratorSubtitle, setNarratorSubtitle] = useState<string>('');
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [doorSwing, setDoorSwing] = useState<number>(0); // 0 to 1 open animation
  const [showCodex, setShowCodex] = useState<boolean>(false);

  // Web Audio Context
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

  const playSound = useCallback(
    (type: 'step' | 'door' | 'click' | 'narrator' | 'ending' | 'elevator') => {
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'step') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'door') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'click') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === 'narrator') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220 + Math.random() * 60, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
        } else if (type === 'elevator') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5 chime
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        } else if (type === 'ending') {
          [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.25, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.5);
          });
        }
      } catch {
        // audio autoplay safe
      }
    },
    [initAudio]
  );

  // Load persistent endings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EndingId[];
        if (Array.isArray(parsed)) {
          engineRef.current.state.unlockedEndings = new Set(parsed);
          setUnlockedEndings(parsed);
        }
      }
    } catch {
      // storage safe
    }
  }, []);

  // Save persistent endings on change
  const saveEndings = useCallback((endings: Set<EndingId>) => {
    try {
      const arr = Array.from(endings);
      setUnlockedEndings(arr);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // storage safe
    }
  }, []);

  // Sync state & trigger typewriter subtitle
  const syncState = useCallback(() => {
    const engine = engineRef.current;
    setCurrentRoom(engine.getCurrentRoom());
    setCurrentEnding(engine.state.currentEnding);
    saveEndings(engine.state.unlockedEndings);

    // Latest speech
    const queue = engine.state.narratorSpeechQueue;
    if (queue.length > 0) {
      setNarratorSubtitle(queue[queue.length - 1]);
      playSound('narrator');
    }
  }, [playSound, saveEndings]);

  // Choice Selection
  const handleSelectOption = useCallback(
    (choiceId: string) => {
      initAudio();
      playSound('click');
      setDoorSwing(1.0); // trigger door opening swing

      setTimeout(() => {
        const res = engineRef.current.makeChoice(choiceId);
        if (res.success) {
          if (engineRef.current.state.currentEnding) {
            playSound('ending');
          } else {
            playSound('door');
          }
          syncState();
        }
      }, 200);
    },
    [initAudio, playSound, syncState]
  );

  // Restart Loop
  const handleRestart = useCallback(() => {
    initAudio();
    playSound('step');
    engineRef.current.restartGame();
    syncState();
  }, [initAudio, playSound, syncState]);

  // 60fps 3D Perspective Canvas Engine
  useEffect(() => {
    syncState();
    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const vpX = width / 2;
      const vpY = height / 2 - 10;

      // Update door swing decay
      setDoorSwing((prev) => Math.max(0, prev - dt * 2.5));

      // Head bobbing on movement
      const bob = Math.sin(time * 0.003) * 2;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Ceiling
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, vpY);

      // Floor (Office carpet tile with perspective lines)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, vpY, width, height - vpY);

      // Floor Grid Perspective Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      const lines = [-3, -2, -1, 0, 1, 2, 3];
      lines.forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY + bob);
        ctx.lineTo(vpX + offset * 130, height);
        ctx.stroke();
      });

      // Ceiling Fluorescent Lamps
      const lampGlow = Math.sin(time * 0.006) * 0.05 + 0.95;
      ctx.fillStyle = `rgba(248, 250, 252, ${0.4 * lampGlow})`;
      ctx.fillRect(vpX - 40, vpY - 80 + bob, 80, 8);
      ctx.fillRect(vpX - 100, vpY - 130 + bob, 200, 10);

      // Walls
      ctx.fillStyle = '#090d16';
      // Left wall
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vpX - 180, vpY - 90 + bob);
      ctx.lineTo(vpX - 180, vpY + 90 + bob);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Right wall
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(vpX + 180, vpY - 90 + bob);
      ctx.lineTo(vpX + 180, vpY + 90 + bob);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Wall Trims
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 10);
      ctx.lineTo(vpX - 180, vpY + 90 + bob);
      ctx.lineTo(vpX + 180, vpY + 90 + bob);
      ctx.lineTo(width, height - 10);
      ctx.stroke();

      // Interactive Doors / Center Scene Rendering
      const room = engineRef.current.getCurrentRoom();

      if (room.visualScene === 'doors') {
        // Two Doors (Left & Right)
        const doorW = 80;
        const doorH = 150;
        const leftX = vpX - 110;
        const rightX = vpX + 30;
        const doorY = vpY - 60 + bob;

        // Left Door Frame & Door
        const isLeftHover = hoveredOptionId === 'door_left';
        ctx.fillStyle = isLeftHover ? '#3b82f6' : '#1e293b';
        ctx.fillRect(leftX, doorY, doorW, doorH);
        ctx.strokeStyle = isLeftHover ? '#60a5fa' : '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(leftX, doorY, doorW, doorH);

        // Left Door Knob & Sign
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(leftX + doorW - 12, doorY + doorH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('왼쪽 문', leftX + doorW / 2, doorY + 28);

        // Right Door Frame & Door
        const isRightHover = hoveredOptionId === 'door_right';
        ctx.fillStyle = isRightHover ? '#ef4444' : '#1e293b';
        ctx.fillRect(rightX, doorY, doorW, doorH);
        ctx.strokeStyle = isRightHover ? '#f87171' : '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(rightX, doorY, doorW, doorH);

        // Right Door Knob & Sign
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(rightX + 12, doorY + doorH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('오른쪽 문', rightX + doorW / 2, doorY + 28);
      } else if (room.visualScene === 'office') {
        // Office 427 Desk & Monitor
        const deskY = vpY + 30 + bob;
        ctx.fillStyle = '#334155';
        ctx.fillRect(vpX - 90, deskY, 180, 50);

        // CRT Monitor with green text
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(vpX - 45, deskY - 60, 90, 55);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX - 45, deskY - 60, 90, 55);

        // Screen Glow
        ctx.fillStyle = '#22c55e';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STANLEY #427', vpX, deskY - 35);
        ctx.fillText('> AWAITING INPUT', vpX, deskY - 20);

        // Coffee Mug
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(vpX + 55, deskY + 10, 12, 16);
      } else if (room.visualScene === 'control') {
        // Mind Control Huge Computer Panel
        const panelY = vpY - 50 + bob;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(vpX - 140, panelY, 280, 140);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(vpX - 140, panelY, 280, 140);

        // Blinking status lights
        for (let i = 0; i < 8; i++) {
          const lightGlow = (time * 0.005 + i) % 2 > 1;
          ctx.fillStyle = lightGlow ? '#ef4444' : '#22c55e';
          ctx.beginPath();
          ctx.arc(vpX - 110 + i * 32, panelY + 25, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MIND CONTROL FACILITY', vpX, panelY + 65);

        // Big Buttons: OFF vs ON
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(vpX - 90, panelY + 85, 70, 32);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('[ OFF ]', vpX - 55, panelY + 106);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(vpX + 20, panelY + 85, 70, 32);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('[ ON ]', vpX + 55, panelY + 106);
      } else {
        // Standard Hallway with Single End Door
        const doorW = 90;
        const doorH = 160;
        const doorX = vpX - doorW / 2;
        const doorY = vpY - 70 + bob;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(doorX, doorY, doorW, doorH);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(doorX, doorY, doorW, doorH);

        // Door Swing Animation
        if (doorSwing > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(doorX, doorY, doorW * (1 - doorSwing * 0.4), doorH);
        }

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(doorX + doorW - 12, doorY + doorH / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.title, vpX, doorY + 30);
      }

      // Narrator Audio Waveform Visualizer in top corner
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const waveY = 22 + Math.sin(time * 0.015 + i * 0.5) * 6;
        if (i === 0) ctx.moveTo(width - 90 + i * 3.5, waveY);
        else ctx.lineTo(width - 90 + i * 3.5, waveY);
      }
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [doorSwing, hoveredOptionId, syncState]);

  const completionPct = Math.round((unlockedEndings.length / ENDINGS_CATALOG.length) * 100);

  return (
    <div className="flex flex-col items-center justify-center p-3 text-foreground max-w-4xl mx-auto select-none">
      {/* Top Header: Narrator Speech & Ending Completion Bar */}
      <div className="w-full bg-card/90 border border-border rounded-xl p-3 mb-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-primary tracking-wider flex items-center gap-1.5">
              <span>🎙️ 내레이터 (THE NARRATOR)</span>
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">
              {currentRoom.title} — {currentRoom.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCodex(!showCodex)}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>📜 엔딩 도감 ({unlockedEndings.length}/8)</span>
            <span className="font-mono text-primary">{completionPct}%</span>
          </button>

          <button
            onClick={handleRestart}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            처음부터 ↺
          </button>
        </div>
      </div>

      {/* Main 60fps 3D Perspective Canvas */}
      <div className="relative border border-border rounded-xl overflow-hidden shadow-2xl bg-card w-full max-w-2xl">
        <canvas ref={canvasRef} width={640} height={380} className="w-full h-auto block" />

        {/* Narrator Subtitle Overlay at Bottom of Canvas */}
        <div className="absolute bottom-3 left-4 right-4 bg-background/90 border border-border/80 rounded-lg p-2.5 backdrop-blur-md shadow-lg pointer-events-none">
          <p className="text-xs font-medium text-foreground leading-relaxed text-center">
            "{narratorSubtitle}"
          </p>
        </div>

        {/* Ending Screen Overlay */}
        {currentEnding && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase mb-1">
              THE STANLEY PARABLE
            </span>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">
              {ENDINGS_CATALOG.find((e) => e.id === currentEnding)?.title}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
              {ENDINGS_CATALOG.find((e) => e.id === currentEnding)?.desc}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-lg text-sm transition-all"
              >
                사무실 427로 다시 리셋 ↺
              </button>
              <button
                onClick={() => setShowCodex(true)}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-sm border border-border"
              >
                도감 확인
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decision Choice Buttons */}
      {!currentEnding && (
        <div className="w-full max-w-2xl mt-2 flex flex-col gap-2">
          {currentRoom.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              onMouseEnter={() => setHoveredOptionId(option.id)}
              onMouseLeave={() => setHoveredOptionId(null)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card/80 hover:bg-primary/10 hover:border-primary transition-all text-sm font-semibold flex items-center justify-between group"
            >
              <span className="text-foreground group-hover:text-primary transition-colors">
                👉 {option.label}
              </span>
              <span className="text-xs text-muted-foreground font-mono">선택</span>
            </button>
          ))}
        </div>
      )}

      {/* Ending Codex Modal / Drawer */}
      {showCodex && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 shadow-2xl max-h-128 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">엔딩 수집 도감 (ENDINGS TREE)</h3>
                <p className="text-xs text-muted-foreground">
                  총 8개의 서로 다른 철학적 엔딩을 모두 찾아보세요.
                </p>
              </div>
              <button
                onClick={() => setShowCodex(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold px-2 py-1"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="space-y-2">
              {ENDINGS_CATALOG.map((end) => {
                const isUnlocked = unlockedEndings.includes(end.id);
                return (
                  <div
                    key={end.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isUnlocked
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border/50 bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground">
                        {isUnlocked ? end.title : '??? (미발견 엔딩)'}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {end.code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isUnlocked ? end.desc : '특정 분기에서 내레이터의 지시를 시험해보세요.'}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowCodex(false)}
              className="w-full mt-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg text-sm"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
