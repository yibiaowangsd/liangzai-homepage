import policy from '../../news/edition-policy.json' with { type: 'json' };

// Existing subscription scenarios keep their story set while using the v2
// publication boundary, including an explicit reason for newly empty desks.
export function manifestFor(items) {
  const coverage = Object.fromEntries(Object.keys(policy.categories).map(key => {
    const count = items.filter(item => item.category === key).length;
    return [key, { count, note: count < 3 ? '测试覆盖说明：此方向暂无足够可核实的新增资料。' : '' }];
  }));
  return { coverage: JSON.stringify(coverage), slugs: JSON.stringify(items.map(item => item.slug).sort()) };
}
export function seedManifest(db, date) {
  const { coverage, slugs } = manifestFor(db.prepare('SELECT slug, category FROM news').all());
  db.prepare('INSERT INTO news_editions (date, schema_version, coverage, slugs) VALUES (?, 2, ?, ?)').run(date, coverage, slugs);
}
