/** Local editorial art chosen from the article's title/tags; never a random remote image. */
export type CoverStory = {
    cover_image: string | null;
    category: string;
    title?: string;
    tags?: string | null;
};
const chip = "/news-covers/compute-v2.webp", network = "/news-covers/connection-v2.webp";
const kem = "/assets/pqc/ml-kem-studio-v2.webp", signature = "/assets/pqc/ml-dsa-studio-v2.webp", hash = "/assets/pqc/slh-dsa-studio-v2.webp";
const rules: {
    match: RegExp;
    image: string;
    keyword: string;
}[] = [
    { match: /\bFPGA\b|芯片|半导体|\bGPU\b|\bASIC\b/i, image: chip, keyword: "CHIP / 芯片计算" },
    { match: /\bTLS\b|TLS1\.3|EAP-TLS|\bIKEv2\b|\bIPsec\b|\bSSH\b|握手/i, image: network, keyword: "PROTOCOL / 安全连接" },
    { match: /ML[ -]KEM|Kyber|密钥封装|晶格|LWE/i, image: kem, keyword: "ML-KEM / 晶格密码" },
    { match: /Falcon|FN[ -]DSA/i, image: "/assets/pqc/fn-dsa-studio-v2.webp", keyword: "FALCON / 数字签名" },
    { match: /SLH[ -]DSA|SPHINCS|Merkle|哈希|\bSM3\b|\bSHA[ -]?\d|\bHASH\b/i, image: hash, keyword: "HASH / 哈希结构" },
    { match: /ML[ -]DSA|Dilithium|签名|门限/i, image: signature, keyword: "SIGNATURE / 数字签名" },
    { match: /\bAI\b|人工智能|模型|智能体|\bLLM\b|GPT|Claude|Agent/i, image: chip, keyword: "AI / 人工智能" },
    { match: /漏洞|攻击|恶意|勒索|钓鱼|\bCVE[ -]|安全/i, image: network, keyword: "SECURITY / 网络安全" },
    { match: /标准|\bNIST\b|\bIETF\b|\bRFC\b|\bFIPS\b|指南/i, image: signature, keyword: "STANDARDS / 标准进展" },
    { match: /Workers|Cloudflare|云计算|WebCrypto|浏览器/i, image: network, keyword: "WEB / 运行时与网络" },
];
const defaults: Record<string, {
    image: string;
    keyword: string;
}> = {
    pqc: { image: kem, keyword: "PQC / 后量子密码" }, protocol: { image: network, keyword: "PROTOCOL / 安全连接" },
    standards: { image: signature, keyword: "STANDARDS / 标准进展" }, security: { image: network, keyword: "SECURITY / 网络安全" },
    ai: { image: chip, keyword: "AI / 人工智能" }, industry: { image: chip, keyword: "TECH / 产业进展" },
};
export function keywordCover(item: CoverStory) {
    const text = `${item.title || ""} ${item.tags || ""}`;
    return rules.find(rule => rule.match.test(text)) || defaults[item.category] || defaults.pqc;
}
export function sourceCover(item: CoverStory): string | null {
    const src = item.cover_image?.trim();
    if (!src || /^(?:https:\/\/wangyibiao\.com)?\/news-covers\/(?:pqc|protocol|standards|security|ai)\.svg(?:\?.*)?$/.test(src))
        return null;
    // Only local root-relative or HTTPS images, never protocol-relative/script/data URLs.
    return /^(?:https:\/\/|\/(?!\/))/.test(src) ? src : null;
}
export function coverFor(item: CoverStory): string { return sourceCover(item) || keywordCover(item).image; }
