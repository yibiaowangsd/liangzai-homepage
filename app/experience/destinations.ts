/** Shared names and routes for the header, exploration index and jump search. */
export const destinations = [
  {
    href: "/",
    name: "探索首页",
    description: "量仔的数字宇宙，从这里出发。",
    keywords: "home 首页 量仔 liangzai",
  },
  {
    href: "/observatory",
    name: "灵感观测站",
    description: "以数学为笔，创作并带走一片星空。",
    keywords: "art 灵感 观测 星空 创作 引力 共振 晶格",
  },
  {
    href: "/storybook",
    name: "星际漫游",
    description: "量仔与奶龙，十一页关于并肩的冒险。",
    keywords: "story 故事 星际 奶龙 冒险 绘本",
  },
  {
    href: "/archive",
    name: "量仔小传",
    description: "认识一位把好奇心带向未知的守护者。",
    keywords: "guardian 人物 档案 量仔 角色",
  },
  {
    href: "/pqc-arsenal",
    name: "密码图鉴",
    description: "从数学直觉，走近后量子密码。",
    keywords: "pqc 算法 密码 ml-kem ml-dsa slh-dsa fn-dsa 原理",
  },
  {
    href: "/pqc-practice",
    name: "密码实验室",
    description: "运行真实算法，亲手封装、签名与验证。",
    keywords: "wasm 实验 lab 密钥 签名 哈希 验证 sm2 测试",
  },
  {
    href: "/news",
    name: "前沿新闻",
    description: "跟进密码、安全与人工智能的新进展。",
    keywords: "news 新闻 ai 前沿 技术 标准 资讯",
  },
  {
    href: "/about",
    name: "关于我",
    description: "从山东大学，到量子安全工程。",
    keywords: "about yibiao wang 个人 经历 关于我 山东大学",
  },
];

export function searchDestinations(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return destinations.filter((item) =>
    terms.every((term) =>
      `${item.name} ${item.description} ${item.keywords}`
        .toLocaleLowerCase()
        .includes(term),
    ),
  );
}
