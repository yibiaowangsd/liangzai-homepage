import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { TOPICS, topicsForStory, canonicalSource } from '../news/topics.js';

const root = new URL('../', import.meta.url);
const digest = value => createHash('sha256').update(value).digest('hex');

export function buildTopicIndex(editions, reports) {
  const published = editions.flatMap(edition => (edition.items || []).filter(story => story.status === 'published').map(story => ({ ...story, edition: edition.date })));
  const throughDate = published.map(story => story.edition).sort().at(-1) || '';
  const topics = TOPICS.map(definition => {
    const grouped = new Map();
    for (const story of published.filter(story => topicsForStory(story).some(topic => topic.slug === definition.slug)).sort((a, b) => a.edition.localeCompare(b.edition) || a.slug.localeCompare(b.slug))) {
      const source = canonicalSource(story.source_url);
      const key = source || story.slug;
      const previous = grouped.get(key);
      const revision = digest(JSON.stringify([story.title, story.summary, story.content]));
      const revisions = [...(previous?.revisions || [])];
      if (!revisions.some(item => item.version === revision)) revisions.push({ date: story.edition, slug: story.slug, title: story.title, version: revision });
      grouped.set(key, { id: digest(definition.slug + ':' + key).slice(0, 24), version: digest(revisions.map(item => item.version).join(':')), title: story.title,
        summary: story.summary || '', slug: story.slug, category: story.category, sourceName: story.source_name || '原始来源', sourceUrl: source,
        firstDate: previous?.firstDate || story.edition, date: story.edition, revisions, editionDates: [...new Set([...(previous?.editionDates || []), story.edition])] });
    }
    const events = [...grouped.values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    const { pattern: _pattern, ...topic } = definition;
    void _pattern;
    return { ...topic, events, reportSnapshot: { reviewed: reports.reviewed_utc, sourceUpdated: reports.source_updated_utc,
      findings: reports.findings.filter(finding => definition.candidates.includes(finding.candidateId)) } };
  });
  return { schemaVersion: 1, throughDate, topics };
}

export async function generateTopics() {
  const names = (await readdir(new URL('news/inbox/', root))).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  const editions = await Promise.all(names.map(name => readFile(new URL('news/inbox/' + name, root), 'utf8').then(JSON.parse)));
  const reports = JSON.parse(await readFile(new URL('public/pqc-practice/ngcc-reports-zh.json', root), 'utf8'));
  const index = buildTopicIndex(editions, reports);
  await writeFile(new URL('app/topics/topic-index.json', root), JSON.stringify(index, null, 2) + '\n');
  console.log(`Generated ${index.topics.length} technical dossiers through ${index.throughDate}.`);
  return index;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await generateTopics();
