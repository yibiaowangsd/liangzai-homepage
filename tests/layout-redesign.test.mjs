import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('searchable algorithm directory retains working lessons and clear lab navigation', async () => {
 const source = await read('app/pqc-arsenal/ArsenalLab.tsx');
 assert.match(source, /type="search" value=\{catalogQuery\}/);
 assert.match(source, /没有匹配的算法/);
 assert.match(source, /href="#weapons" onClick=\{\(\) => chooseWeapon\(item.id\)\}/);
 assert.match(source, /原理参考，未接入本地运行/);
 assert.match(source, /item.id !== "fn-dsa"/);
 assert.match(source, /进入实验室选择 \{item.name\}/);
 for (const id of ['break','math','weapons','loadout']) assert.ok(source.includes(`id="${id}"`));
 assert.doesNotMatch(source, /RSA 与 ECC 没有突然变弱/);
});

test('navigation keeps practical home entry points after retiring the observatory', async () => {
 const home = await read('app/QuantumHome.tsx');
 assert.match(home, /href="\/pqc-practice"/);
 assert.doesNotMatch(home, /portal-observatory|href="\/observatory"/);
 assert.doesNotMatch(await read('app/experience/destinations.ts'), /href: "\/observatory"/);
 for (const page of ['index', 'audit']) assert.doesNotMatch(await read(`public/pqc-practice/${page}.html`), /href="\/observatory"/);
 assert.match(home, /<CinemaEntrance/);
});

test('reader and model controls remain reachable in compact responsive layouts', async () => {
 const reader = await read('app/storybook/cinema-reader.css');
 assert.match(reader, /\.reader-controls \{ position: sticky; bottom: 0/);
 assert.match(reader, /min-height: 44px/);
 const model = await read('app/models/models.css');
 assert.match(model, /\.model-gallery-controls>div \{ flex-wrap: wrap/);
 assert.match(model, /color: var\(--theme-on-accent\)/);
});

test('model controls keep readable overlay labels in every palette', async () => {
 const theme = await read('public/theme/site-theme.css');
 assert.match(theme, /\.motion-switch \{ min-width: 44px/);
 assert.match(theme, /@media \(max-width: 430px\)/);
 const model = await read('app/models/models.css');
 assert.match(model, /\.model-gallery-number \{ background: var\(--theme-surface\); color: var\(--theme-ink\)/);
});
