import chinese from "../i18n/messages/zh-CN.json" with { type: "json" };

/** Shared names and routes for the header, exploration index and jump search. */
const routes = [
  {
    href: "/",
    keywords: "home 首页 量仔 liangzai 新闻 前沿 简报",
  },
  {
    href: "/news",
    keywords: "news 新闻 ai 前沿 技术 标准 资讯",
  },
  {
    href: "/tracking",
    keywords: "tracking 动态 跟踪 pqc 组件 政策 性能 标准资料",
  },
  {
    href: "/models",
    keywords: "models 模型 鉴赏 量仔 奶蛙 奶龙 旋转 三维",
  },
  {
    href: "/storybook",
    keywords: "story 故事 星际 奶蛙 奶龙 冒险 绘本 睡前",
  },
  {
    href: "/archive",
    keywords: "guardian 人物 档案 量仔 奶蛙 角色",
  },
  {
    href: "/pqc-arsenal",
    keywords: "pqc 算法 密码 ml-kem ml-dsa slh-dsa fn-dsa 原理",
  },
  {
    href: "/pqc-practice",
    keywords: "wasm 实验 lab 密钥 签名 哈希 验证 sm2 测试",
  },
  {
    href: "/research",
    keywords: "research 研究 深度 协议 实验 论文 过程 成果",
  },
  {
    href: "/topics",
    keywords: "topic 追踪 关注 档案 进展 ml-kem ml-dsa aigis tls uvw",
  },
  {
    href: "/wo",
    keywords: "wo 我 app myapp 生活 时间轴 记录 记忆 回顾",
  },
  {
    href: "/play",
    keywords: "play 游乐场 游戏 互动 宠物 画画 明信片",
  },
  {
    href: "/pet",
    keywords: "pet 团团 站宠 宠物 小动物 领养 投喂 捉星星",
  },
  {
    href: "/daily-play",
    keywords: "daily game 每日谜题 休闲 逻辑 解谜 游戏",
  },
  {
    href: "/pixel-postcard",
    keywords: "pixel 明信片 像素 画板 画画 绘画 PNG 创作",
  },
  {
    href: "/sidequests",
    keywords: "tools 小工具 sidequests 时间 声音 时区",
  },
  {
    href: "/sound-room",
    keywords: "sound 音量 白噪音 助眠 专注 番茄钟 环境音 计时",
  },
  {
    href: "/time-desk",
    keywords: "time UTC 时差 时区 会议 工作时间 夏令时",
  },
  {
    href: "/about",
    keywords: "about yibiao wang 个人 经历 关于我 山东大学",
  },
] as const;

type DestinationLabels = typeof chinese.chrome.destinations;

export const destinations = routes.map(route => ({
  ...route,
  ...chinese.chrome.destinations[route.href],
}));

export function searchDestinations(query: string, labels: DestinationLabels = chinese.chrome.destinations) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return destinations.flatMap(item => {
    const { name, description } = labels[item.href];
    const searchable = `${name} ${description} ${item.name} ${item.description} ${item.keywords}`.toLocaleLowerCase();
    return terms.every(term => searchable.includes(term)) ? [{ ...item, name, description }] : [];
  });
}
