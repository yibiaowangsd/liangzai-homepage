// Public classical test data, RFC 9529 sections 2.3, 2.5 and 2.6.
// This script implements no handshake or PQ draft variant.
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const prk4 = Buffer.from('d584ac2e5dad5a77d14b53ebe72ef1d5daa8860d399373bf2c240afa7ba804da', 'hex');
const th4 = Buffer.from('0eb868f263cf3555dccd396dd8dec29d3750d599be42d5a41a5a37c896f294ac', 'hex');
function uint(n) {
  if (!Number.isInteger(n) || n < 0 || n > 255) throw new RangeError('fixture uses one-byte unsigned values');
  return Buffer.from(n < 24 ? [n] : [24, n]);
}
function info(label, context, length) {
  if (context.length > 255) throw new RangeError('fixture context exceeds 255 bytes');
  const header = Buffer.from(context.length < 24 ? [0x40 + context.length] : [0x58, context.length]);
  return Buffer.concat([uint(label), header, context, uint(length)]);
}
function expand(prk, cbor, length) {
  if (length < 1 || length > 32) throw new RangeError('single-block SHA-256 fixture');
  return createHmac('sha256', prk).update(cbor).update(Buffer.from([1])).digest().subarray(0, length);
}
export function verifyBaseline() {
  const empty = Buffer.alloc(0);
  const infoOut = info(7, th4, 32);
  const keyOut = expand(prk4, infoOut, 32);
  const infoExporter = info(10, empty, 32);
  const exporter = expand(keyOut, infoExporter, 32);
  const secret = expand(exporter, info(0, empty, 16), 16);
  const salt = expand(exporter, info(1, empty, 8), 8);
  return Object.fromEntries(Object.entries({infoOut, keyOut, infoExporter, exporter, secret, salt})
    .map(([k, v]) => [k, v.toString('hex')]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(verifyBaseline(), null, 2));
}
