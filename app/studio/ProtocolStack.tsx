export default function ProtocolStack() {
  return <figure className="protocol-stack" aria-labelledby="protocol-caption">
    <div className="protocol-layer"><div><small>01 / APPLICATION</small><h3>应用与连接</h3><p>业务数据 · 会话身份 · 部署环境</p></div><p className="protocol-annotation"><strong>互通与性能</strong><span>从连接成功率、报文尺寸到端到端耗时，验证真实约束。</span></p></div>
    <div className="protocol-layer"><div><small>02 / PROTOCOL</small><h3><code>TLS / TLCP · SSH · IKE</code></h3><p>协商 · 认证 · 密钥派生</p></div><p className="protocol-annotation"><strong>密码敏捷</strong><span>把算法选择、版本与回退策略放进可演进的协议边界。</span></p></div>
    <div className="protocol-layer"><div><small>03 / PRIMITIVES</small><h3><code>KEM + Signature</code></h3><p><code>ML-KEM</code> 密钥封装 · <code>ML-DSA / SLH-DSA</code> 签名</p></div><p className="protocol-annotation"><strong>混合密钥协商</strong><span>经典共享秘密与 KEM 共享秘密，经协议规定的组合器进入密钥派生。</span></p></div>
    <figcaption id="protocol-caption">工程关注点示意。首页实验验证最底层的 KEM 往返；协议互通与性能需要独立测试。</figcaption>
  </figure>;
}
