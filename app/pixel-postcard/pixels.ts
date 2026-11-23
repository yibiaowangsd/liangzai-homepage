export const side = 16;
export const area = side * side;

export const palettes = [
  { id: 'dusk', name: '邮差的黄昏', inks: ['#f6e5c4','#283447','#784864','#cb665d','#eea961','#faf4d7','#52918c','#91bdb0'], names: ['奶油纸','夜墨','暮紫','砖红','灯橙','月白','深海','浅海'] },
  { id: 'garden', name: '雨后的庭院', inks: ['#e9ecd6','#213d38','#496b4d','#7d9d55','#cf7b75','#f5bbb3','#4a807d','#9bbca7'], names: ['稻草纸','苔墨','树绿','嫩芽','玫瑰','花瓣','湖蓝','雨雾'] },
  { id: 'space', name: '失眠的星球', inks: ['#27233f','#111325','#755599','#c573a9','#ffad7d','#fff5d8','#497acc','#83d3d9'], names: ['葡萄夜','深空','紫云','星砂粉','橘火','银星','行星蓝','冰蓝'] },
] as const;
export type PaletteId = (typeof palettes)[number]['id'];
export type Picture = { palette: PaletteId; cells: number[] };
export type Point = { x: number; y: number };

export const blank = () => Array<number>(area).fill(0);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const prefix = 'stamp1=';
export function encodePicture(picture: Picture) {
  const palette = palettes.findIndex(item => item.id === picture.palette);
  if (palette < 0 || picture.cells.length !== area ||
      picture.cells.some(cell => !Number.isInteger(cell) || cell < 0 || cell > 7)) throw new Error('Invalid postcard');
  let payload = String(palette);
  for (let index = 0; index < area; index += 2) {
    payload += alphabet[picture.cells[index] * 8 + picture.cells[index + 1]];
  }
  return '#' + prefix + payload;
}

export function decodePicture(fragment: string): Picture | null {
  if (!fragment.startsWith('#' + prefix) || fragment.length !== prefix.length + 2 + area / 2 ||
      !/^#stamp1=[012][A-Za-z0-9_-]+$/.test(fragment)) return null;
  const offset = prefix.length + 1;
  const selected = palettes[Number(fragment[offset])];
  if (!selected) return null;
  const cells: number[] = [];
  for (const char of fragment.slice(offset + 1)) {
    const pair = alphabet.indexOf(char);
    cells.push(pair >> 3, pair & 7);
  }
  return { palette: selected.id, cells };
}

export function stroke(cells: number[], from: Point, to: Point, ink: number) {
  let { x, y } = from;
  // Integer Bresenham including both endpoints, so quick strokes stay connected.
  const dx = Math.abs(to.x - x), dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  let next = cells;
  for (;;) {
    const index = y * side + x;
    if (next[index] !== ink) {
      if (next === cells) next = cells.slice();
      next[index] = ink;
    }
    if (x === to.x && y === to.y) return next;
    const doubled = 2 * error;
    if (doubled >= dy) { error += dy; x += sx; }
    if (doubled <= dx) { error += dx; y += sy; }
  }
}

function art(rows: string[]): number[] {
  if (rows.length !== side || rows.some(row => !/^[0-7]{16}$/.test(row))) throw new Error('Invalid template');
  return rows.join('').split('').map(Number);
}

export const templates: { name: string; picture: Picture }[] = [
  { name: '海边的信号', picture: { palette: 'dusk', cells: art([
    '0000000000000000',
    '0000000055500000',
    '0000000555550000',
    '0000005555555000',
    '0000005555555000',
    '0000011555550000',
    '0000144100000000',
    '0000155100000000',
    '0000133100000000',
    '6677111166667776',
    '6666155167766666',
    '7766155166666677',
    '6661333316666666',
    '6611111111677666',
    '1111111111166666',
    '1111111111117776',
  ]) } },
  { name: '睡不醒的猫', picture: { palette: 'dusk', cells: art([
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0003000030000000',
    '0034300343000000',
    '0034433443000000',
    '0034444443000000',
    '0034144143000000',
    '0034455443000030',
    '0003455430000343',
    '0000343443000343',
    '0003444444300343',
    '0034454444433443',
    '0034455444444430',
    '0003333333333300',
    '0000000000000000',
  ]) } },
  { name: '池塘里开了一封信', picture: { palette: 'garden', cells: art([
    '0000000000000000',
    '0000000000000000',
    '0000050000500000',
    '0000045005400000',
    '0000044554400000',
    '0000004544000000',
    '0005505440550000',
    '0000454445400000',
    '6766645554467666',
    '6676664444666676',
    '6663332332367666',
    '6633222222336666',
    '6633222222366766',
    '6663333333666666',
    '7666666766667666',
    '6667666666766666',
  ]) } },
  { name: '给远方的星球', picture: { palette: 'space', cells: art([
    '0500000000000500',
    '0000050000000000',
    '0000000000000000',
    '0000006666000000',
    '0000067777600000',
    '0000677777760000',
    '0006777766633000',
    '0006776333320000',
    '0033633222260300',
    '0003333222633000',
    '0000022222330000',
    '0000000633000005',
    '0000003300000000',
    '0500000000000000',
    '0000000000500000',
    '0000000000000000',
  ]) } },
];
