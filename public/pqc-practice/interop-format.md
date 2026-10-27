# PQC 互通测试包 v1

浏览器入口：`/pqc-practice/interop.html`。只使用专用测试材料，不导入真实业务私钥。

```json
{
  "format": "liangzai-pqc-testpack",
  "schemaVersion": 1,
  "producer": "实现名称与版本（可选）",
  "cases": [{
    "id": "native-mlkem768-case-1",
    "suite": {"library":"nist","family":"mlkem","variant":"768","hash":"shake"},
    "operation": "decapsulate",
    "inputs": {
      "privateKey": {"encoding":"hex","value":"替换为完整原始私钥字节"},
      "ciphertext": {"encoding":"hex","value":"替换为完整原始密文字节"}
    },
    "expected": {"sharedSecret":{"encoding":"hex","value":"替换为完整预期共享密钥字节"},"matches":true}
  }]
}
```

上述是格式说明，含中文占位，不能直接运行。点击页面的“生成示例测试包”获取完整可运行字节及正向、篡改用例。示例使用同源WASM，不是独立实现互通证据。

- `library: nist`：`mlkem` 的 `512/768/1024`、`mldsa` 的 `44/65/87` 固定 `hash: shake`；`slhdsa` 使用 `128f/128s/192f/192s/256f/256s` 与 `sha2/shake`。
- `library: ngcc`：`family` 使用候选编号（如 `kem-01`、`sign-01`），`variant` 是从0开始的参数索引字符串，与实验室目录一致；仅支持已接入的KEM和签名。它们与NIST组中类似名称的实现不能混同。
- 字节使用 `{encoding,value}`，编码为 `hex`、标准带填充 `base64` 或 `utf8`。密钥为原始编码，不接受PEM/DER；消息最多64KiB。
- `operation: verify` 的 `inputs` 为 `publicKey/message/signature`，`expected` 为 `{valid:true}` 或 `{valid:false}`。
- `operation: decapsulate` 的 `expected.sharedSecret` 必须给出。正向用 `matches:true`；篡改测试用原始共享密钥配合 `matches:false`。执行错误始终单列，不等价于拒绝无效签名或隐式拒绝测试通过。
- 一个包包含1至100个唯一ID的用例；可以跨套件，逐个执行。编辑输入、清空或中止后，旧结果不能作为当前完整报告导出。

## 原生端复验

页面可下载相同测试包交给原生端。仓库同时提供无需第三方Python包的原生运行器：

```bash
python3 testpack-native.py liangzai-pqc-testpack.json \
  --library /absolute/path/libtest_adapter.so \
  --suite ngcc/kem-01/0/shake \
  --output native-result.json
```

适配库需导出 [testpack-abi.h](./testpack-abi.h) 的 `lab_*` C ABI；Windows可使用对应DLL。现有NGCC桥接源码在 `scripts/ngcc-wasm-adapter.c` 和 `scripts/ngcc-wasm-bridge.c`，原生构建需使用对应提交版本及编译宏。运行器不直接猜测任意 `libpqc`、PQMagic或铜锁库的ABI，接入其他库时应提供薄适配层。`--suite` 是调用者对适配库的声明，报告同时记录实际动态库SHA-256。一个动态库对应一套参数；混合测试包中的其他套件会报错，应按套件分别复验。

下载：[原生Python运行器](./testpack-native.py) · [C ABI头文件](./testpack-abi.h)

## 结果与来源

浏览器结果格式为 `liangzai-pqc-result`，包含逐项预期与实际布尔结果、错误、单次耗时、用例指纹，以及本次WASM与胶水文件SHA-256、上游版本、运行器及Worker代码指纹。原生运行器记录动态库及运行器指纹。

报告不包含原始输入、私钥或共享密钥原值；共享密钥只显示SHA-256指纹。测试包本身包含测试输入。报告只能说明所列用例在该实现的实际行为，不能代替完整KAT、CPA/CCA证明、恒定时间分析、FIPS实现认证或原生性能基准。判断独立互通需核对材料生产端与复验端是否为不同实现。
