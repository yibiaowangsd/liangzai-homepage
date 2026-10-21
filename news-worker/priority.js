export const PRIORITIES = { P1: '重大', P2: '重要', P3: '关注' };

// The existing tags column carries priority through every news API and resend
// snapshot, without changing the historical article schema.
export function storyPriority(item) {
  if (Object.hasOwn(PRIORITIES, item.priority)) return item.priority;
  let tags = item.tags || [];
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  return Object.keys(PRIORITIES).find(key => tags.includes(`${key}·${PRIORITIES[key]}`)) || null;
}

export function priorityLabel(item) {
  const priority = storyPriority(item);
  return priority ? `${priority}·${PRIORITIES[priority]}` : '';
}

export function byPriority(a, b) {
  return (storyPriority(a) || 'P2').localeCompare(storyPriority(b) || 'P2');
}

export function priorityTags(tags, priority) {
  let values = tags || [];
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch { values = values.split(','); }
  }
  return Object.hasOwn(PRIORITIES, priority)
    ? [`${priority}·${PRIORITIES[priority]}`, ...values.filter(tag => !/^P[123]·/.test(tag))].slice(0, 20)
    : values;
}
