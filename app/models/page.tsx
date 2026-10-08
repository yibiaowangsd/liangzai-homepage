import { pageMetadata } from "../site/metadata";
import Link from "next/link";
import ModelGallery from "./ModelGallery";
import "./models.css";
export const metadata = pageMetadata("模型鉴赏", "量仔与奶龙的独立三维展厅。", "/models", "models");
export default function ModelsPage() {
    return <main id="main-content" className="model-gallery-page"><header className="model-page-heading"><div><p>THE CHARACTERS / 角色展厅</p><h1>模型鉴赏</h1></div><p>量仔与奶龙，一次近距离的相遇。<br />选择伙伴与视角，探索每一处细节。</p></header><ModelGallery /><footer className="model-page-footer"><p>模型鉴赏之外，还有他们的故事。</p><Link href="/archive">阅读量仔小传</Link><Link href="/storybook">打开星际漫游</Link></footer></main>;
}
