import { EngineeringPage, Section } from "../engineering/EngineeringPage";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata(
  "更新日志",
  "协议、实验、测量与站点内容的持续维护记录。",
  "/changelog",
);
export default function Page() {
  return (
    <EngineeringPage
      title="更新日志"
      intro="记录能在代码、页面或复现数据中核对的变化。测试覆盖和未完成的接入都保留明确状态。"
    >
      <Section title="2026-10-08 · 协议工程内容扩展">
        <ul>
          <li>
            新增协议总览与 TLS、TLCP、SSH、IKEv2
            四条路径，统一方案、尺寸、抗降级和验证结构。
          </li>
          <li>
            新增公开作品页、TLS 三方案实测、SSH 三组
            KEX、自建互通矩阵和下载脚本。
          </li>
          <li>
            新增真实混合 KEM 演示、国密候选进度、迁移检查表与三篇工程长文。
          </li>
          <li>
            新增报文 / 证书工具、参数 CSV、联系与
            RSS、公开记录、站点来源和实验室隐私说明。
          </li>
        </ul>
        <p>
          未完成：自动邮件投递、TLCP + PQC 公开端到端测量、IKEv2
          多重交换隧道实测，以及跨厂商和弱网覆盖。
        </p>
      </Section>
      <Section title="2026-10-08 · 站点统一与整理">
        <p>
          首页聚焦后量子协议工程，补充英文资料入口、站点地图、RSS
          与共享导航；重新整理开发文档并删除已退出路由的冗余组件。
        </p>
        <a
          href="https://github.com/yibiaowangsd/liangzai-homepage/commits/main/"
          target="_blank"
          rel="noreferrer"
        >
          以 main 提交历史核对发布内容 ↗
        </a>
      </Section>
    </EngineeringPage>
  );
}
