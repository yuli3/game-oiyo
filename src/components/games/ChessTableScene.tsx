import { useEffect } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import type { ChessTableState } from "../../lib/games/chess-table";

function FixedCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 8.6, 6.4);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Piece({ piece, lifted }: { piece: string; lifted: boolean }) {
  const white = piece === piece.toUpperCase();
  const color = white ? "#f4efe4" : "#241c18";
  const y = lifted ? 0.72 : 0.28;
  const kind = piece.toLowerCase();
  if (kind === "r") return <mesh position={[0, y, 0]}><boxGeometry args={[0.42, 0.5, 0.42]} /><meshStandardMaterial color={color} /></mesh>;
  if (kind === "n") return <mesh position={[0, y + 0.08, 0]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.22, 0.62, 5]} /><meshStandardMaterial color={color} /></mesh>;
  if (kind === "b") return <mesh position={[0, y + 0.1, 0]}><coneGeometry args={[0.2, 0.7, 8]} /><meshStandardMaterial color={color} /></mesh>;
  if (kind === "q") return <mesh position={[0, y + 0.12, 0]}><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial color={color} /></mesh>;
  if (kind === "k") return <mesh position={[0, y, 0]}><boxGeometry args={[0.34, 0.62, 0.34]} /><meshStandardMaterial color={color} /></mesh>;
  return <mesh position={[0, y, 0]}><cylinderGeometry args={[0.16, 0.2, 0.42, 12]} /><meshStandardMaterial color={color} /></mesh>;
}

export default function ChessTableScene({
  table,
  label,
  onPick,
}: {
  table: ChessTableState;
  label: (row: number, column: number) => string;
  onPick: (square: [number, number]) => void;
}) {
  return (
    <Canvas camera={{ fov: 32, near: 0.1, far: 40 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "low-power" }}>
      <FixedCamera />
      <color attach="background" args={["#1a2430"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 3]} intensity={0.8} />
      <mesh position={[0, -0.08, 0]}><boxGeometry args={[9.2, 0.16, 9.2]} /><meshStandardMaterial color="#6b4a32" /></mesh>
      {table.position.board.map((rank, row) => rank.map((piece, column) => {
        const x = column - 3.5;
        const z = row - 3.5;
        const dark = (row + column) % 2 === 1;
        const selected = table.selected?.[0] === row && table.selected?.[1] === column;
        return (
          <group key={`${row}-${column}`} position={[x, 0, z]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[1, 0.08, 1]} /><meshStandardMaterial color={selected ? "#d7a441" : dark ? "#8d5a3c" : "#e7d3b0"} /></mesh>
            {piece ? <Piece piece={piece} lifted={selected} /> : null}
            <mesh
              name={label(row, column)}
              position={[0, 0.3, 0]}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onPick([row, column]);
              }}
            >
              <boxGeometry args={[0.96, 0.7, 0.96]} />
              <meshStandardMaterial transparent opacity={0} />
            </mesh>
          </group>
        );
      }))}
    </Canvas>
  );
}
