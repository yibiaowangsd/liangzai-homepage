import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageIntro from "../../milk/PageIntro";
import { catalog, catalogDate, findPage, searchTracking, sections, sectionPath, sourceHref, sourceRoot, trackingHref } from "../catalog";
import TrackingContent, { TrackingLink } from "../TrackingContent";
import BenchmarkExplorer from "../BenchmarkExplorer";

type Options = Record<string, string | string[] | undefined>;
type Props = {
  params: Promise<{ parts?: string[] }>;
  searchParams: Promise<Options>;
};

function option(values: Options, key: string) {
  const value = values[key];
  return typeof value === "string" ? value : value?.[0];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = (await params).parts?.join("/") ?? "";
  const page = findPage(path);
  if (path === "search") return { title: "搜索 · 动态跟踪", robots: { index: false } };
  if (!page) return { title: "页面未找到 · 动态跟踪" };
  return {
    title: path ? page.title + " · 动态跟踪" : "动态跟踪 · 量仔",
    description: page.description,
    alternates: { canonical: "https://wangyibiao.com" + trackingHref(path) },
  };
}

function TrackingNavigation({ path, query }: { path: string; query?: string }) {
  return <div className="tracking-bar">
    <nav aria-label="动态跟踪栏目" className="tracking-nav">
      {sections.map(section => <TrackingLink key={section.path} href={trackingHref(section.path)}
        aria-current={sectionPath(path) === section.path ? "page" : undefined}>{section.name}</TrackingLink>)}
    </nav>
    <form action={trackingHref("search")} role="search" className="tracking-search">
      <input type="search" name="q" aria-label="搜索动态跟踪" placeholder="搜索算法、RFC 或组件" defaultValue={query} maxLength={120} required />
      <button type="submit">搜索</button>
    </form>
  </div>;
}

function TrackingSources({ path }: { path: string }) {
  return <aside className="tracking-sources" aria-label="来源">
    <p>资料索引参考腾讯云与腾讯玄武实验室的 PQC InfoHub，收录于 <time dateTime={catalogDate}>{catalogDate}</time>。</p>
    <div>
      <TrackingLink href={sourceHref(path)}>查看原站页面 ↗</TrackingLink>
      <TrackingLink href={sourceHref(path, "en")} lang="en">English ↗</TrackingLink>
    </div>
    {!path && <div className="tracking-source-contact">
      <TrackingLink href="https://cloud.tencent.com/">腾讯云 ↗</TrackingLink>
      <TrackingLink href="https://xlab.tencent.com/">腾讯玄武实验室 ↗</TrackingLink>
      <a href="mailto:pqc@tencent.com">pqc@tencent.com</a>
    </div>}
  </aside>;
}

export default async function TrackingRoute({ params, searchParams }: Props) {
  const path = (await params).parts?.join("/") ?? "";
  const options = await searchParams;
  const page = findPage(path);
  const searching = path === "search";
  if (!page && !searching) notFound();

  const query = searching ? option(options, "q")?.slice(0, 120).trim() ?? "" : undefined;
  const matches = searching ? searchTracking(query ?? "") : [];
  const activeSection = sections.find(section => section.path === sectionPath(path));
  const trail = path.includes("/") && activeSection ? activeSection : undefined;
  const overview = !path;
  const selectedScene = page?.scenes?.find(scene => scene.id === option(options, "scene")) ?? page?.scenes?.[0];
  const selectedRegion = page?.regions?.find(region => region.id === option(options, "region")) ?? page?.regions?.[0];

  return <main id="main-content" className="tracking-page milk" data-tracking-path={path || "overview"}>
    <div className="tracking-shell">
      {overview ? <header className="tracking-hero">
        <div>
          <span className="tracking-hero-kicker">PQC · 后量子密码</span>
          <h1>动态跟踪</h1>
          <p>追踪标准和协议演进，查询组件支持、实测性能与各地迁移路线。</p>
        </div>
        <dl aria-label="收录范围">
          <div><dt>标准与协议专题</dt><dd>{Object.keys(catalog).filter(key => /^(algorithms|protocols|resources)\//.test(key)).length}</dd></div>
          <div><dt>组件档案</dt><dd>{Object.keys(catalog).filter(key => key.startsWith("products/")).length}</dd></div>
          <div><dt>政策地区</dt><dd>{(catalog.policies.regions?.length ?? 1) - 1}</dd></div>
        </dl>
      </header> : <PageIntro
        latin="PQC,"
        kicker={trail ? trail.name : "动态跟踪"}
        title={page?.title ?? "搜索动态跟踪"}
        dynamicTitle
        back={trail && <Link href={trackingHref(trail.path)} className="milk-intro-back">返回{trail.name}</Link>}
        meta={page?.meta?.length ? <TrackingContent nodes={page.meta} /> : undefined}
      >
        {page && <p>{page.description}</p>}
      </PageIntro>}

      <TrackingNavigation path={path} query={query} />
      {searching ? <section className="tracking-results" aria-labelledby="tracking-result-title">
        <h2 id="tracking-result-title">{query ? "找到 " + matches.length + " 个页面" : "输入关键词开始搜索"}</h2>
        {query && !matches.length && <p>试试算法名、标准编号或组件名，例如 ML-KEM、RFC 9954 或 OpenSSL。</p>}
        <ul>{matches.map(item => <li key={item.path}>
          <Link href={trackingHref(item.path)}>{item.title}</Link>
          <span className="meta">{sections.find(section => section.path === sectionPath(item.path))?.name}</span>
          <p>{item.description}</p>
        </li>)}</ul>
      </section> : <>
        {page?.scenes && <nav aria-label="按使用场景浏览" className="tracking-filters">{page.scenes.map(scene => <Link
          key={scene.id} href={trackingHref("products") + "?scene=" + scene.id} scroll={false}
          aria-current={scene.id === selectedScene?.id ? "true" : undefined}>{scene.title}<span>{scene.count}</span>
        </Link>)}</nav>}
        {page?.regions && <nav aria-label="按地区筛选" className="tracking-filters">{page.regions.map(region => <Link
          key={region.id} href={trackingHref("policies") + (region.id === "all" ? "" : "?region=" + region.id)}
          scroll={false} aria-current={region.id === selectedRegion?.id ? "true" : undefined}>{region.title}
        </Link>)}</nav>}

        {path === "performance" ? <BenchmarkExplorer /> : page?.toc ? <div className="tracking-reading">
          <aside className="ref-rail">
            <nav aria-label="本篇目录">
              <p>本篇目录</p>
              {page.toc.map(heading => <a key={heading.id} href={"#" + heading.id}>{heading.label}</a>)}
              <TrackingLink href={sourceHref(path)}>查看原文 ↗</TrackingLink>
            </nav>
          </aside>
          <article aria-label="文章导读" className="tracking-reading-body">
            <TrackingContent nodes={page.nodes} />
          </article>
        </div> : page && <div className="tracking-content">
          <TrackingContent nodes={page.nodes} scene={selectedScene?.id} region={selectedRegion?.id} />
          {page.benchmark && <section id="perf" className="tracking-component-perf">
            <h2>性能数据</h2>
            <BenchmarkExplorer component={page.benchmark} />
          </section>}
        </div>}
      </>}
      {searching ? <p className="tracking-sources"><TrackingLink href={sourceRoot + "/zh/"}>来源 · PQC InfoHub ↗</TrackingLink></p> : <TrackingSources path={path} />}
    </div>
  </main>;
}
