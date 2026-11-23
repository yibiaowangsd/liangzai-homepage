export const columns = 4;
export const rows = 5;
export const size = columns * rows;
export const allStars = (1 << size) - 1;

export function toggleMask(index: number) {
  const x = index % columns, y = Math.floor(index / columns);
  return [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].reduce(
    (mask, [a, b]) => a >= 0 && a < columns && b >= 0 && b < rows ? mask | (1 << (a + b * columns)) : mask,
    0,
  );
}

export const masks = Array.from({ length: size }, (_, index) => toggleMask(index));
export const isLit = (board: number, i: number) => Boolean(board & (1 << i));

export function dateKey(time = Date.now()) {
  return new Date(time + 8 * 3_600_000).toISOString().slice(0, 10);
}
export function puzzleFor(seed: string, moves: number) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const cells = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state / 4294967296 * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const solution = cells.slice(0, moves);
  return { solution, start: solution.reduce((board, i) => board ^ masks[i], allStars) };
}

export function boardAfter(start: number, moves: number[]) {
  return moves.reduce((board, index) => board ^ masks[index], start);
}

export function remainingMoves(solution: number[], moves: number[]) {
  const pending = new Set(solution);
  for (const move of moves) {
    if (pending.has(move)) pending.delete(move);
    else pending.add(move);
  }
  return Array.from(pending).sort((a, b) => a - b);
}

export type Progress = { moves: number[]; hints: number };
export function decodeProgress(raw: string | null): Progress {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || !Array.isArray(value.moves) || value.moves.length > 500 ||
      !value.moves.every((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < size) ||
      !Number.isInteger(value.hints) || value.hints < 0 || value.hints > 500) return { moves: [], hints: 0 };
    return { moves: value.moves, hints: value.hints };
  } catch { return { moves: [], hints: 0 }; }
}

export function dailyShare(day: string, moves: number, optimum: number, hints: number) {
  return `量仔 · 星阵点灯 ${day}\n${moves === optimum && hints === 0 ? "✦ 完美点亮" : "✦ 已点亮 20 颗星"} · ${moves} 步 · 提示 ${hints} 次\nhttps://wangyibiao.com/daily-play`;
}
