/** Shared names and routes for the header, exploration index and jump search. */
export const destinations = [
  {
    href: "/",
    name: "探索首页",
    description: "量仔的数字宇宙，从这里出发。",
    keywords: "home 首页 量仔 liangzai",
  },
  {
    href: "/models",
    name: "模型鉴赏",
    description: "旋转、缩放，近距离欣赏量仔与奶龙。",
    keywords: "models 模型 鉴赏 量仔 奶龙 旋转 三维",
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
    href: "/observatory",
    name: "创意观测站",
    description: "用形态与颜色创作，保存并分享你的作品。",
    keywords: "observatory 观测站 创作 画布 调色 保存 分享",
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
