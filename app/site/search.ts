import { destinations } from "../experience/destinations";
import news from "./news-search.json";
export const searchEntries = [
  ...destinations.map(item => ({...item, group: "page"})),
  ...[["ml-kem", "ML-KEM", "密钥封装 FIPS 203"], ["ml-dsa", "ML-DSA", "数字签名 FIPS 204"], ["slh-dsa", "SLH-DSA", "哈希签名 FIPS 205"], ["fn-dsa", "FN-DSA", "Falcon 格签名"]].map(([id,name,description]) => ({href:"/pqc/"+id, name, description, keywords: name+" "+description, group:"algorithm"})),
  ...news,
];
export function searchSite(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return [["page","页面"], ["algorithm","算法"], ["news","新闻"]].map(([group,label]) => ({group:label, items: searchEntries.filter(item => item.group === group && terms.every(term => `${item.name} ${item.description} ${item.keywords}`.toLowerCase().includes(term))).slice(0, group === "news" ? 12 : 30)}));
}
