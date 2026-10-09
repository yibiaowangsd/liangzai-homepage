import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

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

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

// The built Worker patches global fetch on first use. Install the deterministic
// upstream stub before importing it, and keep all renders serial in this suite.
test("news pages preserve published content and accessible rendering", async (t) => {
  const originalFetch = globalThis.fetch;
  let upstream = () => Response.json(editions());
  const requests = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, "https://api.wangyibiao.com", "No unmocked external requests");
    requests.push({ url, init });
    return upstream(url);
  };

  try {
    const { default: worker } = await import("../dist/server/index.js");
    async function render(path) {
      const response = await worker.fetch(
        new Request("http://localhost" + path, { headers: { accept: "text/html" } }),
        { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
        { waitUntil() {}, passThroughOnException() {} },
      );
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
      return mainMarkup(await response.text());
    }

    await t.test("listing keeps titles, summaries, sources and named image links", async () => {
      upstream = (url) => {
        assert.equal(url.pathname, "/api/news/editions");
        assert.equal(url.searchParams.get("page"), "1");
        assert.equal(url.searchParams.get("pageSize"), "1");
        return Response.json(editions());
      };
      const main = await render("/news");
      assert.equal([...main.matchAll(/<h1\b/g)].length, 1);
      assert.match(main, /<h1>前沿新闻<\/h1>/);
      for (const item of publishedItems) {
        assert.ok(main.includes(escapeHtml(item.title)), `Preserved title: ${item.slug}`);
        assert.ok(main.includes(escapeHtml(item.summary)), `Preserved full summary: ${item.slug}`);
        assert.ok(main.includes(escapeHtml(item.source_name)), `Preserved source: ${item.slug}`);
        assert.ok(main.includes(`href="/news/${item.slug}"`), `Preserved route: ${item.slug}`);
      }
      for (const tag of JSON.parse(publishedItems[0].tags)) {
        assert.ok(main.includes(`<span>${escapeHtml(tag)}</span>`));
      }
      const imageLinks = [...main.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)]
        .map((match) => match[0]).filter((anchor) => anchor.includes('class="story-image"'));
      assert.equal(imageLinks.length, 11, "Lead, deck, topic lead and brief thumbnails all render");
      for (const anchor of imageLinks) {
        const item = publishedItems.find((story) => attribute(anchor, "href") === "/news/" + story.slug);
        assert.ok(item);
        assert.equal(attribute(anchor, "aria-label"), escapeHtml("阅读：" + item.title));
        assert.match(anchor, /<img\b[^>]*alt=""[^>]*aria-hidden="true"/);
      }
      for (const className of ["lead-visual", "deck-thumb", "desk-lead-image", "brief-thumb"]) {
        assert.ok(imageLinks.some((anchor) => attribute(anchor, "class") === className), className);
      }
    });

    await t.test("front-page highlights cover all five directions before repeating a direction", async () => {
      const categories = ["pqc", "protocol", "standards", "security", "ai"];
      const items = categories.flatMap((category) => Array.from({ length: 5 }, (_, index) => ({
        ...publishedItems[0],
        slug: `highlights-${category}-${index}`,
        title: `${category} 新闻 ${index}`,
        category,
      })));
      upstream = () => Response.json(editions(items));
      const main = await render("/news");
      const front = main.slice(main.indexOf('<section class="front-page">'), main.indexOf('<div class="edition-stack">'));
      const highlighted = [...front.matchAll(/<a\b[^>]*class="(?:lead-visual|deck-thumb)"[^>]*>/g)]
        .map((match) => attribute(match[0], "href"));
      assert.deepEqual(highlighted, categories.map((category) => `/news/highlights-${category}-0`));
      assert.equal(new Set(highlighted).size, 5);
      for (const item of items) assert.ok(main.includes(escapeHtml(item.title)), `Topic desks retain ${item.slug}`);

      upstream = () => Response.json(editions(items.filter((item) => ["pqc", "ai"].includes(item.category))));
      const sparse = await render("/news");
      const sparseFront = sparse.slice(sparse.indexOf('<section class="front-page">'), sparse.indexOf('<div class="edition-stack">'));
      const sparseHighlights = [...sparseFront.matchAll(/<a\b[^>]*class="(?:lead-visual|deck-thumb)"[^>]*>/g)]
        .map((match) => attribute(match[0], "href"));
      assert.deepEqual(sparseHighlights, ["pqc-0", "ai-0", "pqc-1", "ai-1", "pqc-2"].map((slug) => `/news/highlights-${slug}`));
    });

    await t.test("source images retain their URL and use uncropped treatment", async () => {
      const items = [
        publishedItems[0],
        publishedItems[1],
        { ...publishedItems[2], cover_image: null },
        { ...publishedItems[3], cover_image: "/news-covers/pqc.svg" },
        { ...publishedItems[4], cover_image: "https://example.com/news-covers/pqc.svg" },
      ];
      upstream = () => Response.json(editions(items));
      const main = await render("/news");
      const expected = new Map([
        ["/assets/pqc/ml-dsa-studio-v2.webp", "editorial"],
        [publishedItems[1].cover_image, "source"],
        ["/news-covers/compute-v2.webp", "editorial"],
        ["/news-covers/connection-v2.webp", "editorial"],
        ["/assets/pqc/slh-dsa-studio-v2.webp", "editorial"],
        ["https://example.com/news-covers/pqc.svg", "source"],
      ]);
      const images = [...main.matchAll(/<img\b[^>]*class="story-image"[^>]*>/g)].map((match) => match[0]);
      assert.ok(images.length);
      for (const image of images) {
        const src = attribute(image, "src");
        assert.ok(expected.has(src), `Preserved source or category fallback: ${src}`);
        assert.equal(attribute(image, "data-treatment"), expected.get(src));
      }
      assert.equal(attribute(images[0], "loading"), "eager");
      assert.equal(attribute(images[0], "fetchPriority"), "high");
      assert.ok(images.slice(1).every((image) => attribute(image, "loading") === "lazy"));
      const css = await readFile(new URL("../app/news/news.css", import.meta.url), "utf8");
      assert.match(css, /\.story-image\s*\{[^}]*object-fit:\s*cover\s*;/);
      assert.match(css, /\.story-image\[data-treatment="source"\]\s*\{[^}]*object-fit:\s*contain\s*;/);
    });

    await t.test("category and pagination preserve the upstream query and navigation", async () => {
      const protocolItems = publishedItems.filter((item) => item.category === "protocol");
      upstream = (url) => {
        assert.equal(url.searchParams.get("page"), "2");
        assert.equal(url.searchParams.get("pageSize"), "1");
        assert.equal(url.searchParams.get("category"), "protocol");
        return Response.json(editions(protocolItems, 2));
      };
      const main = await render("/news?page=2&category=protocol");
      assert.ok(main.includes(escapeHtml(protocolItems[0].title)));
      assert.ok(!main.includes(escapeHtml(publishedItems[0].title)));
      assert.match(main, /href="\/news\?category=protocol"/);
      assert.match(main, /href="\/news\?page=3&amp;category=protocol"/);
      assert.match(main, /<a[^>]*aria-current="page"[^>]*href="\/news\?page=2&amp;category=protocol"|<a[^>]*href="\/news\?page=2&amp;category=protocol"[^>]*aria-current="page"/);
    });

    await t.test("one day per page renders every story and keeps dated navigation through the last page", async () => {
      const dates = ["2026-10-03", "2026-10-02", "2026-09-30"];
      const archive = dates.map((date) => {
        const items = ["pqc", "protocol", "industry"].flatMap((category) =>
          Array.from({ length: 7 }, (_, index) => ({
            ...publishedItems[0],
            slug: `${date}-${category}-${index}`,
            title: `${date} ${category} 新闻 ${index}`,
            category,
            published_at: `${date}T07:00:00Z`,
          })),
        );
        return { date, items };
      });
      upstream = (url) => {
        assert.equal(url.searchParams.get("pageSize"), "1");
        const page = Math.min(Number(url.searchParams.get("page")), dates.length);
        const category = url.searchParams.get("category");
        const edition = archive[page - 1];
        const items = edition.items.filter((item) => !category || item.category === category);
        const payload = editions(items, page);
        payload.data[0].date = edition.date;
        return Response.json(payload);
      };
      for (const category of ["", "protocol"]) {
        for (const page of [1, 2, 3, 999]) {
          const safePage = Math.min(page, 3);
          const date = dates[safePage - 1];
          const main = await render(`/news?page=${page}${category ? "&category=" + category : ""}`);
          assert.equal([...main.matchAll(/class="edition"/g)].length, 1);
          assert.ok(main.includes(`dateTime="${date}"`));
          for (const edition of archive) {
            for (const item of edition.items) {
              assert.equal(main.includes(escapeHtml(item.title)), edition.date === date && (!category || item.category === category), item.slug);
            }
          }
          const pagination = main.match(/<nav class="news-pagination"[\s\S]*?<\/nav>/)?.[0];
          assert.ok(pagination);
          const links = [...pagination.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
          assert.equal(attribute(links[0], "aria-disabled"), String(safePage === 1));
          assert.equal(attribute(links.at(-1), "aria-disabled"), String(safePage === 3));
          const prev = new URL(attribute(links[0], "href").replaceAll("&amp;", "&"), "http://localhost");
          const next = new URL(attribute(links.at(-1), "href").replaceAll("&amp;", "&"), "http://localhost");
          assert.equal(Number(prev.searchParams.get("page") || 1), Math.max(1, safePage - 1));
          assert.equal(Number(next.searchParams.get("page") || 1), Math.min(3, safePage + 1));
          assert.equal(prev.searchParams.get("category") || "", category);
          assert.equal(next.searchParams.get("category") || "", category);
          for (const match of main.matchAll(/href="(\/news\/[^"]+)"/g)) {
            const href = new URL(match[1].replaceAll("&amp;", "&"), "http://localhost");
            if (href.pathname === "/news/subscribe") continue;
            assert.equal(Number(href.searchParams.get("page") || 1), safePage);
            assert.equal(href.searchParams.get("category") || "", category);
          }
        }
      }
    });

    await t.test("detail keeps summary, semantic body blocks, date and original source", async () => {
      const item = {
        ...publishedItems[1],
        // Explicit parser fixtures exercise text escaping without changing source records.
        content: "# 测试正文标题\n真实内容保留：ML-KEM & TLS <draft>。\n换行仍属于同一个段落。\n\n## 关键更新\n- 第一项：保留完整信息\n- 第二项：保留原始顺序\n\n### 阅读提示\n<script>alert(1)</script>\n- 最后一项也需要输出",
      };
      upstream = (url) => {
        assert.equal(url.pathname, "/api/news/" + item.slug);
        return Response.json(item);
      };
      const main = await render("/news/" + item.slug);
      assert.equal([...main.matchAll(/<h1\b/g)].length, 1);
      assert.ok(main.includes(`<h1>${escapeHtml(item.title)}</h1>`));
      assert.ok(main.includes(`<p class="article-deck">${escapeHtml(item.summary)}</p>`));
      assert.doesNotMatch(main, /article-summary|source-rail|一句话看懂/);
      assert.equal(main.split(escapeHtml(item.summary)).length - 1, 1, "The deck appears once");
      assert.match(main.replace(/<!-- -->/g, ""), /约 1 分钟阅读/);
      assert.ok(main.indexOf('class="article-body"') < main.indexOf('class="article-source"'));
      assert.match(main, /原文与编译说明/);
      assert.ok(main.includes(`dateTime="${item.published_at}"`));
      assert.ok(main.includes('class="article-hero-image"'));
      assert.ok(main.includes('data-treatment="source"'));
      assert.ok(main.includes(`src="${escapeHtml(item.cover_image)}"`));
      const body = main.match(/<div class="article-body">([\s\S]*?)<\/div>/)?.[1];
      assert.equal(body,
        '<h2>测试正文标题</h2><p>真实内容保留：ML-KEM &amp; TLS &lt;draft&gt;。 换行仍属于同一个段落。</p>' +
        '<h2>关键更新</h2><ul><li>第一项：保留完整信息</li><li>第二项：保留原始顺序</li></ul>' +
        '<h3>阅读提示</h3><p>&lt;script&gt;alert(1)&lt;/script&gt;</p><ul><li>最后一项也需要输出</li></ul>',
      );
      const sourceLinks = [...main.matchAll(/<a\b[^>]*>/g)].map((match) => match[0])
        .filter((anchor) => attribute(anchor, "href") === escapeHtml(item.source_url));
      assert.equal(sourceLinks.length, 1, "The article footer preserves the original source");
      for (const anchor of sourceLinks) {
        assert.equal(attribute(anchor, "target"), "_blank");
        assert.equal(attribute(anchor, "rel"), "noreferrer");
      }
      assert.ok(main.includes(`<p>${escapeHtml(item.source_name)}</p>`));
    });

    await t.test("an offline or empty feed remains readable and never invents stories", async () => {
      upstream = () => new Response("Unavailable", { status: 503 });
      const offline = await render("/news");
      assert.match(offline, /<h1>前沿新闻<\/h1>/);
      assert.match(offline, /新闻暂时无法载入/);
      assert.doesNotMatch(offline, /class="(?:lead-story|story-image)"/);
      upstream = () => Response.json({ data: [], meta: { page: 1, pageSize: 1, totalDays: 0, totalPages: 1 } });
      const empty = await render("/news");
      assert.match(empty, /下一版简报正在路上/);
      assert.doesNotMatch(empty, /class="(?:lead-story|story-image)"/);
    });

    assert.ok(requests.length >= 7, "Each render reads the mocked current API");
    assert.ok(requests.every(({ init }) => init?.cache === "no-store"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
