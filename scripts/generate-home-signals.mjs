import { readdir, readFile, writeFile } from 'node:fs/promises';
const editions=(await readdir('news/inbox')).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
const edition=JSON.parse(await readFile('news/inbox/'+editions.at(-1),'utf8'));
const data=['pqc','protocol','standards'].flatMap(category=>edition.items.find(item=>item.category===category) || []).map((item,index)=>({...item,id:index+1,tags:JSON.stringify(item.tags || [])}));
await writeFile('app/site/home-signals.json',JSON.stringify({edition_date:edition.date,data},null,2)+'\n');
const archive=[];
for(const file of editions){const edition=JSON.parse(await readFile('news/inbox/'+file,'utf8'));for(const item of edition.items)archive.push(item.slug);}
await writeFile('app/site/news-index.json',JSON.stringify([...new Set(archive)],null,2)+'\n');
