/** Shared names and routes for the header, exploration index and jump search. */
export const destinations = [
  {
    href: "/",
    name: "Yibiao 首页",
    en: "Yibiao Home",
    descriptionEn: "Cryptography engineering and experiments by Yibiao.",
    description: "Yibiao 的密码工程与实验，从这里出发。",
    keywords: "home 首页 量仔 liangzai",
  },
  {
    href: "/models",
    name: "模型鉴赏",
    en: "Model Gallery",
    descriptionEn: "Explore Liangzai and Nailong in three dimensions.",
    description: "旋转、缩放，近距离欣赏量仔与奶龙。",
    keywords: "models 模型 鉴赏 量仔 奶龙 旋转 三维",
  },
  {
    href: "/storybook",
    name: "星际漫游",
    en: "Space Journey",
    descriptionEn: "An eleven-page adventure about curiosity and companionship.",
    description: "量仔与奶龙，十一页关于并肩的冒险。",
    keywords: "story 故事 星际 奶龙 冒险 绘本",
  },
  {
    href: "/archive",
    name: "量仔小传",
    en: "Liangzai Profile",
    descriptionEn: "Meet the curious mascot behind this site.",
    description: "认识一位把好奇心带向未知的守护者。",
    keywords: "guardian 人物 档案 量仔 角色",
  },
  {
    href: "/pqc-arsenal",
    name: "密码图鉴",
    en: "Algorithm Guide",
    descriptionEn: "Understand post-quantum algorithms, principles and parameters.",
    description: "从数学直觉，走近后量子密码。",
    keywords: "pqc 算法 密码 ml-kem ml-dsa slh-dsa fn-dsa 原理",
  },
  {
    href: "/pqc-practice",
    name: "密码实验室",
    en: "Cryptography Lab",
    descriptionEn: "Run key encapsulation, signatures and verification locally.",
    description: "运行真实算法，亲手封装、签名与验证。",
    keywords: "wasm 实验 lab 密钥 签名 哈希 验证 sm2 测试",
  },
  {
    href: "/notes",
    name: "技术笔记",
    en: "Engineering Notes",
    descriptionEn: "Implementation notes with English abstracts.",
    description: "算法材料、参数验证与实现记录，附英文摘要。",
    keywords: "notes writing 笔记 写作 验证 记录",
  },
  {
    href: "/news",
    name: "前沿新闻",
    en: "Frontier News",
    descriptionEn: "Follow post-quantum cryptography, protocols and standards.",
    description: "跟进后量子密码、安全协议与标准动态。",
    keywords: "news 新闻 ai 前沿 技术 标准 资讯",
  },
  {
    href: "/about",
    name: "关于我",
    en: "About Yibiao",
    descriptionEn: "From Shandong University to cryptography engineering.",
    description: "从山东大学，到密码工程实践。",
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
