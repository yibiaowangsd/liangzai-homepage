// Chinese summaries of the reports for browser-enabled candidates.
// Originals: https://ngcc.dev/reports/kem-01.html, /sign-01.html and /kem-39.html
export const NGCC_REPORTS = Object.freeze({
  'kem-01': [
    { id: 'kem-01-1', severity: '严重', status: '已确认',
      zh: '提交实现的隐式拒绝未生效：篡改密文后常会得到原共享密钥，因此其 IND-CCA 安全性不成立。' },
    { id: 'kem-01-2', severity: '高', status: '已确认',
      zh: '密文拒绝路径从私钥缓冲区起点之前读取回退秘密，属于越界读取；仅修复第一处错误仍不足以修复拒绝流程。' },
  ],
  'sign-01': [
    { id: 'sign-01-1', severity: '高', status: '已确认',
      zh: '有效签名中未使用的提示位可以改变而不影响验签，形成另一份同消息有效签名，违背强不可伪造性。' },
    { id: 'sign-01-2', severity: '严重', status: '已确认',
      zh: '畸形提示计数未经充分检查，可在验签时越界写入栈内数组，并可能由未认证输入触发崩溃。' },
    { id: 'sign-01-3', severity: '低', status: '已确认',
      zh: '提交的签名 API 忽略调用方声明的密钥缓冲区长度；传入短密钥时可能越界读取。' },
    { id: 'sign-01-4', severity: '中', status: '已确认',
      zh: '正常签名时，掩码向量末尾之后额外写入一个多项式，导致栈内越界写入。' },
  ],
  'kem-39': [
    { id: 'kem-39-1', severity: '中', status: '推定；提交团队称已修复，本站仍使用归档提交源码',
      zh: '归档参考实现重复使用伪随机函数的计数器，导致逆 q 提升与临时秘密共享同一输出片段，违背所提交证明的独立性前提；尚无实际区分器或密钥恢复攻击。' },
    { id: 'kem-39-2', severity: '中', status: '已确认；影响 WeaverKEM-256',
      zh: '归档参考实现的 256 参数分支未调用高层 BCH 纠错解码器；可纠正的高位错误会改变解封装结果。实际诚实通信失败率尚未测定。' },
  ],
});
