/**
 * Zero-dependency, standards-compliant QR Code Matrix & SVG Generator.
 * Used for instant mobile QR scanning of cross-device 1:1 challenge links.
 */

// GF(256) Math tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

let x = 1;
for (let i = 0; i < 255; i++) {
  GF_EXP[i] = x;
  GF_EXP[i + 255] = x;
  GF_LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateRemainder(data: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcBytes - 1] = 0;
    for (let j = 0; j < numEcBytes; j++) {
      remainder[j] ^= gfMul(gen[j], factor);
    }
  }
  return remainder;
}

interface QrVersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  dataCodewords: number;
  ecPerBlock: number;
  blocks: { count: number; dataCodewords: number }[];
  alignmentCoords: number[];
}

const QR_SPECS_LEVEL_L: QrVersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, dataCodewords: 19, ecPerBlock: 7, blocks: [{ count: 1, dataCodewords: 19 }], alignmentCoords: [] },
  { version: 2, size: 25, totalCodewords: 44, dataCodewords: 34, ecPerBlock: 10, blocks: [{ count: 1, dataCodewords: 34 }], alignmentCoords: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, dataCodewords: 55, ecPerBlock: 15, blocks: [{ count: 1, dataCodewords: 55 }], alignmentCoords: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, dataCodewords: 80, ecPerBlock: 20, blocks: [{ count: 1, dataCodewords: 80 }], alignmentCoords: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, dataCodewords: 108, ecPerBlock: 26, blocks: [{ count: 1, dataCodewords: 108 }], alignmentCoords: [6, 30] },
  { version: 6, size: 41, totalCodewords: 172, dataCodewords: 136, ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 68 }], alignmentCoords: [6, 34] },
  { version: 7, size: 45, totalCodewords: 196, dataCodewords: 156, ecPerBlock: 20, blocks: [{ count: 2, dataCodewords: 78 }], alignmentCoords: [6, 22, 38] },
  { version: 8, size: 49, totalCodewords: 242, dataCodewords: 194, ecPerBlock: 24, blocks: [{ count: 2, dataCodewords: 97 }], alignmentCoords: [6, 24, 42] },
  { version: 9, size: 53, totalCodewords: 292, dataCodewords: 232, ecPerBlock: 30, blocks: [{ count: 2, dataCodewords: 116 }], alignmentCoords: [6, 26, 46] },
  { version: 10, size: 57, totalCodewords: 346, dataCodewords: 274, ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 68 }, { count: 2, dataCodewords: 69 }], alignmentCoords: [6, 28, 50] },
];

function selectSpec(dataLen: number): QrVersionSpec {
  for (const spec of QR_SPECS_LEVEL_L) {
    // In Byte mode: 4 bits mode + (8 or 16 bits count) + dataLen * 8 bits
    const countBits = spec.version >= 10 ? 16 : 8;
    const requiredCodewords = Math.ceil((4 + countBits + dataLen * 8 + 4) / 8);
    if (requiredCodewords <= spec.dataCodewords) {
      return spec;
    }
  }
  return QR_SPECS_LEVEL_L[QR_SPECS_LEVEL_L.length - 1];
}

class BitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.putBit(((num >>> i) & 1) === 1);
    }
  }

  putBit(bit: boolean): void {
    const byteIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= byteIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[byteIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

/**
 * Builds data codewords with standard Byte mode packaging & padding.
 */
function createDataCodewords(text: string, spec: QrVersionSpec): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const bb = new BitBuffer();

  // Mode Indicator: Byte mode (0100)
  bb.put(0x4, 4);

  // Character Count Indicator
  const countBits = spec.version >= 10 ? 16 : 8;
  bb.put(bytes.length, countBits);

  // Data payload
  for (const b of bytes) {
    bb.put(b, 8);
  }

  // Terminator (up to 4 bits)
  const remainingBits = spec.dataCodewords * 8 - bb.length;
  bb.put(0, Math.min(4, Math.max(0, remainingBits)));

  // Align to byte boundary
  while (bb.length % 8 !== 0) {
    bb.putBit(false);
  }

  // Pad bytes 0xEC, 0x11
  const out = new Uint8Array(spec.dataCodewords);
  out.set(bb.buffer);
  let padIdx = bb.buffer.length;
  let padByte = 0xec;
  while (padIdx < spec.dataCodewords) {
    out[padIdx++] = padByte;
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  return out;
}

// 15-bit format info values for Level L (masks 0..7) with BCH(15,5) error correction XORed with 0x5412
const FORMAT_INFO_LEVEL_L: readonly number[] = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
];

/**
 * Generates the full 2D boolean module matrix for the given text.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const spec = selectSpec(new TextEncoder().encode(text).length);
  const size = spec.size;
  const data = createDataCodewords(text, spec);

  // Split into blocks and compute Reed-Solomon EC bytes
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let dataOffset = 0;

  for (const blockInfo of spec.blocks) {
    for (let c = 0; c < blockInfo.count; c++) {
      const slice = data.slice(dataOffset, dataOffset + blockInfo.dataCodewords);
      dataBlocks.push(slice);
      ecBlocks.push(rsCalculateRemainder(slice, spec.ecPerBlock));
      dataOffset += blockInfo.dataCodewords;
    }
  }

  // Interleave data codewords, then EC codewords
  const interleaved: number[] = [];
  const maxDataCodewords = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataCodewords; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i]);
    }
  }

  // Setup matrix & reserved mask
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const markFinder = (startX: number, startY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          isFunction[y][x] = true;
          const isBlack =
            (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
            (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
            (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
          matrix[y][x] = isBlack;
        }
      }
    }
  };

  // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
  markFinder(0, 0);
  markFinder(size - 7, 0);
  markFinder(0, size - 7);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Alignment patterns
  for (const r of spec.alignmentCoords) {
    for (const c of spec.alignmentCoords) {
      // Skip if overlapping with finders
      if (
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= size - 8) ||
        (r >= size - 8 && c <= 8)
      ) {
        continue;
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          isFunction[r + dy][c + dx] = true;
          matrix[r + dy][c + dx] =
            Math.max(Math.abs(dx), Math.abs(dy)) === 2 || (dx === 0 && dy === 0);
        }
      }
    }
  }

  // 4. Dark Module
  isFunction[4 * spec.version + 9][8] = true;
  matrix[4 * spec.version + 9][8] = true;

  // 5. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    isFunction[8][i] = true;
    isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }

  // 6. Place data bits (Zigzag scan)
  let bitIdx = 0;
  const totalBits = interleaved.length * 8;
  let dir = -1; // up
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip vertical timing column
    const rows = dir === -1
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (!isFunction[r][curCol]) {
          let bit = false;
          if (bitIdx < totalBits) {
            const byteVal = interleaved[Math.floor(bitIdx / 8)];
            bit = ((byteVal >>> (7 - (bitIdx % 8))) & 1) === 1;
            bitIdx++;
          }
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + curCol) % 2 === 0;
          matrix[r][curCol] = bit !== mask;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // 7. Write format info (Level L, Mask 0 -> FORMAT_INFO_LEVEL_L[0])
  const formatInfo = FORMAT_INFO_LEVEL_L[0];
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >>> i) & 1) === 1;
    // Top-left
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split bottom-left and top-right
    if (i < 8) {
      matrix[size - 1 - i][8] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  return matrix;
}

export interface QrSvgOptions {
  size?: number;
  quietZone?: number;
  color?: string;
  background?: string;
  title?: string;
}

/**
 * Returns a self-contained, responsive SVG string for the QR code.
 */
export function generateChallengeQrSvg(text: string, options: QrSvgOptions = {}): string {
  const matrix = generateQrMatrix(text);
  const quietZone = options.quietZone ?? 4;
  const modCount = matrix.length;
  const viewBoxSize = modCount + quietZone * 2;
  const pixelSize = options.size ?? 256;
  const color = options.color ?? "#000000";
  const bg = options.background ?? "#ffffff";

  let pathData = "";
  for (let r = 0; r < modCount; r++) {
    for (let c = 0; c < modCount; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + quietZone},${r + quietZone}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${bg}"/>
  <path d="${pathData.trim()}" fill="${color}"/>
</svg>`;
}
