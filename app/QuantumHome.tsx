import Link from "next/link";
import { Suspense } from "react";
import { MotionSurface } from "./experience/Motion";
import HomeDispatch from "./studio/HomeDispatch";
import Greeting from "./milk/Greeting";
import NaiwaAsks from "./milk/NaiwaAsks";
import MilkSurface from "./milk/MilkSurface";
import { categoryLabels, coreCategories } from "./news/news-api";
import "./milk/home.css";

const day = [
  { time: "08:10", part: "早", label: "一瓶简报", href: "#morning" },
  { time: "14:00", part: "午", label: "一间实验室", href: "#noon" },
  { time: "18:30", part: "傍晚", label: "家里两位", href: "#family" },
  { time: "21:30", part: "晚", label: "一个睡前故事", href: "#night" },
];

const family = [
  { id: "liangzai", verb: "量", name: "量仔", latin: "the one who measures", image: "/assets/characters-v2/arsenal-liangzai-cutout.webp", width: 1024, height: 1536, alt: "蓝白机甲、头顶蓝色天线的量仔", text: "什么都要量一量才放心。新闻的来源、握手的耗时、每一个测试向量，都归他管。", href: "/archive#liangzai", action: "读量仔小传" },
  { id: "naiwa", verb: "守", name: "奶蛙", latin: "the one who stays", image: "/assets/naiwa/stand.webp", width: 760, height: 1140, alt: "奶黄色、圆肚皮、绿眼圈的奶蛙稳稳站着", text: "圆滚滚，话不多，却一步不退。答案出现以前，他负责抱着奶瓶，替大家多撑一会儿。", href: "/archive#naiwa", action: "看奶蛙的档案" },
];

export default function QuantumHome() {
  return (
    <MotionSurface className="mk-film">
      <main id="main-content" className="milk mk-home">
        <section className="mk-hero milk-on-cobalt" aria-labelledby="home-title">
          <div className="mk-hero-copy">
            <Greeting />
            <h1 id="home-title" className="milk-display">每天，喂自己<br />一点新东西</h1>
            <p className="mk-lede">我是 Yibiao，做抗量子密码与安全协议。这里是我给好奇心开的小厨房：每天温一瓶前沿简报，留一间能跑真实算法的实验室，再养两个小家伙：量仔和奶蛙。</p>
            <div className="mk-actions">
              <Link className="milk-button" data-tone="butter" href="/news">喝今天这一瓶</Link>
              <Link className="milk-link" href="/about">认识 Yibiao</Link>
            </div>
          </div>
          <NaiwaAsks />
          <nav className="mk-day" aria-label="这一天的安排">
            {day.map(item => <a key={item.href} href={item.href}><b className="milk-latin">{item.time}</b><span><small>{item.part}</small>{item.label}</span></a>)}
          </nav>
          <MilkSurface className="mk-hero-surface" />
        </section>

        <section className="mk-section mk-morning" id="morning" aria-labelledby="morning-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>08:10</b>早 · 每天这个点更新</p>
            <h2 id="morning-title" className="milk-display">最新简报</h2>
            <p>追踪后量子密码、抗量子协议与迁移，<br />关注标准、网络安全、AI 与 NGCC 公钥征集的新进展。</p>
          </header>
          <nav className="mk-topics" aria-label="新闻栏目">{coreCategories.map(category => <Link key={category} href={`/news?category=${category}`}>{categoryLabels[category]}</Link>)}</nav>
          <Suspense fallback={<div className="mk-dispatch-empty" role="status"><p>正在温今天这一瓶…</p><Link className="milk-link" href="/news">直接去新闻页</Link></div>}><HomeDispatch /></Suspense>
          <div className="mk-morning-foot">
            <div><Link href="/news" className="milk-link">阅读完整技术简报</Link><Link href="/topics" className="milk-link">按算法与协议追踪后续进展</Link></div>
            <div className="mk-subscribe"><p>按板块订阅，每天在邮箱或群聊读前沿。<span>申请审核通过后接收。</span></p><Link href="/news/subscribe" className="milk-button">订阅日报</Link></div>
          </div>
        </section>

        <section className="mk-section mk-noon" id="noon" aria-labelledby="noon-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>14:00</b>午 · 动手的时间</p>
            <h2 id="noon-title" className="milk-display">从算法，到协议</h2>
            <p>关注一次握手如何建立密钥、完成认证，<br />也关注它如何兼容现有系统。</p>
          </header>
          <div className="mk-lab" data-reveal>
            <div className="mk-lab-copy">
              <p className="mk-lab-kicker milk-latin">in your browser</p>
              <h3 className="milk-display">在浏览器里，<br />验证一次密钥封装</h3>
              <p>生成 ML-KEM 密钥，完成封装与解封，比较双方共享秘密。也可以导入测试向量，检查签名与验签结果。</p>
              <div className="mk-actions"><a className="milk-button" href="/pqc-practice">进入密码实验室</a><Link className="milk-link" href="/pqc-arsenal">阅读算法原理</Link></div>
              <ul className="mk-lab-meta" aria-label="可运行的算法"><li>ML-KEM</li><li>ML-DSA</li><li>SLH-DSA</li><li>SM2</li></ul>
            </div>
            <div className="mk-lab-stage" aria-hidden="true">
              <span className="mk-lab-key" data-side="a">pk</span><span className="mk-lab-key" data-side="b">ct</span>
              <img src="/assets/characters-v2/arsenal-liangzai-cutout.webp" width="1024" height="1536" alt="" loading="lazy" decoding="async" />
            </div>
          </div>
          <dl className="mk-engineering" data-reveal>
            <div><dt>混合密钥协商</dt><dd>经典算法与 ML-KEM 如何组合，如何将共享秘密接入协议密钥派生。</dd></div>
            <div><dt>密码敏捷</dt><dd>让算法选择、参数配置与协议协商衔接，支持逐步迁移。</dd></div>
            <div><dt>互通与性能</dt><dd>从标准向量、跨实现验证到握手耗时，检查正确性与工程代价。</dd></div>
          </dl>
          <p className="mk-more" data-reveal>想看得更深：<Link className="milk-link" href="/research">深度研究札记</Link><Link className="milk-link" href="/topics">技术进展档案</Link></p>
        </section>

        <section className="mk-section mk-family" id="family" aria-labelledby="family-title">
          <header className="mk-head" data-reveal>
            <p className="milk-time"><b>18:30</b>傍晚 · 家里人到齐</p>
            <h2 id="family-title" className="milk-display">一个量，一个守</h2>
            <p>做技术的两种脾气，<br />刚好长成了两个小家伙。</p>
          </header>
          <ul className="mk-family-grid">
            {family.map(member => <li key={member.id} data-member={member.id} data-reveal>
              <Link href={member.href}>
                <span className="mk-family-verb milk-display" aria-hidden="true">{member.verb}</span>
                <img src={member.image} width={member.width} height={member.height} alt={member.alt} loading="lazy" decoding="async" />
                <div><p className="milk-latin">{member.latin}</p><h3 className="milk-display">{member.name}</h3><p>{member.text}</p><span className="mk-family-action">{member.action}<i aria-hidden="true"> →</i></span></div>
              </Link>
            </li>)}
          </ul>
          <p className="mk-more" data-reveal>想凑近看：<Link className="milk-link" href="/models">旋转查看角色模型</Link><Link className="milk-link" href="/archive">翻开两份角色档案</Link></p>
        </section>

        <section className="mk-night milk-on-night" id="night" aria-labelledby="night-title">
          <MilkSurface className="mk-night-surface" />
          <div className="mk-night-inner">
            <div className="mk-night-copy" data-reveal>
              <p className="milk-time"><b>21:30</b>晚 · 关灯之前</p>
              <h2 id="night-title" className="milk-display">工程之外，<br />一个睡前故事</h2>
              <p>《星际漫游》，量仔与奶蛙并肩迎战 Shor 大魔王的十一页插画故事，配逐页旁白。故事里大家还叫他奶龙；他每晚都要再听一遍，通常撑不到第九页。</p>
              <div className="mk-actions"><Link className="milk-button" data-tone="butter" href="/storybook">翻开星际漫游</Link><Link className="milk-link" href="/archive">量仔小传</Link></div>
            </div>
            <figure className="mk-night-book" data-reveal>
              <img className="mk-night-cover" src="/assets/book-v2/00-cover.webp" width="1600" height="900" alt="量仔和奶龙背靠背守护量子星的绘本封面" loading="lazy" decoding="async" />
              <img className="mk-night-listener" src="/assets/naiwa/book.webp" width="760" height="1140" alt="抱着一本蓝色绘本、已经犯困的奶蛙" loading="lazy" decoding="async" />
            </figure>
          </div>
        </section>
      </main>
    </MotionSurface>
  );
}
