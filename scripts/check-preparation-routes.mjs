import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.NIHONPATH_TEST_ORIGIN??'http://localhost:3000';
const content=JSON.parse(fs.readFileSync('src/data/preparation-content.json','utf8'));
const routes=['/en/jft-basic','/ja/jft-basic','/en/ssw','/ja/ssw','/en/interview-preparation','/ja/interview-preparation','/en/workplace-japanese',...content.sectors.flatMap(s=>[`/en/ssw/${s.slug}`,`/en/ssw/${s.slug}/flashcards`,`/en/ssw/${s.slug}/practice`]),...content.banks.filter(b=>['quick','section'].includes(b.mode)).map(b=>`/en/jft-basic/practice/${b.id}`)];
let checked=0;
for(let i=0;i<routes.length;i+=3){await Promise.all(routes.slice(i,i+3).map(async path=>{const response=await fetch(origin+path);const html=await response.text();assert.equal(response.status,200,path);if(path.includes('/practice')){assert.ok(!html.includes('correctIndex'),`Key leak: ${path}`);assert.ok(!html.includes('に marks a specific time'),`Explanation leak: ${path}`);}checked++;}));}
for(const locale of ['en','ja']){const response=await fetch(`${origin}/${locale}/admin/preparation`);const html=await response.text();assert.ok(response.url.includes(`/${locale}/login`)||html.includes(`NEXT_REDIRECT;replace;/${locale}/login?notice=session;307;`));checked++;}
const bad=await fetch(origin+'/en/ssw/not-a-real-industry');const missingHtml=await bad.text();assert.ok(bad.status===404||(missingHtml.includes('NEXT_HTTP_ERROR_FALLBACK;404')&&missingHtml.includes('noindex')),'Unknown industry must produce a not-found response, including streamed Next.js responses');checked++;
console.log(`${checked} preparation routes, guest authorization, and unavailable-industry checks passed.`);
