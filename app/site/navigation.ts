export const navGroups = [
  { name: "实验", en: "Experiments", links: [{ href: "/pqc-practice", name: "密码实验室", en: "Cryptography Lab" }, { href: "/#selected", name: "工程实践", en: "Selected Work" }, { href: "/pqc-arsenal", name: "算法原理", en: "Algorithm Guide" }, { href: "/pqc-practice/audit.html", name: "接入记录", en: "Implementation Index" }] },
  { name: "简报", en: "Briefing", links: [{ href: "/news", name: "技术简报", en: "Technical Briefing" }, { href: "/news?category=standards", name: "标准动态", en: "Standards" }, { href: "/rss.xml", name: "RSS 订阅", en: "RSS Feed" }] },
  { name: "笔记", en: "Notes", links: [{ href: "/notes", name: "技术笔记", en: "Engineering Notes" }, { href: "/notes/ml-kem-materials", name: "密钥封装材料", en: "KEM Materials" }, { href: "/notes/signature-matrix", name: "签名参数验证", en: "Signature Parameters" }] },
  { name: "关于", en: "About", links: [{ href: "/about", name: "关于 Yibiao", en: "About Yibiao" }, { href: "/universe", name: "工程之外", en: "After Hours" }] },
] as const;
export const footerLinks = navGroups.map(group => ({ href: group.links[0].href, name: group.name, en: group.en }));
export function languageHref(path: string) {
  if (path.startsWith("/notes/")) return path + "#abstract";
  if (path === "/notes") return "/notes";
  if (path.startsWith("/en/about")) return "/about";
  if (path.startsWith("/en/pqc/")) return path.replace("/en", "");
  if (path.startsWith("/en/pqc")) return "/pqc-arsenal";
  if (path.startsWith("/en/lab")) return "/pqc-practice/index.html";
  if (path.startsWith("/about")) return "/en/about";
  if (path.startsWith("/pqc/")) return "/en" + path;
  if (path.startsWith("/pqc-practice")) return "/en/lab";
  return "/en/pqc";
}
export function localizedHref(href: string, en: boolean) {
  if (!en) return href;
  if (href === "/about") return "/en/about";
  if (href === "/pqc-practice") return "/en/lab";
  if (href === "/pqc-arsenal") return "/en/pqc";
  if (href.startsWith("/pqc/")) return "/en" + href;
  if (href.startsWith("/notes/")) return href + "#abstract";
  return href;
}
