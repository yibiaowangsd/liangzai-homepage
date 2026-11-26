import type { Metadata } from "next";
import QuantumHome from "./QuantumHome";
import { locales } from "./i18n/locales";
import { getSiteLanguage } from "./i18n/site-language";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getSiteLanguage();
  const { title, description, siteName, imageAlt } = messages.home.metadata;
  const image = { url: "https://wangyibiao.com/assets/cinematic/vault-entrance-v2.webp", width: 1672, height: 941, alt: imageAlt };
  return {
    title,
    description,
    alternates: { canonical: "https://wangyibiao.com/" },
    openGraph: { title, description, url: "https://wangyibiao.com/", siteName, locale: locales[locale].openGraph, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function Home() {
  return <QuantumHome />;
}
