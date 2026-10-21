import { CORE_CATEGORIES, CATEGORY_LABELS } from './edition.js';
import { byPriority } from './priority.js';

export function weeklySections(report, selected = CORE_CATEGORIES) {
  const items = report.items.filter(item => selected.includes(item.category)).toSorted(byPriority);
  const rest = items.filter(item => !item.front_page);
  return [
    { label: '头版头条', items: items.filter(item => item.front_page) },
    ...selected.map(category => ({ label: `其余新闻 · ${CATEGORY_LABELS[category]}`, items: rest.filter(item => item.category === category) })).filter(section => section.items.length),
  ];
}
