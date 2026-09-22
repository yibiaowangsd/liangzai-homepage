# 量仔 LIANGZAI · 好奇无界，未来可期

以量仔为主角的量子探索网站。首页采用深空黑、银白大字、冷色粒子场与错落 Bento Grid，将互动故事、密码学知识和角色档案串联起来。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 粒子场首屏、内容 Bento、数字展示、密码学实验室、故事案例与品牌介绍 |
| `/storybook` | 11 页量子星守护者互动动画书，保留翻页与旁白 |
| `/archive` | 原 Minimal Zine 风格量仔档案 |
| `/pqc-arsenal` | PQC 武器库、算法流程与参数交互 |

首页使用 React、CSS Modules、Framer Motion 和 Lucide。Canvas 量子场支持两种形态、鼠标响应、离屏/后台停止；所有动效提供暂停与系统减少动态效果适配。密钥封装和数字签名演示是概念可视化，不执行真实密码运算。所有角色和故事图片复用仓库中的素材。

## 开发

Node.js >=22.13；接手前请阅读 [DEVELOPMENT.md](./DEVELOPMENT.md)。

```bash
npm install
npm run dev
npm run build
node --test tests/rendered-html.test.mjs
npm run lint
```

`main` 由既有 Cloudflare 流程部署至 [wangyibiao.com](https://wangyibiao.com)。`.openai/hosting.json` 保留原 Sites 项目配置，属于另一条托管链路。
