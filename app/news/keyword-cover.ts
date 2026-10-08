export type CoverStory = { cover_image: string | null; category: string; title?: string; tags?: string | null };
const labels:Record<string,string>={pqc:"PQC",protocol:"PROTOCOL",standards:"STANDARDS",security:"SECURITY",ai:"AI",industry:"TECH"};
export function keywordCover(item:CoverStory){const category=Object.hasOwn(labels,item.category)?item.category:"pqc";return {image:"/news-covers/"+(category==="industry"?"ai":category)+".svg",keyword:labels[category]};}
export function sourceCover(_item:CoverStory):null {void _item;return null;}
export function coverFor(item:CoverStory){return keywordCover(item).image;}
