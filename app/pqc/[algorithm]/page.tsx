import { notFound } from "next/navigation";
import AlgorithmArticle from "../../pqc-arsenal/AlgorithmArticle";
import { weapons } from "../../pqc-arsenal/algorithm-data";
import { pageMetadata } from "../../site/metadata";
export async function generateMetadata({params}:{params:Promise<{algorithm:string}>}) { const {algorithm}=await params;const item=weapons.find(item=>item.id===algorithm);return item?pageMetadata(item.name+" · 密码图鉴",item.principle,"/pqc/"+algorithm,algorithm):{title:"算法未找到 · Yibiao"}; }
export default async function Page({params}:{params:Promise<{algorithm:string}>}) {const {algorithm}=await params;if(!weapons.some(item=>item.id===algorithm))notFound();return <AlgorithmArticle algorithm={algorithm}/>;}
