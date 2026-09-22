# 量仔 LIANGZAI · 小小量仔，大有可为

量仔的现代科技风主页，以深空黑、量子蓝光效、大字号排版和原始角色素材，连接故事、角色档案与 PQC 知识探索。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 科技风首页：角色首屏、探索入口、三种特质切换、动效控制 |
| `/storybook` | 量子星守护者互动动画书，保留翻页与旁白 |
| `/archive` | 原 Minimal Zine 风格量仔档案 |
| `/pqc-arsenal` | PQC 武器库与参数交互 |

首页使用独立 CSS Module，适配手机、平板和桌面；支持键盘导航、移动菜单、暂停动效与系统减少动态效果设置。所有角色图片复用仓库素材，不改变量仔形象。

## 开发

Node.js >=22.13；首次接手请阅读 [DEVELOPMENT.md](./DEVELOPMENT.md)。

```bash
npm install
npm run dev
npm run build
node --test tests/rendered-html.test.mjs
npm run lint
```

`main` 由既有 Cloudflare 流程部署至 [wangyibiao.com](https://wangyibiao.com)。`.openai/hosting.json` 保留原 Sites 项目配置，属于另一条托管链路。
