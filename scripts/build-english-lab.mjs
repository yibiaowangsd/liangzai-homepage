import { readFile, writeFile } from "node:fs/promises";
const dictionary=JSON.parse(await readFile("app/site/lab-en.json","utf8"));
const terms=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
function translate(text){for(const [zh,en] of terms)text=text.split(zh).join(en);return text;}
const files=["app.js","dialogue.js","candidate-workbench.js","navigation.js","usability.js"];
for(const file of files){let source=translate(await readFile("public/pqc-practice/"+file,"utf8"));for(const name of files)source=source.replaceAll("./"+name,"./"+name.replace(".js","-en.js"));await writeFile("public/pqc-practice/"+file.replace(".js","-en.js"),source);}
let html=translate(await readFile("public/pqc-practice/index.html","utf8"));
html=html.replace('<html lang="zh-CN">','<html lang="en">').replace('src="./app.js','src="./app-en.js').replace('src="./navigation.js','src="./navigation-en.js').replaceAll('https://wangyibiao.com/pqc-practice/index.html','https://wangyibiao.com/pqc-practice/index-en.html');
html=html.replace('hreflang="zh-CN" href="https://wangyibiao.com/pqc-practice/index-en.html"','hreflang="zh-CN" href="https://wangyibiao.com/pqc-practice/index.html"');
html=html.replaceAll('href="/about"','href="/en/about"').replaceAll('href="/pqc-arsenal"','href="/en/pqc"').replaceAll('href="/pqc/','href="/en/pqc/').replaceAll('href="/pqc-practice"','href="/en/lab"').replace('href="/en/lab" lang="en">EN','href="/pqc-practice/index.html" lang="zh-CN">中文').replace('<h1>密码<em>实验室</em></h1>','<h1>Cryptography <em>Lab</em></h1>');
html=html.replace('<div class="lab-heading">','<p class="lab-language-note">English interface. Submission names, team members and original security reports retain their source language.</p><div class="lab-heading">');
await writeFile("public/pqc-practice/index-en.html",html);
