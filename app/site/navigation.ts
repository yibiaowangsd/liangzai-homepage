export const navGroups = [
  {
    "name": "实验",
    "en": "Experiments",
    "links": [
      {
        "href": "/pqc-practice",
        "name": "密码实验室",
        "en": "Cryptography Lab"
      },
      {
        "href": "/lab/hybrid",
        "name": "混合 KEM 演示",
        "en": "Hybrid KEM Demo"
      },
      {
        "href": "/protocols",
        "name": "协议工程",
        "en": "Protocols"
      },
      {
        "href": "/projects",
        "name": "公开作品",
        "en": "Projects"
      },
      {
        "href": "/benchmarks",
        "name": "互通与性能",
        "en": "Benchmarks"
      },
      {
        "href": "/gm-pqc",
        "name": "国密 × PQC",
        "en": "GM × PQC"
      },
      {
        "href": "/tools",
        "name": "协议尺寸工具",
        "en": "Size Tools"
      },
      {
        "href": "/parameters",
        "name": "参数速查",
        "en": "Parameters"
      },
      {
        "href": "/pqc-practice/audit",
        "name": "接入记录",
        "en": "Implementation Index"
      }
    ]
  },
  {
    "name": "简报",
    "en": "Briefing",
    "links": [
      {
        "href": "/news",
        "name": "前沿新闻",
        "en": "Technical Briefing"
      },
      {
        "href": "/news?category=standards",
        "name": "标准动态",
        "en": "Standards"
      },
      {
        "href": "/weekly",
        "name": "工程周报",
        "en": "Engineering Digest"
      },
      {
        "href": "/rss.xml",
        "name": "RSS 订阅",
        "en": "RSS Feed"
      }
    ]
  },
  {
    "name": "笔记",
    "en": "Notes",
    "links": [
      {
        "href": "/notes",
        "name": "技术笔记",
        "en": "Engineering Notes"
      },
      {
        "href": "/pqc-arsenal",
        "name": "密码图鉴",
        "en": "Algorithm Guide"
      },
      {
        "href": "/migration",
        "name": "迁移指南",
        "en": "Migration"
      },
      {
        "href": "/notes/rss.xml",
        "name": "RSS 订阅",
        "en": "RSS Feed"
      }
    ]
  },
  {
    "name": "关于",
    "en": "About",
    "links": [
      {
        "href": "/about",
        "name": "关于我",
        "en": "About Yibiao"
      },
      {
        "href": "/contact",
        "name": "联系与订阅",
        "en": "Contact & RSS"
      },
      {
        "href": "/records",
        "name": "公开记录",
        "en": "Public Record"
      },
      {
        "href": "/changelog",
        "name": "更新日志",
        "en": "Changelog"
      },
      {
        "href": "/site-info",
        "name": "站点说明",
        "en": "Site Information"
      },
      {
        "href": "/lab/security",
        "name": "实验室安全与隐私",
        "en": "Lab Security & Privacy"
      },
      {
        "href": "/universe",
        "name": "工程之外",
        "en": "After Hours"
      }
    ]
  }
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
