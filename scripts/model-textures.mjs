import { createHash } from 'node:crypto';
import sharp from 'sharp';

const align4 = n => Math.ceil(n / 4) * 4;
export const sha = data => createHash('sha256').update(data).digest('hex');

export function readGlb(data) {
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length)
    throw new Error('Invalid GLB 2.0');
  const length = data.readUInt32LE(12), start = 28 + length;
  const json = JSON.parse(data.subarray(20, 20 + length).toString());
  if (data.readUInt32LE(16) !== 0x4e4f534a || data.readUInt32LE(start - 4) !== 0x004e4942)
    throw new Error('Expected embedded GLB JSON and BIN chunks');
  return { json, bin: data.subarray(start, start + data.readUInt32LE(start - 8)) };
}

function writeGlb(json, bin) {
  const text = Buffer.from(JSON.stringify(json)), jsonLength = align4(text.length), binLength = align4(bin.length);
  const result = Buffer.alloc(28 + jsonLength + binLength);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonLength, 12); result.writeUInt32LE(0x4e4f534a, 16);
  result.fill(0x20, 20, 20 + jsonLength); text.copy(result, 20);
  result.writeUInt32LE(binLength, 20 + jsonLength); result.writeUInt32LE(0x004e4942, 24 + jsonLength);
  bin.copy(result, 28 + jsonLength);
  return result;
}

export function imageBuffers(data) {
  const { json, bin } = readGlb(data);
  return (json.images ?? []).map(image => {
    const view = json.bufferViews[image.bufferView];
    if (!view || view.buffer !== 0) throw new Error('Expected an embedded image');
    const start = view.byteOffset ?? 0;
    return bin.subarray(start, start + view.byteLength);
  });
}

export async function imageMetadata(data) {
  return Promise.all(imageBuffers(data).map(async image => {
    const meta = await sharp(image).metadata();
    return { width: meta.width, height: meta.height, bytes: image.length, sha256: sha(image) };
  }));
}

/** Resize only embedded PNGs. Meshopt streams, attributes and materials are not re-encoded. */
export async function resizeWebTextures(data, maxWidth = 2048, maxHeight = 1024) {
  const { json, bin } = readGlb(data), buffers = imageBuffers(data);
  const replacements = new Map();
  for (let i = 0; i < buffers.length; i++) {
    const meta = await sharp(buffers[i]).metadata();
    if (meta.width <= maxWidth && meta.height <= maxHeight) continue;
    if (json.images[i].mimeType !== 'image/png') throw new Error('Texture resize currently supports PNG only');
    const index = json.images[i].bufferView, view = json.bufferViews[index], start = view.byteOffset ?? 0;
    if (start % 4) throw new Error('Expected aligned embedded image');
    const image = await sharp(buffers[i]).resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    replacements.set(index, { index, start, end: start + align4(view.byteLength), image });
  }
  if (!replacements.size) return data; // Re-running the preparation must not resample an already small texture.
  const edits = [...replacements.values()].sort((a, b) => a.start - b.start), chunks = [];
  let cursor = 0;
  for (const edit of edits) {
    if (edit.start < cursor || edit.end > bin.length) throw new Error('Overlapping or truncated embedded images');
    chunks.push(bin.subarray(cursor, edit.start), edit.image, Buffer.alloc(align4(edit.image.length) - edit.image.length));
    cursor = edit.end;
  }
  chunks.push(bin.subarray(cursor));
  const outputBin = Buffer.concat(chunks);
  const relocate = offset => {
    let shift = 0;
    for (const edit of edits) {
      if (offset >= edit.end) shift += align4(edit.image.length) - (edit.end - edit.start);
      else if (offset > edit.start) throw new Error('Another view overlaps an embedded image');
    }
    return offset + shift;
  };
  for (let i = 0; i < json.bufferViews.length; i++) {
    const view = json.bufferViews[i], compressed = view.extensions?.EXT_meshopt_compression;
    if (view.buffer === 0) view.byteOffset = relocate(view.byteOffset ?? 0);
    if (compressed?.buffer === 0) compressed.byteOffset = relocate(compressed.byteOffset ?? 0);
    if (replacements.has(i)) view.byteLength = replacements.get(i).image.length;
  }
  json.buffers[0].byteLength = outputBin.length;
  return writeGlb(json, outputBin);
}
