import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "站点说明",
  "技术栈、公开内容来源、测量边界与维护方式。",
  "/site-info",
);
export default function Page() {
  return (
    <EngineeringPage
      title="站点说明"
      intro="一个围绕后量子算法、真实协议与工程判断的个人站点。内容和代码可从公开仓库核对。"
    >
      <Section title="技术栈">
        <p>
          页面采用 Next.js App Router、React 与 TypeScript，使用 Vinext / Vite
          构建并运行在 Cloudflare Workers。算法实验是独立静态工作台，运算使用
          Web Worker、WebAssembly 与 Web Crypto；新工具也在浏览器本地计算。
        </p>
        <a
          href="https://github.com/yibiaowangsd/liangzai-homepage"
          target="_blank"
          rel="noreferrer"
        >
          查看完整源码与开发文档 ↗
        </a>
      </Section>
      <Section title="内容来源">
        <p>
          协议内容以 RFC、NIST
          最终标准、公开实现和发布说明为依据。候选数据来自固定版本的公开参考实现目录；页面附来源、参数和接入状态。新闻是公开报道摘要与短评，工程笔记单独提供长文和
          RSS。
        </p>
        <p>
          性能数据来自本人自建回环测试环境，使用临时密钥与证书。公司工作仅概括为抗量子
          TLS/TLCP 协议改造、抗量子算法库；内部案例与数字不作为本站证据。
        </p>
      </Section>
      <Section title="更新与复现">
        <p>
          GitHub 项目元数据保留采集日期。候选统计、参数 CSV 与 WASM
          清单在构建时从仓库生成；性能报告由下载脚本主动重测，不在每次部署中修改测量结果。
        </p>
        <div className="engineering-actions">
          <a href="/changelog">更新日志</a>
          <a href="/benchmarks">复现测量</a>
          <a href="/contact">联系与订阅</a>
          <a href="/lab/security">安全与隐私</a>
        </div>
      </Section>
    </EngineeringPage>
  );
}
