import { notFound } from "next/navigation";
import AlgorithmArticle from "../../../pqc-arsenal/AlgorithmArticle";
import { weapons } from "../../../pqc-arsenal/algorithm-data";
import { pageMetadata } from "../../../site/metadata";
export async function generateMetadata({params}:{params:Promise<{algorithm:string}>}) {const {algorithm}=await params;return pageMetadata(algorithm.toUpperCase()+" · Algorithm Guide","Principles, parameter sizes and implementation considerations.","/en/pqc/"+algorithm,algorithm,true);}
export default async function Page({params}:{params:Promise<{algorithm:string}>}) {const {algorithm}=await params;if(!weapons.some(item=>item.id===algorithm))notFound();return <AlgorithmArticle algorithm={algorithm} en/>;}
