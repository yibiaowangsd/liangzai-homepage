// Associations identify a subject, never infer a security verdict from keywords.
export const TOPICS = [
  { slug: 'ml-kem', name: 'ML-KEM', category: '密钥封装', description: '跟踪算法研究、实现验证与协议中的采用情况。', pattern: '\\bML[-‐‑–— ]?KEM\\b|X25519MLKEM|SecP256r1MLKEM', algorithm: 'ml-kem', candidates: [], sources: [{ name: 'FIPS 203', url: 'https://csrc.nist.gov/pubs/fips/203/final' }] },
  { slug: 'ml-dsa', name: 'ML-DSA', category: '数字签名', description: '从安全分析和测试方法，跟进签名实现与认证协议。', pattern: '\\bML[-‐‑–— ]?DSA\\b', algorithm: 'ml-dsa', candidates: [], sources: [{ name: 'FIPS 204', url: 'https://csrc.nist.gov/pubs/fips/204/final' }] },
  { slug: 'slh-dsa', name: 'SLH-DSA', category: '数字签名', description: '关注无状态哈希签名的参数、实现与验证证据。', pattern: '\\bSLH[-‐‑–— ]?DSA\\b', algorithm: 'slh-dsa', candidates: [], sources: [{ name: 'FIPS 205', url: 'https://csrc.nist.gov/pubs/fips/205/final' }] },
  { slug: 'aigis-plus', name: 'AIGIS+', category: '国内征集', description: '分别追踪 Aigis-Enc+ 与 Aigis-Sig+，保留候选、参数和提交版本的区别。', pattern: 'AIGIS(?:[-‐‑–— ]?(?:ENC|SIG))?\\s*\\+|kem-01(?:\\b|-)|sign-01(?:\\b|-)', algorithm: 'kem-01', candidates: ['kem-01', 'sign-01'], sources: [{ name: 'Aigis-Enc+ 报告', url: 'https://ngcc.dev/reports/kem-01.html' }, { name: 'Aigis-Sig+ 报告', url: 'https://ngcc.dev/reports/sign-01.html' }] },
  { slug: 'tls', name: 'TLS 抗量子迁移', category: '安全协议', description: '跟进混合密钥交换、证书、标准和真实部署中的变化。', pattern: '\\bTLS(?:v?1[. ]?[23])?\\b|X25519MLKEM|SecP256r1MLKEM', algorithm: '', candidates: [], sources: [{ name: 'IETF TLS 工作组', url: 'https://datatracker.ietf.org/wg/tls/documents/' }] },
  { slug: 'uvw-kem', name: 'UVW-KEM', category: '国内征集', description: '按具体参数和报告编号追踪研究结论，区分局部实验与完整攻击。', pattern: 'UVW[-‐‑–— _]?KEM|UVW Key Encapsulation|kem-38(?:\\b|-)', algorithm: 'kem-38', candidates: ['kem-38'], sources: [{ name: 'UVW-KEM 报告', url: 'https://ngcc.dev/reports/kem-38.html' }] },
];

export function topicsForStory(story) {
  // A passing mention in a long article is insufficient to join a dossier.
  const text = [story.title, story.summary, typeof story.tags === 'string' ? story.tags : JSON.stringify(story.tags)].filter(Boolean).join(' ');
  return TOPICS.filter(topic => new RegExp(topic.pattern, 'iu').test(text) && (topic.slug !== 'tls' || /ML[-‐‑–— ]?KEM|PQC|post.quantum|抗量子|后量子|量子安全|混合密钥|量子抗性/i.test(text)));
}

export function canonicalSource(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    // Anchors can identify distinct findings in a single report. Preserve them.
    return url.href;
  } catch { return ''; }
}

/** @template {{id: string, version: string}} T
 * @param {T[]} events
 * @param {Record<string, string>} seen
 * @returns {T[]}
 */
export function unreadEvents(events, seen = {}) {
  return events.filter(event => seen[event.id] !== event.version);
}
