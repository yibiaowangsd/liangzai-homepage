/** Shared names and routes for the header, exploration index and jump search. */
export const destinations = [
  {
    href: "/",
    name: "探索首页",
    description: "从前沿新闻出发，跟进技术变化与实践。",
    keywords: "home 首页 量仔 liangzai 新闻 前沿 简报",
  },
  {
    href: "/news",
    name: "前沿新闻",
    description: "跟进密码、安全与人工智能的新进展。",
    keywords: "news 新闻 ai 前沿 技术 标准 资讯",
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
    href: "/topics",
    name: "技术档案",
    description: "按算法、协议与项目持续追踪进展，回查原始证据。",
    keywords: "topic 追踪 关注 档案 进展 ml-kem ml-dsa aigis tls uvw",
  },
  {
    href: "/pqc-practice/interop.html",
    name: "互通复验",
    description: "导入原生测试包，批量核对验签与解封装结果。",
    keywords: "interop 互通 批量 测试包 验签 解封装 原生 导出 复验",
  },
  {
    href: "/wo",
    name: "我 · 网页回顾",
    description: "在本机读取生活记录，回看时间轴、多日变化与已有记忆。",
    keywords: "wo 我 app myapp 生活 时间轴 记录 记忆 回顾",
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
