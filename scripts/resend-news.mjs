import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { editionHash } from '../news-worker/resend-campaign.js';

// This workflow never accepts recipient addresses, webhooks, an API destination
// or an arbitrary campaign ID. The production roster is the audience authority.
const requestFile = process.argv[2];
assert.match(requestFile || '', /^news\/resend\/\d{4}-\d{2}-\d{2}\.json$/);
const request = JSON.parse(await readFile(requestFile, 'utf8'));
assert.equal(requestFile, `news/resend/${request.date}.json`);
assert.equal(request.scope, 'all-effective-subscribers-once');
assert.equal(request.campaign_id, `resend-${request.date}`);
assert.equal(request.edition_file, `news/inbox/${request.date}.json`);
assert.match(request.edition_sha256 || '', /^[a-f0-9]{64}$/);
assert.ok(typeof request.reason === 'string' && request.reason.trim().length >= 10);
const rawEdition = await readFile(request.edition_file, 'utf8');
assert.equal(createHash('sha256').update(rawEdition).digest('hex'), request.edition_sha256, 'The reviewed edition file has changed.');
const edition = JSON.parse(rawEdition);
assert.equal(edition.date, request.date);
assert.equal(edition.schema_version, 3);
const expectedHash = await editionHash(request.date, edition.items);
const expectedSlugs = edition.items.map(item => item.slug).sort();
const expectedCounts = Object.fromEntries(Object.entries(edition.coverage).map(([category, entry]) => [category, entry.count]));

if (process.argv.includes('--check')) {
  console.log(JSON.stringify({ checked: true, campaign_id: request.campaign_id, date: request.date,
    article_count: expectedSlugs.length, category_counts: expectedCounts, edition_hash: expectedHash }));
} else {
  assert.ok(process.env.NEWS_ADMIN_TOKEN, 'NEWS_ADMIN_TOKEN is not configured.');
  const base = 'https://api.wangyibiao.com/api/admin/news/resend';
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function call(path, body, allowMissing = false) {
    const response = await fetch(`${base}/${path}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(55000),
      headers: { Authorization: `Bearer ${process.env.NEWS_ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Resend API returned HTTP ${response.status}; existing receipts remain authoritative.`); }
    const result = await response.json();
    assert.equal(result.ok, true, 'The resend API did not confirm the operation.');
    return result;
  }
  function report(result) {
    // Deliberately select summary fields; never dump subscriber or provider data.
    console.log(JSON.stringify({ campaign_id: result.campaign_id, date: result.date,
      state: result.state, completed: result.completed, counts: result.counts,
      errors: result.errors, next_attempt_at: result.next_attempt_at }));
  }
  let status = await call(`status?campaign_id=${encodeURIComponent(request.campaign_id)}`, undefined, true);
  if (!status) {
    assert.equal(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()), request.date,
      'A new resend campaign can only be created for the current Beijing date.');
    const preview = await call(`preview?date=${encodeURIComponent(request.date)}`);
    assert.equal(preview.edition_hash, expectedHash, 'The live edition differs from the reviewed file.');
    assert.deepEqual(preview.slugs, expectedSlugs, 'The live edition has different stories.');
    assert.equal(preview.article_count, edition.items.length);
    for (const [category, count] of Object.entries(expectedCounts)) assert.equal(preview.category_counts[category] || 0, count);
    for (const channel of ['email', 'robot']) assert.ok(!preview.eligible[channel] || preview.configured[channel], `${channel} delivery is not configured.`);
    console.log(JSON.stringify({ preview: true, date: request.date, article_count: preview.article_count,
      category_counts: expectedCounts, eligible: preview.eligible, planned_messages: preview.planned_messages,
      edition_hash: preview.edition_hash, audience_hash: preview.audience_hash }));
    status = await call('start', { date: request.date, edition_hash: expectedHash, audience_hash: preview.audience_hash, slugs: expectedSlugs });
  }
  assert.equal(status.edition_hash, expectedHash, 'An existing batch belongs to a different reviewed edition.');
  report(status);
  const deadline = Date.now() + 20 * 60000;
  let previous = JSON.stringify(status.counts), transientFailures = 0;
  while (!status.completed && Date.now() < deadline) {
    await delay(Math.min(15000, Math.max(800, (status.next_attempt_at || 0) - Date.now())));
    try {
      status = await call('step', { campaign_id: request.campaign_id, limit: 2 });
      transientFailures = 0;
    } catch {
      // HTTP interruption never creates another campaign or clears delivery
      // records. Leases and fixed provider keys decide whether a step can resume.
      transientFailures++;
      console.log(JSON.stringify({ campaign_id: request.campaign_id, waiting_for_receipts: true, transient_failures: transientFailures }));
      await delay(5000);
      status = await call(`status?campaign_id=${encodeURIComponent(request.campaign_id)}`);
      if (transientFailures >= 3) throw new Error('Repeated service failures; resume this exact request after checking its saved status.');
    }
    const current = JSON.stringify(status.counts);
    if (current !== previous || status.completed) { report(status); previous = current; }
  }
  report(status);
  assert.ok(status.completed, 'The batch is still pending. Resume the same dated request; do not create a new batch.');
  assert.equal(status.state, 'completed', 'Some recipients were cancelled, rejected, or have unconfirmed delivery; inspect the summary before any further action.');
}
