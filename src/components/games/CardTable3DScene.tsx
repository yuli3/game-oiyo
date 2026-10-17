"use client";

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { SolitaireState, Card as CardType } from '../../lib/games/card-table';
import { getRankLabel, getSuitSymbol } from '../../lib/games/card-table';

interface Props {
  state: SolitaireState;
  selectedCardId: string | null;
  onStockClick: () => void;
  onWasteClick: () => void;
  onTableauCardClick: (colIndex: number, cardIndex: number) => void;
  onFoundationClick: (foundationIndex: number) => void;
  onEmptyTableauClick: (colIndex: number) => void;
}

// Card texture generator using in-memory HTML Canvas
function createCardTexture(card: CardType): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  if (!card.faceUp) {
    // Card back: Deep blue/gold classic geometric pattern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 180);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 116, 168);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 104, 156);

    // Cross diamond pattern
    ctx.beginPath();
    ctx.moveTo(64, 24);
    ctx.lineTo(104, 90);
    ctx.lineTo(64, 156);
    ctx.lineTo(24, 90);
    ctx.closePath();
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Card front: Clean crisp ivory/white with suit & rank
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 128, 180);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 176);

  const isRed = card.color === 'red';
  const textColor = isRed ? '#dc2626' : '#0f172a';
  const suitSym = getSuitSymbol(card.suit);
  const rankStr = getRankLabel(card.rank);

  // Top-left corner
  ctx.fillStyle = textColor;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankStr, 10, 8);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(suitSym, 10, 32);

  // Center big symbol
  ctx.font = '48px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suitSym, 64, 90);

  // Bottom-right corner (inverted)
  ctx.save();
  ctx.translate(118, 172);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankStr, 0, 0);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(suitSym, 0, 24);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Card3DMesh({
  card,
  position,
  isSelected,
  onClick,
}: {
  card: CardType;
  position: [number, number, number];
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createCardTexture(card);
  }, [card.id, card.faceUp, card.rank, card.suit]);

  const elevation = isSelected ? position[2] + 0.35 : position[2];

  return (
    <group
      position={[position[0], position[1], elevation]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.55, 0.02]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            roughness={0.3}
            metalness={0.1}
            emissive={isSelected ? '#38bdf8' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        ) : (
          <meshStandardMaterial color={card.faceUp ? '#ffffff' : '#1e293b'} />
        )}
      </mesh>
    </group>
  );
}

function SlotOutline({
  position,
  onClick,
}: {
  position: [number, number, number];
  label?: string;
  onClick?: () => void;
}) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.15, 1.6]} />
        <meshBasicMaterial color="#064e3b" transparent opacity={0.4} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.15, 1.6)]} />
        <lineBasicMaterial color="#10b981" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

function SceneContent({
  state,
  selectedCardId,
  onStockClick,
  onWasteClick,
  onTableauCardClick,
  onFoundationClick,
  onEmptyTableauClick,
}: Props) {
  // Board layout coordinates in 3D scene (X: -4.5 to +4.5, Y: +3.0 to -4.0)
  const stockPos: [number, number, number] = [-4.0, 2.5, 0];
  const wastePos: [number, number, number] = [-2.6, 2.5, 0];
  const foundationStartX = 0.2;
  const foundationSpacing = 1.4;

  const tableauStartX = -4.0;
  const tableauSpacing = 1.33;
  const tableauCardYOffset = 0.32;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 8]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, 6]} intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.5} />

      {/* Luxury Wood Table Frame & Green Felt Mat */}
      <mesh position={[0, -0.3, -0.1]} receiveShadow>
        <boxGeometry args={[11.5, 9.2, 0.2]} />
        <meshStandardMaterial color="#3e2723" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.3, 0.01]} receiveShadow>
        <planeGeometry args={[10.8, 8.5]} />
        <meshStandardMaterial color="#065f46" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Stock Slot */}
      <SlotOutline position={stockPos} label="Stock" onClick={onStockClick} />
      {state.stock.length > 0 && (
        <Card3DMesh
          card={state.stock[state.stock.length - 1]}
          position={[stockPos[0], stockPos[1], 0.03]}
          onClick={onStockClick}
        />
      )}

      {/* Waste Slot */}
      <SlotOutline position={wastePos} label="Waste" onClick={onWasteClick} />
      {state.waste.length > 0 && (
        <Card3DMesh
          card={state.waste[state.waste.length - 1]}
          position={[wastePos[0], wastePos[1], 0.03]}
          isSelected={state.waste[state.waste.length - 1].id === selectedCardId}
          onClick={onWasteClick}
        />
      )}

      {/* 4 Foundation Slots */}
      {[0, 1, 2, 3].map((fIdx) => {
        const fPos: [number, number, number] = [
          foundationStartX + fIdx * foundationSpacing,
          2.5,
          0,
        ];
        const foundation = state.foundations[fIdx];
        const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;

        return (
          <React.Fragment key={`foundation-${fIdx}`}>
            <SlotOutline position={fPos} label="A" onClick={() => onFoundationClick(fIdx)} />
            {topCard && (
              <Card3DMesh
                card={topCard}
                position={[fPos[0], fPos[1], 0.02 * foundation.length]}
                isSelected={topCard.id === selectedCardId}
                onClick={() => onFoundationClick(fIdx)}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* 7 Tableau Columns */}
      {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => {
        const col = state.tableau[colIdx];
        const colX = tableauStartX + colIdx * tableauSpacing;
        const baseSlotPos: [number, number, number] = [colX, 0.8, 0];

        return (
          <React.Fragment key={`col-${colIdx}`}>
            {col.length === 0 && (
              <SlotOutline
                position={baseSlotPos}
                label="K"
                onClick={() => onEmptyTableauClick(colIdx)}
              />
            )}
            {col.map((card, cardIdx) => {
              const cardY = 0.8 - cardIdx * tableauCardYOffset;
              const cardZ = 0.02 * (cardIdx + 1);
              return (
                <Card3DMesh
                  key={card.id}
                  card={card}
                  position={[colX, cardY, cardZ]}
                  isSelected={card.id === selectedCardId}
                  onClick={() => onTableauCardClick(colIdx, cardIdx)}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

export function CardTable3DScene(props: Props) {
  return (
    <div className="relative h-155 w-full overflow-hidden rounded-2xl border border-border bg-slate-950 shadow-inner">
      <Canvas
        shadows
        camera={{ position: [0, -1.0, 7.8], fov: 50 }}
        className="h-full w-full"
      >
        <color attach="background" args={['#090d16']} />
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
