import { readFile, writeFile } from "node:fs/promises";
import { navGroups, localizedHref } from "../app/site/navigation.ts";
import { destinations } from "../app/experience/destinations.ts";
function theme() { return '<label class="theme-picker"><span class="theme-picker-swatch" aria-hidden="true"></span><span class="theme-picker-label">主题</span><select aria-label="页面主题" data-theme-select="static"><option value="paper">纸白</option><option value="midnight">午夜</option></select></label>'; }
function groups(en=false) {return navGroups.map(group => `<details name="primary-navigation" class="nav-group"><summary>${en?group.en:group.name}</summary><div class="nav-group-menu">${group.links.map(link=>`<a href="${localizedHref(link.href,en)}">${en?link.en:link.name}</a>`).join("")}</div></details>`).join("");}
function footer(en=false) {return `<footer class="studio-footer"><div class="studio-footer-top"><p>Yibiao · ${en?"Cryptography Engineering":"密码工程与实验"}</p><a href="https://github.com/yibiaowangsd" target="_blank" rel="noreferrer">GitHub</a></div><nav class="footer-groups" aria-label="页脚导航">${navGroups.map(group=>`<div><span>${en?group.en:group.name}</span>${group.links.map(link=>`<a href="${localizedHref(link.href,en)}">${en?link.en:link.name}</a>`).join("")}</div>`).join("")}</nav><div class="studio-footer-bottom"><span>© 2026 Yibiao</span><span>${en?"Mascot: Liangzai":"吉祥物：量仔"}</span><a href="#main-content">${en?"Back to top":"回到顶部"}</a></div></footer>`;}
for (const page of ["index.html","audit.html"]) {
  const path="public/pqc-practice/"+page;
  let html=await readFile(path,"utf8");
  const header=`<header class="topbar site-chrome"><a class="brand" href="/" aria-label="Yibiao 首页"><span class="brand-mark" aria-hidden="true"><img src="/assets/liangzai-mark.svg" width="36" height="36" alt=""></span><strong>Yibiao<span>密码工程与实验</span></strong></a><nav class="site-nav desktop-nav" aria-label="主导航">${groups()}</nav><div class="chrome-actions">${theme()}<a class="language-link" href="/en/lab" lang="en">EN</a><button class="jump-trigger" type="button" aria-label="搜索全站" aria-haspopup="dialog">搜索</button><button class="menu-toggle" type="button" aria-label="打开设置与目录" aria-controls="practice-mobile-menu" aria-expanded="false"><span>设置</span><i aria-hidden="true">＋</i></button></div></header>`;
  html=html.replace(/<header class="topbar site-chrome">[\s\S]*?<\/header>/,header).replace(/<footer class="(?:practice-footer|studio-footer)">[\s\S]*?<\/footer>(?=<\/div><\/body>)/,footer());
  if(!html.includes('/theme/site-shell.css'))html=html.replace('</head>','<link rel="stylesheet" href="/theme/site-shell.css?v=20261008-yibiao"></head>');
  const directory = `<template id="practice-directory"><nav aria-label="全站导航">${destinations.map(item => `<a href="${item.href}">${item.name}</a>`).join("")}</nav></template>`;
  html = html.replace(/<template id="practice-directory">[\s\S]*?<\/template>/, "").replace("</body>", directory + "</body>");
  await writeFile(path,html);
}
