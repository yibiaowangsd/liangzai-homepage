import { readdir, readFile, writeFile } from 'node:fs/promises';
const editions=(await readdir('news/inbox')).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
const edition=JSON.parse(await readFile('news/inbox/'+editions.at(-1),'utf8'));
const data=['pqc','protocol','standards'].flatMap(category=>edition.items.find(item=>item.category===category) || []).map((item,index)=>({...item,id:index+1,tags:JSON.stringify(item.tags || [])}));
await writeFile('app/site/home-signals.json',JSON.stringify({edition_date:edition.date,data},null,2)+'\n');
const archive=[];
for(const file of editions){const edition=JSON.parse(await readFile('news/inbox/'+file,'utf8'));for(const item of edition.items)archive.push(item.slug);}
await writeFile('app/site/news-index.json',JSON.stringify([...new Set(archive)],null,2)+'\n');
// Shared news search and source dates use the reviewed inbox, never infer a source date from publication time.
const search=[], sourceDates={}, dates=[];
for(const file of [...editions].reverse()){
  const edition=JSON.parse(await readFile('news/inbox/'+file,'utf8')); dates.push(edition.date);
  for(const item of edition.items){
    const match=item.content?.match(/(?:原始(?:来源|发布)日期[：:]|原始资料发布于|原文发布日期[：:])\s*(\d{4})\s*[年-]\s*(\d{1,2})\s*[月-]\s*(\d{1,2})/);
    if(match)sourceDates[item.slug]=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
    search.push({href:'/news/'+item.slug,name:item.title,description:item.source_name+' · '+(sourceDates[item.slug]||'来源日期未标注'),keywords:[item.summary,...(item.tags||[])].join(' '),group:'news'});
  }
}
await writeFile('app/site/news-archive.json',JSON.stringify({dates,sourceDates},null,2)+'\n');
await writeFile('public/news-search.json',JSON.stringify(search)+'\n');
await writeFile('app/site/news-search.json',JSON.stringify(search)+'\n');
