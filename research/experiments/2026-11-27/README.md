# OpenSSL 3.5.9 混合 TLS 与 FIPS 服务指示：复现实验

仅限隔离实验，用临时密钥，不是合规部署教程。实测 Debian 13 x86-64。源码：[openssl-3.5.9](https://github.com/openssl/openssl/releases/tag/openssl-3.5.9)，官方源码包 SHA-256：

```
603f5602e2eef00d77fbd429d34dcd5822bb301757a1bc9cdb24c670f1eb859a
```

把此目录、源码目录 `openssl-3.5.9` 布置成下列结构（源码目录和实验脚本同级）。需 C 编译器、Perl、make、Python 3，允许本地回环。实验不连接外部 TLS 服务。

```sh
cd openssl-3.5.9
./Configure enable-fips
make -j4 build_sw
cd ..
root="$PWD"
build="$root/openssl-3.5.9"
export LD_LIBRARY_PATH="$build"
export OPENSSL_MODULES="$build/providers"
export OPENSSL_CONF=/dev/null
cli="$build/apps/openssl"
"$cli" version
"$cli" fipsinstall -pedantic -module "$OPENSSL_MODULES/fips.so" -out "$root/fipsmodule.cnf"
"$cli" fipsinstall -module "$OPENSSL_MODULES/fips.so" -in "$root/fipsmodule.cnf" -verify
cat > lab-fips.cnf <<CONFIG
openssl_conf = initialize
.include $root/fipsmodule.cnf
[initialize]
providers = provider_sect
alg_section = algorithm_sect
[provider_sect]
base = base_sect
fips = fips_sect
[base_sect]
activate = 1
[algorithm_sect]
default_properties = fips=yes
CONFIG
cc -Wall -Wextra -Werror -I"$build/include" -L"$build" -o kem-service kem-service.c -lcrypto
OPENSSL_CONF=/dev/null ./kem-service default
OPENSSL_CONF="$root/lab-fips.cnf" ./kem-service fips
python3 tls-matrix.py
```

日志是一次成功复跑的结果，不打印共享秘密或私钥。默认路径的 `value=-99` 是初始化哨兵（本次查询没有返回指示值），不是模块的“未批准”返回码。TLS 测试按实际握手摘要核对协商组；未抓包、未做跨库测试。C 程序单独调用 EVP 服务，不是对该 TLS 连接内部调用的追踪。试验中主机证书是一次性、直接受信任的 localhost ECDSA 证书，不是一般公有 PKI。
