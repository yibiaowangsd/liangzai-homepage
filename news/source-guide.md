# 每日前沿信息源与检索指南

修订日期：2026-10-19。与 [选编规则](editorial-policy.md) 和 [日报任务提示词](daily-automation-prompt.md) 配合使用。栏目、JSON和发布约束以 `edition-policy.json`、`validate-edition.py` 和 README 为准。

本清单是开放的优先检索入口，不是白名单，也不是已经接入的RSS订阅或采集服务。任务运行时使用实际可用的搜索、公开网页、公开API和文档读取能力发现并核验；不要求每次遍历所有网站。列出的旧报告或会议用于建源和定位后续变化，不能因本次发现而当作新新闻。网站可访问性随时间和运行环境变化；打不开不能记成“无更新”。

## 1. 来源角色与证据边界

| 角色 | 典型材料 | 可支持的事实及边界 |
| --- | --- | --- |
| 原始研究与复现 | 原论文、作者报告、数据、实验附件、复现仓库 | 说明作者证明/测得什么及其假设。预印本、正式录用、实验复现是不同状态；代码链接本身不证明结果复现。 |
| 标准与主管机构 | 正文、状态记录、勘误、公开决议、征求意见、监管文件 | 说明编号、版本、制定/实施状态和适用范围。邮件个人观点、行业白皮书不自动是正式标准。 |
| 产品与维护者 | 发布说明、模型卡、架构文档、PSIRT、代码变更 | 说明实际交付能力、修复和已公开限制。未发行提交不等于用户已可用；自测不等于独立评测。 |
| 用户与行业组织 | 运营商/银行/电力案例、采购与验收文件、互通/试点报告、事故复盘 | 补足采用约束、真实效果与失败经验。参与试验、采购计划、部署完成分别表述。 |
| 原创调查与测量 | 原创采访、文件调查、现场报道、独立基准/安全研究 | 可作为其直接揭示事实的主来源；转述的技术规格/安全结论仍追原始技术材料。 |
| 发现渠道 | 新闻聚合、数据库索引、RSS/Atom、会议日程、邮件归档、社区/社交帖子 | 用于发现候选并追原文。研究者本人原始披露按实证判断；转载数量、点赞、搜索摘要不等于验证。 |

`source_url` 使用实际阅读、直接支持核心事件的具体HTTPS页面；正文给其他关键证据链接。GitHub/arXiv是托管平台，统计来源集中性应细分机构、项目和作者；同集团的多个域名也不算独立验证。标准正文无法取得时，只能报道可核实的编号/状态，不能推断未读条款。

## 2. 每次运行怎样查

1. 先回看最近7期主题、事件类型、机构/地区和实际读取限制。建立候选清单，记录主体、事件、原始日期、实质更新日期、版本/文档号/CVE/finding ID、直接证据、与前次差异、阅读状态及新闻价值。
2. 对七栏分别做中文和英文主题检索，先不限定厂商，再补查有关机构；使用新旧名称、全称/缩写、版本及事件动作。扩展地区按相关性轮换欧洲、英国、北美、日本、韩国、新加坡、澳大利亚等，不把海外限定为美国。
3. 每栏至少检查两种相关来源角色；算法检查学术、企业研发、政府/评估和实现，迁移检查供应方与用户方，安全检查应急/PSIRT与实际事件，AI检查模型/产品、研究/评测与应用/产业。来源失败如实说明，不算完成阅读；不是必须发表两种类型的配额。
4. 每次按来源角色选择各栏代表性索引/公告/发布入口完成核心扫描，NGCC按第6节检查必查入口；具体机构及全文依据候选深入。扩展名单按更新与近7期缺口轮换，同一来源/时间窗的有效检查跨栏复用，不因条数或集中性阈值机械重复查询，不先挑容易读取的commit填栏。
5. 主要来源类型尚未扫描时，不能因为已有3条而停止。完成候选池后先按实质性、影响、证据和新增程度排序，再检查集中性；单栏样本至少3条且某机构/项目过半，或近7期单类型持续占主导时补检尚未查过的缺口，不反复执行同样查询。单个commit须由原始报告/issue/测试/实测明确实际影响或显著能力，不能仅凭diff推演安全影响；日常加固/测试/兼容维护原则并入相关版本，重大问题无需等CVE或发行。
6. `coverage.note` 对每栏简记实际查过的代表性入口与类型、时间窗、排除/不可读原因及重要待跟进项，即使达到3条也记录，最多600字。不可读、未搜索到、读完无新增、重复、低价值分开。不得伪称“已查国内外全部来源”，不得把这些内部记录放到网页或订阅消息。

可按事件自适应组合的发现词：

| 栏目 | 查询维度示例 |
| --- | --- |
| 算法 | 后量子/抗量子/PQC/quantum-safe + 算法族/KEM/signature + construction/proof/cryptanalysis/parameter/benchmark/side-channel；中文学报和作者公开全文另查 |
| 迁移 | 抗量子迁移/密码敏捷/密码资产/CBOM + 运营商/银行/电力/PKI/HSM + 方案/试点/验收/兼容/回退；migration/deployment/roadmap/interoperability |
| 协议 | TLS/TLCP/SSH/IKE/IPsec及有关PKI应用 + hybrid/PQC/authentication/KDF/fragmentation + release/test/incident/security analysis |
| 标准 | 算法/协议/标准号 + 立项/征求意见/发布/实施/勘误/撤回；adoption/last call/approval/errata/work item |
| 安全 | 产品/平台/行业 + 漏洞/在野利用/攻击/泄露/事故复盘/修补；exploited/advisory/incident/RCA/supply chain |
| AI | 模型/Agent/工具/算力 + 发布/可用/权重/许可证/价格/实测/事故/监管；model card/system card/evaluation/API/deprecation |
| NGCC | 候选编号/名称/finding ID + 官方评议/新规格/分析/回应/修复/复测/撤回；原始版本与修改版交叉查 |

## 3. PQC、协议、标准与行业迁移入口

| 来源组 | 代表性入口 | 获取什么、如何核验 |
| --- | --- | --- |
| NIST算法研究与澄清 | [PQC项目](https://csrc.nist.gov/projects/post-quantum-cryptography)、[PQC邮件列表入口](https://csrc.nist.gov/projects/post-quantum-cryptography/email-list)、[研讨会与时间线](https://csrc.nist.gov/projects/post-quantum-cryptography/workshops-and-timeline) | 除正式标准，还查征集、评估、演示、论坛分析、修订和勘误。论坛作者发言不自动代表NIST。 |
| IETF及RFC/IANA | [Datatracker](https://datatracker.ietf.org/)、[TLS工作组](https://datatracker.ietf.org/group/tls/documents/)、[邮件归档](https://mailarchive.ietf.org/)、[RFC Editor](https://www.rfc-editor.org/)、[IANA协议注册表](https://www.iana.org/protocols) | 查TLS、SSHM、IPsecME及相关CFRG、LAMPS、PQUIP的文档/会议/审查/勘误。通过组详情确认真实邮件列表名，不能由工作组缩写猜路径。每次核实当前状态。 |
| 算法论文与会议 | [IACR ePrint](https://eprint.iacr.org/)、[arXiv](https://arxiv.org/)、[IACR](https://www.iacr.org/)、[CHES 2026](https://ches.iacr.org/2026/)、[CHES实验附件](https://ches.iacr.org/2026/artifacts.php) | 兼顾CRYPTO/EUROCRYPT/ASIACRYPT、TCHES/CHES、ToSC/FSE、PQCrypto；从当年主办方进入论文/数据/作者材料。Poster、Rump Session、录用论文、正式发表区分；普通参会不重复报道旧论文。 |
| 系统与安全研究 | [USENIX Security](https://www.usenix.org/conferences/byname/108)、[NDSS](https://www.ndss-symposium.org/)、[ACM CCS 2026](https://www.sigsac.org/ccs/CCS2026/) | 协议分析、大规模测量、部署/API障碍、攻击与数据集。进入全文及Artifact；徽章不等于密码学结论全面证明。 |
| ETSI | [CYBER WG-QSC职责](https://portal.etsi.org/TB-SiteMap/CYBER/CYBER-QSC-ToR)、[工作组Portal](https://portal.etsi.org/tb.aspx?TBID=856&subTB=856)、[ETSI/IQC 2026](https://www.etsi.org/events/2592-etsi-iqc-qsc-conference-2026/) | 查Work Programme、公开草案/正式文档和会议材料。常见旧quantum-safe-cryptography地址已出现转向宽泛技术页的情况，不依赖旧首页判定更新。会员限定资料不猜测。 |
| 欧洲迁移与评估 | [欧盟PQC政策](https://digital-strategy.ec.europa.eu/en/policies/post-quantum-cryptography)、[ENISA协议集成研究](https://www.enisa.europa.eu/publications/post-quantum-cryptography-integration-study)、[NCSC迁移时间线](https://www.ncsc.gov.uk/guidance/pqc-migration-timelines)、[BSI TR-02102](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102.html)、[ANSSI PQC](https://cyber.gouv.fr/en/technological-and-cybersecurity-challenges/post-quantum-cryptography/) | 比较适用行业、混合路线、算法选用、认证、采购和实施时间。区分建议、法规、技术研究，不将一国指引当全球要求。旧报告只做背景和建源。 |
| NCCoE迁移工程 | [Migration to PQC](https://www.nccoe.nist.gov/applied-cryptography/migration-to-pqc)、[工程文档](https://pages.nist.gov/nccoe-migration-post-quantum-cryptography/) | 密码资产发现、风险排序、互通、性能、工具和多厂商参考架构。实验室测试不等于生产部署，项目成员名单不等于全部产品可用。 |
| 通信行业 | [GSMA PQC文档](https://www.gsma.com/solutions-and-impact/technologies/security/post-quantum-cryptography-documents/)、[使用场景库](https://www.gsma.com/solutions-and-impact/technologies/security/welcome-to-post-quantum-cryptography-use-case-library/) | 运营商、设备商、漫游/IoT/安全网关、原型和行业约束。继续查参与方技术文档与原始试验报告；入口403时记失败并查公开附件。 |
| 金融基础设施 | [BIS Project Leap](https://www.bis.org/project/leap) | 支付系统、签名替换、跨机构集成和性能/运行障碍。查最新阶段材料，也查实际金融机构/用户方公开说明。 |
| 电力与工控 | [EPRI量子网络安全专题](https://eprijournal.com/tag/quantum-cybersecurity/) | 老设备、DNP3/ICCP等行业协议、OT资产、代理保护和验证。标清概念、实验室、试点或生产阶段，QKD/QRNG不能替代PQC算法新闻。 |
| 国内标准与研究 | [全国标准信息公共服务平台](https://std.samr.gov.cn/)、[国家密码管理局公告](https://sca.gov.cn/sca/xwdt/tzgg.shtml)、[中国密码学会](https://www.cacrnet.org.cn/)、[国家科技期刊平台](https://opaj.napstic.cn/) | 定向查国家/行业/团体标准的计划、征求意见、发布/实施与附件，兼顾工信部、CCSA、TC260及适用行业标委会公开信息。中文《密码学报》等期刊、科研团队/作者原文补充英文预印本；索引不能代替全文。 |
| 国际其他标准渠道 | ISO/IEC、ITU-T、3GPP的官方公开目录、工作项目、版本说明及会议文件 | 核实具体组织/工作组、文档编号、版本/阶段；受限正文不可推断。与用户TLS/TLCP、SSH、IKE及云网/行业迁移的关联应具体。 |
| 企业研发与采用方 | 从实际事件定位国内密码企业、云厂商、运营商、设备商和海外相关企业的技术报告/产品文档/公开案例/重大披露 | 原有OpenHiTLS、Tongsuo、OpenSSL、OpenSSH、strongSwan、liboqs等继续作为证据入口。优先重要能力与发行，不把固定少数项目的维护提交作为整栏内容。供应商方案与用户方真实采用分开核实。 |

## 4. 网络安全入口

| 来源组 | 入口 | 获取什么、如何核验 |
| --- | --- | --- |
| 国内应急与漏洞 | [CNCERT](https://www.cert.org.cn/)、[CNVD](https://www.cnvd.org.cn/)、[CNNVD](https://www.cnnvd.org.cn/) | 风险提示、攻击活动、国内产品、处置与漏洞。CNVD/CNNVD动态或读取失败需记录；索引信息继续追厂商/研究者。 |
| 美国利用与产品通报 | [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)、[CISA官方CSAF](https://github.com/cisagov/CSAF)、[FIRST EPSS](https://www.first.org/epss/) | KEV是已知利用收录事实，EPSS是概率估计，CVSS是严重度，三者不可互换。CISA托管GitHub的JSON仍是官方通报，不归作代码维护。 |
| 欧洲、英国与亚太CERT | [CERT-EU](https://cert.europa.eu/publications/security-advisories/)、[NCSC](https://www.ncsc.gov.uk/section/keep-up-to-date/reports-advisories)、[JPCERT/CC](https://www.jpcert.or.jp/english/)、[新加坡CSA](https://www.csa.gov.sg/alerts-and-advisories/)、[澳大利亚通报](https://www.cyber.gov.au/alerts-and-advisories) | 区域威胁、利用、缓解、漏洞和防御；多份引用同一厂商报告不是独立确认。 |
| 厂商PSIRT与研究 | [华为PSIRT](https://www.huawei.com/en/psirt)、[Microsoft Security Update Guide](https://msrc.microsoft.com/update-guide)，以及有关厂商/维护者的安全公告与原始研究 | 受影响/修复版本、利用前提、缓解与检测。不能从普通bug修复推断攻击成功或补造CVE/CVSS。 |
| 事故与真实攻击 | [Cloudflare事故复盘](https://blog.cloudflare.com/tag/post-mortem/)，受影响机构状态页/RCA、安全研究团队的原始调查、监管及执法公开文件 | 供应链、勒索/泄露、身份与基础设施事故、修复失败。按证据陈述影响与归因，不直接采用攻击者自称战果；不联系任何人或发送消息。 |

## 5. AI、产业与原创新闻入口

| 来源组 | 入口 | 获取什么、如何核验 |
| --- | --- | --- |
| 模型与产品原文 | OpenAI、Anthropic、Google DeepMind、Meta、Qwen、DeepSeek、智谱、MiniMax、Moonshot、百度、腾讯、华为及其他实际发布方的官方研究/产品/发布目录 | 开放式候选名单，不能仅围绕熟悉厂商。查模型、Agent、多模态、应用、API/产品可用性、弃用和定价/限制变化；以具体原文为证，不凭品牌判断质量。 |
| 模型卡/系统卡/权重与许可证 | [HF模型卡说明](https://huggingface.co/docs/hub/model-cards)、[DeepMind模型卡](https://deepmind.google/models/model-cards/)、[Anthropic系统卡](https://www.anthropic.com/system-cards)、[ModelScope](https://modelscope.cn/)及发布方认证仓库 | 查用途/限制、评测配置、权重/代码/数据的实际公开范围和商业许可。旧[Qwen博客](https://qwenlm.github.io/)已提示迁往[qwen.ai](https://qwen.ai/)，应跟随官方说明，不把旧列表当当前更新源。 |
| 原始评测与可靠性研究 | [HELM](https://crfm.stanford.edu/helm/)、[METR](https://metr.org/)、[MLCommons AILuminate](https://ailuminate.mlcommons.org/)、[Artificial Analysis方法](https://artificialanalysis.ai/methodology/intelligence-benchmarking)、[英国AISI](https://www.aisi.gov.uk/research) | 读方法、版本、日期、数据/测试集、推理预算及局限。原始独立测试与厂商自测分开，不用榜单总分概括所有能力。 |
| 研究与基础设施 | 作者原文、NeurIPS/ICML/ICLR等会议及OpenReview，芯片/云/框架正式发布与公开测试 | 研究、训练/推理、成本、算力、开发体验和显著性能变化。合入PR不自动等于正式可用；单个普通kernel/日志/缓存改动不因可读而抢占头条。 |
| 应用、安全事故与政策 | [AI Incident Database](https://incidentdatabase.ai/)、[网信办](https://www.cac.gov.cn/)、[工信部](https://www.miit.gov.cn/)、[欧盟GPAI政策](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai) | 事故库只作线索，追原始调查/文件；官方材料核实备案、治理和采用条件。政策发布日期/生效日期/适用范围分开。 |
| 原创新闻与产业披露 | Reuters、AP、新华社、财新、财联社，以及The Record、BleepingComputer、KrebsOnSecurity、The Register、MIT Technology Review、机器之心、量子位、InfoQ、雷峰网、FreeBuf、安全客等与选题相关的原创报道；实际交易所/企业公告 | 都是发现候选入口，不是整体背书或必采名单；辨别原创采访/调查、翻译、转载、赞助和新闻稿。原创报告可支持其直接揭示事实，转述的技术结论仍追源；商业新闻须影响技术供应/采用/成本，不播报日常股价。 |

## 6. NGCC必须完整追踪的链条

每次检查 [NICCS官方首页](https://www.niccs.org.cn/)的通知、算法提案、[算法评议](https://www.niccs.org.cn/niccs/EmailList/pc/list.html)，及 [ngcc.dev首页](https://ngcc.dev/)、[安全报告索引](https://ngcc.dev/reports/index.html)、[分类规则](https://ngcc.dev/report-classification.html)。据事件进一步读具体候选原始规格、提交包、发现详情、Performance/Side-Channel、Credit、原始帖子/论文、复现脚本、作者公开回应及修订。

官方征集/评审与独立分析分开；正文保留版本、参数集和finding ID。一个发现的网页、同作者论文和代码是相关证据，不能计成三次独立验证。记录反驳、撤回、修复和复测；未公开或未读取的材料不当成已知事实。来源网站的Confirmed/Lead/Proof gap等标签不能代替本站的证据描述；公钥范围不以哈希征集凑数。

## 7. 读取失败、简短事件和更正

- 原始页面403/空正文/动态加载/失效时，查官方新路径、公开附件、作者机构仓库、合法公开HTML/PDF版本；尊重访问限制。记录失败对象与最后核验时间，后续按原始日期重试，不用抓取日期刷新新闻年龄。
- 重要短公告先进入候选池；补同一事件的技术背景、适用对象、已公开回应与影响依据。现有Schema强制长文，证据仍不足以支撑合格稿时在coverage留下主题/日期/已核实入口，不能凑字或拼无关事件；后续出现新增证据再发。
- 更正、撤回、回滚、弃用、许可收紧与负面结果同样有新闻价值；再次报道应链接前文并指出增量/更正。已有事实错误不能用换标题掩盖；发现需更正历史稿时明确报告具体稿件与证据，按既有数据发布范围处理，不能用局部日报覆盖整个历史版。
- 每7期复查一次常用来源是否迁移、是否反复不可读、是否长期占满某栏；根据实际覆盖补查新来源。来源更新不自动授权变更网站或订阅配置。

## 8. 采编方法参考

[AP Telling the Story](https://www.ap.org/about/news-values-and-principles/telling-the-story/) 和 [Reuters Standards & Values](https://reutersagency.com/about/standards-values/) 用于参考归因、交叉核实、新闻稿判断和更正方法；不是本站自动联系采访、复制整稿或增加审批流程的授权。实际执行遵守本仓库规则及用户已经授权的发布范围。
