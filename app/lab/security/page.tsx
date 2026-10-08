import { EngineeringPage, Section } from "../../engineering/EngineeringPage";
import { pageMetadata } from "../../site/metadata";
export const metadata = pageMetadata(
  "实验室安全与隐私",
  "浏览器本地计算、WASM 来源、完整性清单与安全联系说明。",
  "/lab/security",
);
export default function Page() {
  return (
    <EngineeringPage
      title="实验室安全与隐私"
      intro="说明密钥和消息在哪计算、加载哪些资源，以及如何核对 WASM 来源。算法实验用于教学和验证，请始终使用临时测试材料。"
    >
      <Section title="计算与网络边界">
        <p>
          本站密码实验的密钥生成、封装、解封、签名、验签、密钥交换和哈希在浏览器的
          Web Worker / WASM / Web Crypto
          中执行；算法输入、私钥、共享秘密和签名消息不提交到服务端。
        </p>
        <p>
          首次打开会请求网页、JavaScript、WASM、参数目录等静态资源。服务器或 CDN
          仍可处理普通访问日志；新闻页使用新闻 API，GitHub
          和来源链接访问外部站点。本地计算不等于整个网站没有网络请求。
        </p>
        <p>
          混合 KEM
          演示只向页面传回公开材料指纹和一致性结果。现有主实验室支持显示、复制或导入测试材料，因此剪贴板、截图、浏览器扩展和调试工具也可能接触它们。
        </p>
      </Section>
      <Section title="存储与清理">
        <p>
          实验不将算法材料写入 localStorage
          或邮件。迁移检查表只保存勾选项，主题设置保存界面偏好；下载和复制均由用户主动触发。重置混合实验会终止
          Worker，使用过的可访问秘密字节会尽力覆盖。
        </p>
        <p>
          JavaScript 垃圾回收、Web Crypto 的 CryptoKey
          内部存储与浏览器进程副本无法保证被完全擦除。关闭或重置不能构成安全销毁证明。共享设备上尤其应只使用一次性测试密钥。
        </p>
      </Section>
      <Section title="WASM 构建来源">
        <p>
          NIST 算法模块来自 PQMagic
          的仓库快照，固定提交与许可证副本见下方；国内候选目录固定于
          ngcc-harness 的 <code>c5261784ef27e7363b1bbace3d687932fda35ccd</code>
          ，模块映射与接入原因在逐参数记录中公开。
        </p>
        <p>
          仓库的现有候选重建流程使用 Emscripten
          6.0.10；普通页面构建使用已收录模块，不重新编译全部候选。适配与修补历史见源码仓库
          docs/pqc-practice.md、pqc-rebuild-2026-09-26.md 和
          pqc-recovery-2026-09-27.md。
        </p>
        <div className="engineering-actions">
          <a href="/pqc-practice/PQMagic-UPSTREAM_COMMIT.txt">
            PQMagic 固定提交
          </a>
          <a href="/pqc-practice/PQMagic-LICENSE.txt">许可证副本</a>
          <a href="/data/wasm-manifest.json" download>
            JS / WASM 字节与 SHA-256 清单
          </a>
          <a href="/pqc-practice/audit.html">候选接入与安全报告</a>
        </div>
        <p>
          清单核对仓库资源的完整性，不是签名构建证明、FIPS
          实现认证或对候选安全性的背书。算法标准、测试通过和实现认证也须分别理解。
        </p>
      </Section>
      <Section title="报告安全问题">
        <p>
          <a href="mailto:yibiao_wang@foxmail.com?subject=Security%20report">
            yibiao_wang@foxmail.com
          </a>
          。请描述受影响路由、版本、复现步骤与潜在影响；不要附上真实私钥或公司资料。
        </p>
        <a href="/.well-known/security.txt">读取标准安全联系文件 →</a>
      </Section>
    </EngineeringPage>
  );
}
