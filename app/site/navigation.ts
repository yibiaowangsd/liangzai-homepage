export const navGroups = [
  { name: "工程", en: "Engineering", links: [{ href: "/#selected", name: "工程项目", en: "Projects" }, { href: "/pqc-practice", name: "密码实验室", en: "Cryptography Lab" }, { href: "/pqc-practice/audit.html", name: "接入记录", en: "Implementation Index" }] },
  { name: "学习", en: "Learn", links: [{ href: "/pqc-arsenal", name: "密码图鉴", en: "Algorithm Guide" }, { href: "/pqc/ml-kem", name: "ML-KEM", en: "ML-KEM" }, { href: "/pqc/ml-dsa", name: "ML-DSA", en: "ML-DSA" }, { href: "/pqc/slh-dsa", name: "SLH-DSA", en: "SLH-DSA" }, { href: "/pqc/fn-dsa", name: "FN-DSA", en: "FN-DSA" }] },
  { name: "前沿", en: "Frontier", links: [{ href: "/news", name: "前沿新闻", en: "Frontier News" }, { href: "/news?category=standards", name: "标准动态", en: "Standards" }, { href: "/rss.xml", name: "RSS 订阅", en: "RSS Feed" }] },
  { name: "关于", en: "About", links: [{ href: "/about", name: "关于我", en: "About Yibiao" }, { href: "/universe", name: "量仔宇宙", en: "Liangzai Universe" }] },
] as const;
export function languageHref(path: string) {
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
  return href;
}
