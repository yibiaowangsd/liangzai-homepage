import assert from "node:assert/strict";
import test from "node:test";

// Representative API records captured on 2026-09-30. These are rendering fixtures,
// not live-news assertions; tests must never depend on the upstream API/network.
const publishedItems = [
  {
    "id": 12,
    "slug": "20260930-nist-tcpt3-pq-threshold-preview",
    "title": "NIST TCPT3 启动：后量子门限密码进入候选方案预览阶段",
    "summary": "NIST 的 Threshold Call Preview Talks #3 于 9 月 30 日启动，安排 15 场以上预览报告。10 月 6 日将专门讨论后量子门限签名与公钥加密，说明 PQC 标准化正在从单体算法向门限与分布式密码延伸。",
    "category": "pqc",
    "tags": "[\"NIST\",\"PQC\",\"Threshold\",\"ZKP\"]",
    "source_name": "NIST CSRC",
    "source_url": "https://csrc.nist.gov/Events/2026/tcpt3",
    "cover_image": "https://wangyibiao.com/news-covers/pqc.svg",
    "published_at": "2026-09-30T07:00:05.000Z"
  },
  {
    "id": 11,
    "slug": "20260930-cloudflare-pq-tls-observability",
    "title": "Cloudflare 把后量子 TLS 密钥交换结果加入 Analytics 与日志",
    "summary": "Cloudflare 新增域名级 PQ TLS 可观测能力，可在 HTTP Analytics、Log Explorer 和 Logpush 中查看实际协商的密钥交换组。官方观察到浏览器侧约 70% 流量已采用混合 ML-KEM，而源站侧比例仍明显更低。",
    "category": "pqc",
    "tags": "[\"ML-KEM\",\"Observability\",\"PQC\",\"TLS1.3\"]",
    "source_name": "Cloudflare Blog",
    "source_url": "https://blog.cloudflare.com/post-quantum-visibility/",
    "cover_image": "https://blog.cloudflare.com/_emdash/api/media/file/01M3N38FH3Y8R31B3T0EBK7WEH.01M3N38GADPYXX9327HCSMAVQM.png",
    "published_at": "2026-09-30T07:00:04.000Z"
  },
  {
    "id": 10,
    "slug": "20260930-cloudflare-cryptolabe-pq-inventory",
    "title": "CryptoLabe：Cloudflare 用 AI 自动发现大型代码库中的密码依赖",
    "summary": "Cloudflare 公开内部迁移工具 CryptoLabe，用 AI 在代码、文档和工单中识别密码算法、依赖关系和迁移阻塞点，服务于其 2029 年全面后量子就绪目标。密码资产发现正成为大规模 PQC 迁移的第一步。",
    "category": "pqc",
    "tags": "[\"AI\",\"Crypto Agility\",\"Inventory\",\"PQC Migration\"]",
    "source_name": "Cloudflare Blog",
    "source_url": "https://blog.cloudflare.com/ai-driven-cryptography-discovery/",
    "cover_image": "https://blog.cloudflare.com/_emdash/api/media/file/01M3NF4XDFEGCKV4V9998SCFN1.01M3NF4XXD3BD3B9QPDA628ZPY.png",
    "published_at": "2026-09-30T07:00:03.000Z"
  },
  {
    "id": 9,
    "slug": "20260930-cloudflare-mtc-pq-ca",
    "title": "Merkle Tree Certificates 成为 Cloudflare 后量子 CA 的核心方案",
    "summary": "Cloudflare 表示其新公共 CA 将支持 Merkle Tree Certificates，并目标在 2027 年初进入 Chrome 的量子抗性根计划。MTC 通过对 Merkle 树根签名和包含证明减少后量子证书链带来的握手膨胀。",
    "category": "pqc",
    "tags": "[\"Certificate\",\"MTC\",\"PQC\",\"TLS\"]",
    "source_name": "Cloudflare Blog",
    "source_url": "https://blog.cloudflare.com/pq-ca-with-mtcs/",
    "cover_image": "https://blog.cloudflare.com/_emdash/api/media/file/01M3P82XV6Q7JZSJTM9RG8N1YH.01M3P82YSA93VNX0A7361ZGKTX.png",
    "published_at": "2026-09-30T07:00:02.000Z"
  },
  {
    "id": 8,
    "slug": "20260930-cloudflare-public-ca-post-quantum",
    "title": "Cloudflare 申请成为公共 CA，把后量子 Web PKI 纳入生产路线",
    "summary": "Cloudflare 9 月 29 日宣布申请加入 Chrome、Apple、Microsoft 和 Mozilla 根计划，并计划在新 CA 中支持 Merkle Tree Certificates。后量子迁移正在从密钥交换扩展到证书发行、透明度和根信任体系。",
    "category": "pqc",
    "tags": "[\"CA\",\"MTC\",\"PQC\",\"WebPKI\"]",
    "source_name": "Cloudflare Blog",
    "source_url": "https://blog.cloudflare.com/cloudflare-certificate-authority/",
    "cover_image": "https://blog.cloudflare.com/_emdash/api/media/file/01M3NDRB3KYKX16KDC3S3YSQFQ.01M3NDRCZRSNQTMACBMW3GDJVB.png",
    "published_at": "2026-09-30T07:00:01.000Z"
  },
  {
    "id": 17,
    "slug": "20260930-ikev2-pqc-auth-rfc-editor",
    "title": "IKEv2 的 PQC 签名认证草案已完成 IESG 处理并进入 RFC Editor",
    "summary": "draft-ietf-ipsecme-ikev2-pqc-auth-12 定义在 IKEv2 现有认证框架中接入 PQC 签名的一般机制，并明确 ML-DSA 与 SLH-DSA 的使用。文档已完成 IESG 处理并进入 RFC Editor 流程。",
    "category": "protocol",
    "tags": "[\"Authentication\",\"IKEv2\",\"ML-DSA\",\"SLH-DSA\"]",
    "source_name": "IETF Datatracker",
    "source_url": "https://datatracker.ietf.org/doc/draft-ietf-ipsecme-ikev2-pqc-auth/",
    "cover_image": "https://static.ietf.org/dt/12.79.0/ietf/images/ietf-logo-card.png",
    "published_at": "2026-09-30T07:01:05.000Z"
  }
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;",
})[character]);

function editions(items = publishedItems, page = 1) {
  const topics = {};
  for (const item of items) (topics[item.category] ||= []).push(item);
  return {
    data: [{ date: "2026-09-30", total: items.length, topics }],
    meta: { page, pageSize: 1, totalDays: 3, totalPages: 3 },
  };
}

function mainMarkup(html) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  assert.ok(main, "The response has server-rendered main content");
  return main;
}

// Install a deterministic upstream before the worker patches global fetch.
test("news uses concise, unique entries and source-linked observations", async (t) => {
 const originalFetch=globalThis.fetch;
 let upstream=()=>Response.json(editions());
 globalThis.fetch=async input=>{const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.origin,"https://api.wangyibiao.com");return upstream(url);};
 try {
  const {default:worker}=await import("../dist/server/index.js");
  const render=async path=>{const response=await worker.fetch(new Request("http://localhost"+path),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,200);return mainMarkup(await response.text());};
  await t.test("every story has one title and one link, without duplicate highlights or images",async()=>{
   const main=await render("/news");
   assert.match(main,/<h1>前沿新闻<\/h1>/);
   for(const item of publishedItems){assert.ok(main.includes(escapeHtml(item.summary)));assert.equal(main.split('href="/news/'+item.slug+'"').length-1,1);}
   assert.doesNotMatch(main,/class="front-page"|class="story-image"|<img/);
   assert.match(main,/aria-label="新闻方向"/);
   assert.match(main,/aria-label="跳转到日期或期数"/);
   assert.match(main,/aria-current="page">第一页/);
   assert.match(main,/<span aria-disabled="true">较新/);
   assert.doesNotMatch(main,/<details class="news-extra"[^>]*open/);
  });
  await t.test("tag filters apply to this edition and persist in article links",async()=>{
   const main=await render("/news?tag=ML-KEM");
   const matching=publishedItems.filter(item=>/ML-KEM/i.test([item.title,item.summary,item.tags].join(' ')));
   assert.ok(matching.length);
   for(const item of matching)assert.ok(main.includes('href="/news/'+item.slug+'?tag=ML-KEM"'));
   for(const item of publishedItems.filter(item=>!matching.includes(item)))assert.ok(!main.includes('href="/news/'+item.slug));
  });
  await t.test("category and archive page are retained through article navigation",async()=>{
   const items=publishedItems.filter(item=>item.category==='protocol');
   upstream=url=>{assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.get('category'),null);return Response.json(editions(items,2));};
   const main=await render('/news?page=2&category=protocol');
   assert.ok(main.includes('href="/news/'+items[0].slug+'?page=2&amp;category=protocol"'));
   assert.match(main,/href="\/news\?page=3"/);
  });
  await t.test("observation is first, source synopsis is bounded and collapsed, text is escaped",async()=>{
   const item={...publishedItems[1],content:'## 原文编译\nSource & <script>alert(1)</script>\n\n## 量仔观察\nA protocol needs negotiation and a key schedule.'};
   upstream=()=>Response.json(item);
   const main=await render('/news/'+item.slug);
   assert.ok(main.indexOf('A protocol needs negotiation')<main.indexOf('article-source-excerpt'));
   assert.match(main,/<details class="article-source-excerpt"><summary>/);
   assert.ok(main.includes('Source &amp; &lt;script&gt;alert(1)&lt;/script&gt;'));
   assert.ok(main.includes(escapeHtml(item.source_url)));
   assert.doesNotMatch(main,/article-hero-image|data-treatment="source"|<script>alert/);
  });
  await t.test("offline and empty editions keep useful, honest states",async()=>{
   upstream=()=>new Response('Unavailable',{status:503});assert.match(await render('/news'),/新闻暂时无法载入/);
   upstream=()=>Response.json({data:[],meta:{page:1,totalPages:1}});assert.match(await render('/news'),/下一版简报正在路上/);
  });
 }finally{globalThis.fetch=originalFetch;}
});
