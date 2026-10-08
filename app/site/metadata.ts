import type { Metadata } from "next";
export function pageMetadata(title: string, description: string, path: string, image = "default", en = false): Metadata {
  const url = "https://wangyibiao.com" + path;
  const cover = "https://wangyibiao.com/share/" + image + ".png";
  const zhPath = path.startsWith("/en/pqc/") ? path.replace("/en", "") : path === "/en/pqc" ? "/pqc-arsenal" : path === "/en/about" ? "/about" : path;
  const enPath = zhPath === "/about" ? "/en/about" : zhPath === "/pqc-arsenal" ? "/en/pqc" : zhPath.startsWith("/pqc/") ? "/en" + zhPath : undefined;
  return { title: `${title} · Yibiao`, description, alternates: { canonical: url, ...(enPath ? { languages: { "zh-CN": "https://wangyibiao.com" + zhPath, en: "https://wangyibiao.com" + enPath } } : {}) },
    openGraph: { title: `${title} · Yibiao`, description, url, siteName: "Yibiao", locale: en ? "en_US" : "zh_CN", type: "website", images: [{ url: cover, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title: `${title} · Yibiao`, description, images: [cover] } };
}
