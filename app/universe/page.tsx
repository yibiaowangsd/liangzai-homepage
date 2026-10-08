import Link from "next/link";
import { pageMetadata } from "../site/metadata";
export const metadata = pageMetadata("量仔宇宙", "Yibiao 的吉祥物量仔：模型鉴赏、星际漫游与量仔小传。", "/universe", "universe");
export default function Universe() { return <main id="main-content" className="content-page"><p>关于 · 量仔宇宙</p><h1>量仔宇宙</h1><p>量仔是 Yibiao 网站的吉祥物。工程之外，留一点想象。</p><div className="portal-projects">{[["/models","模型鉴赏","旋转查看量仔与奶龙的角色模型。"],["/storybook","星际漫游","十一页插画冒险，附旁白与文字稿。"],["/archive","量仔小传","量仔的角色故事与档案。"]].map(([href,title,desc])=><article className="portal-project-card" key={href}><h2><Link href={href}>{title}</Link></h2><p>{desc}</p></article>)}</div></main>; }
