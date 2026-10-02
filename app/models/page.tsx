import type { Metadata } from "next";
import Link from "next/link";
import ModelGallery from "./ModelGallery";
import "./models.css";
export const metadata: Metadata = { title: "模型鉴赏 · 量仔与奶龙", description: "量仔与奶龙的独立三维展厅：选择角色、旋转、缩放和切换视角。" };
export default function ModelsPage() {
    return <main id="main-content" className="model-gallery-page"><header className="model-page-heading"><div><p>THE CHARACTERS / 角色展厅</p><h1>量仔，与奶龙。</h1></div><p>两位伙伴，一次近距离的相遇。<br />拖动旋转，滚轮或双指缩放。</p></header><ModelGallery /><footer className="model-page-footer"><p>模型鉴赏之外，还有他们的故事。</p><Link href="/archive">阅读量仔小传</Link><Link href="/storybook">打开星际漫游</Link></footer></main>;
}
