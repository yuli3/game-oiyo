import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearLine,
  connectStationToLine,
  createInitialMiniMetroGame,
  type MetroLine,
  type MetroStation,
  type MetroTrain,
  type MiniMetroGame,
  type StationShape,
  stepMiniMetro,
} from "@/lib/games/mini-metro";
import { triggerHaptic } from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";

interface MiniMetroProps {
  locale?: string;
}

export default function MiniMetro({ locale = "ko" }: MiniMetroProps) {
  const [game, setGame] = useState<MiniMetroGame>(() => createInitialMiniMetroGame());
  const [activeLineId, setActiveLineId] = useState<string>("line-red");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const gameRef = useRef<MiniMetroGame>(game);
  gameRef.current = game;

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Main high-performance simulation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const current = gameRef.current;
      if (current.status === "running") {
        const { game: nextGame, events } = stepMiniMetro(current, dt);

        if (events.deliveredCount > 0) {
          triggerHaptic("light");
          // Play ambient chime based on total delivered count mod 5
          const notes = [523.25, 587.33, 659.25, 783.99, 880.0];
          const noteFreq = notes[nextGame.passengersDelivered % notes.length];
          playSyntheticTone(audioCtxRef.current, {
            freq: noteFreq,
            duration: 0.12,
            type: "sine",
            gain: 0.12,
          });
        }

        if (events.newStationSpawned) {
          triggerHaptic("medium");
          playSyntheticTone(audioCtxRef.current, {
            freq: 440,
            duration: 0.2,
            type: "triangle",
            gain: 0.1,
          });
        }

        if (events.overcrowdedStationIds.length > 0) {
          triggerHaptic("light");
        }

        setGame(nextGame);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleStationClick = (stationId: string) => {
    if (game.status !== "running") return;

    if (!selectedStationId) {
      // First click: select station to connect from
      setSelectedStationId(stationId);
      // If the active line doesn't have this station, add it
      const nextGame = connectStationToLine(game, activeLineId, stationId);
      setGame(nextGame);
      playSyntheticTone(audioCtxRef.current, { freq: 392, duration: 0.06, type: "sine" });
      triggerHaptic("light");
    } else {
      // Second click: connect selected station to clicked station
      const nextGame = connectStationToLine(game, activeLineId, stationId);
      setGame(nextGame);
      setSelectedStationId(null);
      playSyntheticTone(audioCtxRef.current, { freq: 523.25, duration: 0.08, type: "sine" });
      triggerHaptic("light");
    }
  };

  const handleClearLine = (lineId: string) => {
    const nextGame = clearLine(game, lineId);
    setGame(nextGame);
    setSelectedStationId(null);
    playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.1, type: "sawtooth" });
    triggerHaptic("medium");
  };

  const handleRestart = () => {
    setGame(createInitialMiniMetroGame());
    setSelectedStationId(null);
  };

  const handleTogglePause = () => {
    setGame((prev) => ({
      ...prev,
      status: prev.status === "running" ? "paused" : "running",
    }));
  };

  const activeLine = game.lines.find((l) => l.id === activeLineId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 p-4 select-none">
      {/* Header HUD */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {locale === "ko" ? "미니 메트로 웹" : "Mini Metro Web"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {locale === "ko"
              ? "노선을 연결하여 승객을 목적지 역으로 실어 나르세요!"
              : "Design subway lines to transport passengers to their matching stations!"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "수송 승객" : "Delivered"}
            </span>
            <span className="text-xl font-black text-primary">{game.passengersDelivered}</span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "일차" : "Day"}
            </span>
            <span className="text-xl font-black text-foreground">{game.day}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePause}
          >
            {game.status === "running" ? (locale === "ko" ? "일시정지" : "Pause") : (locale === "ko" ? "재개" : "Play")}
          </Button>
        </div>
      </div>

      {/* Line Management Toolbar */}
      <div className="flex w-full items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {game.lines.map((line) => {
            const isSelected = line.id === activeLineId;
            return (
              <button
                key={line.id}
                type="button"
                onClick={() => {
                  setActiveLineId(line.id);
                  setSelectedStationId(null);
                }}
                style={{ "--line-color": line.color } as React.CSSProperties}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform ${
                  isSelected
                    ? "ring-2 ring-primary scale-105 border-foreground"
                    : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full bg-(--line-color)"
                />
                <span>{line.name}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  ({line.stationIds.length}역)
                </span>
              </button>
            );
          })}
        </div>

        {activeLine && activeLine.stationIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearLine(activeLine.id)}
          >
            {locale === "ko" ? "현재 노선 초기화" : "Clear Line"}
          </Button>
        )}
      </div>

      {/* Main Metro Map Canvas SVG */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <svg
          viewBox="0 0 600 380"
          className="h-auto w-full touch-none select-none bg-muted/20"
        >
          {/* Subtle River / Coast aesthetic water path */}
          <path
            d="M -10 200 C 180 180, 280 280, 610 240 L 610 280 C 280 320, 180 220, -10 240 Z"
            className="fill-primary/10"
          />

          {/* Render Metro Lines */}
          {game.lines.map((line) => (
            <RenderMetroLineSvg
              key={line.id}
              line={line}
              stations={game.stations}
            />
          ))}

          {/* Render Trains moving along lines */}
          {game.lines.map((line) =>
            line.trains.map((train) => (
              <RenderTrainSvg
                key={train.id}
                train={train}
                line={line}
                stations={game.stations}
              />
            ))
          )}

          {/* Render Metro Stations */}
          {game.stations.map((station) => (
            <RenderStationSvg
              key={station.id}
              station={station}
              isSelected={selectedStationId === station.id}
              onClick={() => handleStationClick(station.id)}
            />
          ))}
        </svg>

        {/* Selected station prompt */}
        {selectedStationId && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/85 px-4 py-1.5 text-xs font-bold shadow backdrop-blur-sm">
            {locale === "ko"
              ? "연결할 다음 역을 클릭하세요"
              : "Click the next station to connect"}
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">⚠️</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "역이 과밀로 마비되었습니다!" : "Station Overcrowded!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `수송 완료한 승객: ${game.passengersDelivered}명 (생존 일수: ${game.day}일)`
                : `Passengers transported: ${game.passengersDelivered} (Survived: ${game.day} days)`}
            </p>
            <Button onClick={handleRestart} size="lg">
              {locale === "ko" ? "새 지하철망 설계하기" : "Redesign Transit Network"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderMetroLineSvg({
  line,
  stations,
}: {
  line: MetroLine;
  stations: MetroStation[];
}) {
  if (line.stationIds.length < 2) return null;

  const points = line.stationIds
    .map((id) => stations.find((s) => s.id === id))
    .filter((s): s is MetroStation => s !== undefined);

  if (points.length < 2) return null;

  // Build SVG path data with rounded corners
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  return (
    <g style={{ "--line-color": line.color } as React.CSSProperties}>
      <path
        d={d}
        stroke="var(--line-color)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.9}
      />
    </g>
  );
}

function RenderTrainSvg({
  train,
  line,
  stations,
}: {
  train: MetroTrain;
  line: MetroLine;
  stations: MetroStation[];
}) {
  if (line.stationIds.length < 2) return null;

  const fromStation = stations.find((s) => s.id === line.stationIds[train.currentStationIndex]);
  const nextIdx = train.currentStationIndex + train.direction;
  const toStation = stations.find((s) => s.id === line.stationIds[nextIdx]);

  if (!fromStation || !toStation) return null;

  const curX = fromStation.x + (toStation.x - fromStation.x) * train.progress;
  const curY = fromStation.y + (toStation.y - fromStation.y) * train.progress;

  return (
    <g
      transform={`translate(${curX}, ${curY})`}
      style={{ "--line-color": line.color } as React.CSSProperties}
    >
      {/* Train Carriage */}
      <rect
        x="-10"
        y="-6"
        width="20"
        height="12"
        rx="3"
        className="fill-foreground stroke-border"
        strokeWidth="1.5"
      />
      {/* Line Indicator Stripe */}
      <rect
        x="-8"
        y="-2"
        width="16"
        height="4"
        rx="1"
        fill="var(--line-color)"
      />
      {/* Passenger Count Pip */}
      {train.passengers.length > 0 && (
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          className="fill-background"
        >
          {train.passengers.length}
        </text>
      )}
    </g>
  );
}

function RenderStationSvg({
  station,
  isSelected,
  onClick,
}: {
  station: MetroStation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { x, y, shape, passengers, overcrowdedTimer } = station;
  const isCrowded = overcrowdedTimer > 0;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer transition-transform duration-150 hover:scale-110"
    >
      {/* Selection halo */}
      {isSelected && (
        <circle
          r="22"
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )}

      {/* Overcrowded Warning Ring */}
      {isCrowded && (
        <circle
          r="19"
          fill="none"
          className="stroke-destructive animate-pulse"
          strokeWidth="3"
          strokeDasharray="60"
          strokeDashoffset={60 * (1 - overcrowdedTimer / 15)}
        />
      )}

      {/* Station Base Icon */}
      <g className="fill-card stroke-foreground" strokeWidth="2.5">
        {shape === "circle" && <circle r="12" />}
        {shape === "triangle" && <polygon points="0,-13 11,8 -11,8" />}
        {shape === "square" && <rect x="-10" y="-10" width="20" height="20" rx="2" />}
        {shape === "star" && (
          <polygon points="0,-13 3.5,-4 13,-4 5.5,2 8.5,12 0,6 -8.5,12 -5.5,2 -13,-4 -3.5,-4" />
        )}
      </g>

      {/* Waiting Passengers Mini Dots */}
      <g transform="translate(16, -16)">
        {passengers.map((pShape, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const px = col * 8;
          const py = row * 8;
          return (
            <g key={idx} transform={`translate(${px}, ${py})`}>
              <RenderMiniShape shape={pShape} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

function RenderMiniShape({ shape }: { shape: StationShape }) {
  return (
    <g className="fill-foreground stroke-card" strokeWidth="0.5">
      {shape === "circle" && <circle r="3" />}
      {shape === "triangle" && <polygon points="0,-3.5 3,2.5 -3,2.5" />}
      {shape === "square" && <rect x="-2.5" y="-2.5" width="5" height="5" />}
      {shape === "star" && <polygon points="0,-3.5 1,-1 3.5,-1 1.5,0.5 2.5,3 0,1.5 -2.5,3 -1.5,0.5 -3.5,-1 -1,-1" />}
    </g>
  );
}
